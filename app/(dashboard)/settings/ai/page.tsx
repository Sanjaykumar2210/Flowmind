"use client";

import * as React from "react";
import { CheckCircle2, XCircle, RefreshCw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AIIntegrationRecord {
  id: string;
  type: "OLLAMA" | "OPENAI_COMPATIBLE";
  name: string;
  config: Record<string, unknown>;
  isConnected: boolean;
  hasSecret: boolean;
}

export default function AiSettingsPage() {
  const [provider, setProvider] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [model, setModel] = React.useState("");
  const [temperature, setTemperature] = React.useState("0.7");
  const [maxTokens, setMaxTokens] = React.useState("1024");
  const [timeoutMs, setTimeoutMs] = React.useState("30000");
  const [apiKey, setApiKey] = React.useState("");
  const [apiKeySaved, setApiKeySaved] = React.useState(false);
  const [integrationName, setIntegrationName] = React.useState("");
  const [isLoadingConfig, setIsLoadingConfig] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [hasSavedIntegration, setHasSavedIntegration] = React.useState(false);

  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    tested: boolean;
    success: boolean;
    message?: string;
    models?: string[];
  }>({ tested: false, success: false });

  React.useEffect(() => {
    let active = true;

    async function loadAIIntegration() {
      try {
        const response = await fetch("/api/integrations", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load AI integration");

        const integrations = result.data?.integrations as AIIntegrationRecord[] | undefined;
        if (!integrations) throw new Error("The integrations response was incomplete. Retry loading.");

        const integration = integrations
          .filter((item) => item.type === "OLLAMA" || item.type === "OPENAI_COMPATIBLE")
          .sort((left, right) => Number(right.isConnected) - Number(left.isConnected))[0];
        if (active) setHasSavedIntegration(Boolean(integration));
        if (!active || !integration) return;

        setProvider(integration.type === "OLLAMA" ? "ollama" : "openai");
        setIntegrationName(integration.name);
        setBaseUrl(String(integration.config.baseUrl ?? ""));
        setModel(String(integration.config.model ?? ""));
        setTemperature(String(integration.config.temperature ?? "0.7"));
        setMaxTokens(String(integration.config.maxTokens ?? "1024"));
        setTimeoutMs(String(integration.config.timeoutMs ?? "30000"));
        setApiKeySaved(integration.hasSecret);
        setTestResult({
          tested: integration.isConnected,
          success: integration.isConnected,
          message: integration.isConnected ? "Saved AI integration loaded." : undefined,
        });
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load AI integration");
      } finally {
        if (active) setIsLoadingConfig(false);
      }
    }

    void loadAIIntegration();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      if (
        !provider ||
        !baseUrl.trim() ||
        !model.trim() ||
        !Number.isFinite(Number(temperature)) ||
        !Number.isFinite(Number(maxTokens)) ||
        !Number.isFinite(Number(timeoutMs))
      ) {
        throw new Error("Choose a provider and complete its endpoint, model, and generation settings.");
      }

      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: provider === "ollama" ? "OLLAMA" : "OPENAI_COMPATIBLE",
          name: integrationName || (provider === "ollama" ? "Local Ollama" : "OpenAI Compatible"),
          config: { baseUrl, model, temperature: parseFloat(temperature), maxTokens: parseInt(maxTokens, 10), timeoutMs: parseInt(timeoutMs, 10), apiKey },
        }),
      });

      const json = await res.json();
      const intId = json.data?.integration?.id;
      if (!intId) throw new Error("Failed to save configuration");
      setIntegrationName(json.data.integration.name);

      const testRes = await fetch(`/api/integrations/${intId}/test`, { method: "POST" });
      const testJson = await testRes.json();

      setTestResult({
        tested: true,
        success: testJson.data?.isConnected || false,
        message: testJson.data?.message || testJson.error,
        models: testJson.data?.models || [],
      });
      if (testJson.data?.isConnected) {
        setApiKeySaved((saved) => saved || Boolean(apiKey));
        setApiKey("");
      }
    } catch (err: unknown) {
      setTestResult({
        tested: true,
        success: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">AI Engine Configuration</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Configure model parameters, endpoint locations, and local inference providers.
        </p>
      </div>

      {(isLoadingConfig || loadError) && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[#252C3A] bg-[#141925] px-3 py-2 text-xs text-[#929BAE]" role="status">
          <span>{isLoadingConfig ? "Loading saved AI integration…" : loadError}</span>
          {loadError && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsLoadingConfig(true);
                setLoadError("");
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      )}

      {!isLoadingConfig && !loadError && !hasSavedIntegration && (
        <p className="rounded-md border border-[#252C3A] bg-[#141925] px-3 py-2 text-xs text-[#929BAE]">
          No AI integration was returned for this workspace. Enter the settings below and select Save &amp; Test Provider.
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" />
              <div>
                <CardTitle className="text-base">AI Provider</CardTitle>
                <CardDescription className="text-xs">
                  Choose an Ollama or OpenAI-compatible provider endpoint
                </CardDescription>
              </div>
            </div>
            <Badge variant={testResult.success ? "success" : "secondary"}>
              {isLoadingConfig ? "LOADING" : testResult.success ? "ONLINE" : "NOT CONNECTED"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {hasSavedIntegration && (
            <Input
              label="Integration Name"
              value={integrationName}
              readOnly
              disabled={isLoadingConfig}
            />
          )}
          <Select
            label="Provider Mode"
            value={provider}
            disabled={isLoadingConfig}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="">Select provider</option>
            <option value="ollama">Ollama</option>
            <option value="openai">OpenAI Compatible (LM Studio, vLLM, Groq, OpenRouter)</option>
          </Select>

          <Input
            label="Endpoint Base URL"
            value={baseUrl}
              disabled={isLoadingConfig}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Provider endpoint URL"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Model"
              value={model}
              disabled={isLoadingConfig}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model identifier"
            />
            <Input
              label="Temperature (0.0 to 1.0)"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={temperature}
              disabled={isLoadingConfig}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Output Tokens"
              type="number"
              value={maxTokens}
              disabled={isLoadingConfig}
              onChange={(e) => setMaxTokens(e.target.value)}
            />
            <Input
              label="Timeout (milliseconds)"
              type="number"
              value={timeoutMs}
              disabled={isLoadingConfig}
              onChange={(e) => setTimeoutMs(e.target.value)}
            />
          </div>

          {provider === "openai" && (
            <Input
              label="API Key"
              type="password"
              value={apiKey}
              autoComplete="new-password"
              disabled={isLoadingConfig}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeySaved ? "Saved securely; leave blank to keep it" : "Provider API key"}
            />
          )}

          {testResult.tested && (
            <div
              className={`rounded-lg p-3 text-xs border ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.models && testResult.models.length > 0 && (
                <div className="mt-2 text-[11px] text-[#929BAE]">
                  Available models: {testResult.models.join(", ")}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-[#252C3A] pt-4 justify-end">
          <Button
            size="sm"
            onClick={handleTest}
            isLoading={isTesting}
            disabled={isLoadingConfig || Boolean(loadError)}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Save & Test Provider
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

