"use client";

import * as React from "react";
import { Sparkles, Mail, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IntegrationRecord {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isConnected: boolean;
  hasSecret: boolean;
}

export default function IntegrationsPage() {
  const [ollamaUrl, setOllamaUrl] = React.useState("");
  const [ollamaModel, setOllamaModel] = React.useState("");
  const [ollamaTemperature, setOllamaTemperature] = React.useState("0.7");
  const [ollamaMaxTokens, setOllamaMaxTokens] = React.useState("1024");
  const [ollamaTimeoutMs, setOllamaTimeoutMs] = React.useState("90000");
  const [isTestingOllama, setIsTestingOllama] = React.useState(false);
  const [ollamaStatus, setOllamaStatus] = React.useState<{
    tested: boolean;
    success: boolean;
    message?: string;
    models?: string[];
  }>({ tested: false, success: false });

  const [smtpHost, setSmtpHost] = React.useState("");
  const [smtpPort, setSmtpPort] = React.useState("");
  const [smtpUser, setSmtpUser] = React.useState("");
  const [smtpPass, setSmtpPass] = React.useState("");
  const [smtpHasSavedPassword, setSmtpHasSavedPassword] = React.useState(false);
  const [smtpFrom, setSmtpFrom] = React.useState("");
  const [smtpSecurity, setSmtpSecurity] = React.useState("");
  const [smtpIntegrationId, setSmtpIntegrationId] = React.useState("");
  const [ollamaIntegrationName, setOllamaIntegrationName] = React.useState("Local Ollama Service");
  const [smtpIntegrationName, setSmtpIntegrationName] = React.useState("Primary SMTP");
  const [isTestingSmtp, setIsTestingSmtp] = React.useState(false);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = React.useState(true);
  const [integrationLoadError, setIntegrationLoadError] = React.useState("");
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [hasOllamaIntegration, setHasOllamaIntegration] = React.useState(false);
  const [smtpStatus, setSmtpStatus] = React.useState<{
    tested: boolean;
    success: boolean;
    message?: string;
  }>({ tested: false, success: false });

  React.useEffect(() => {
    let active = true;

    async function loadIntegrations() {
      try {
        const response = await fetch("/api/integrations", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load integrations");

        const integrations = result.data?.integrations as IntegrationRecord[] | undefined;
        if (!integrations) throw new Error("The integrations response was incomplete. Retry loading.");
        if (!active) return;

        const ollama = integrations
          .filter((integration) => integration.type === "OLLAMA")
          .sort((left, right) => Number(right.isConnected) - Number(left.isConnected))[0];
        setHasOllamaIntegration(Boolean(ollama));
        if (ollama) {
          setOllamaIntegrationName(ollama.name);
          setOllamaUrl(String(ollama.config.baseUrl ?? ""));
          setOllamaModel(String(ollama.config.model ?? ""));
          setOllamaTemperature(String(ollama.config.temperature ?? "0.7"));
          setOllamaMaxTokens(String(ollama.config.maxTokens ?? "1024"));
          setOllamaTimeoutMs(String(ollama.config.timeoutMs ?? "90000"));
          setOllamaStatus({
            tested: ollama.isConnected,
            success: ollama.isConnected,
            message: ollama.isConnected ? "Connected AI integration loaded." : undefined,
          });
        }

        const smtp = integrations.find((integration) => integration.type === "SMTP");
        if (smtp) {
          setSmtpIntegrationId(smtp.id);
          setSmtpIntegrationName(smtp.name);
          setSmtpHost(String(smtp.config.host ?? ""));
          setSmtpPort(String(smtp.config.port ?? ""));
          setSmtpUser(String(smtp.config.user ?? ""));
          setSmtpFrom(String(smtp.config.from ?? ""));
          setSmtpSecurity(smtp.config.secure === true ? "tls" : smtp.config.secure === false ? "starttls" : "");
          setSmtpHasSavedPassword(smtp.hasSecret);
          setSmtpStatus({
            tested: smtp.isConnected,
            success: smtp.isConnected,
            message: smtp.isConnected ? "Connected SMTP integration loaded." : undefined,
          });
        }
      } catch (error) {
        if (active) {
          setIntegrationLoadError(error instanceof Error ? error.message : "Could not load integrations");
        }
      } finally {
        if (active) {
          setIsLoadingIntegrations(false);
        }
      }
    }

    void loadIntegrations();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    try {
      // First save or update integration
      const saveRes = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OLLAMA",
          name: ollamaIntegrationName,
          config: {
            baseUrl: ollamaUrl,
            model: ollamaModel,
            temperature: Number(ollamaTemperature),
            maxTokens: Number(ollamaMaxTokens),
            timeoutMs: Number(ollamaTimeoutMs),
          },
        }),
      });

      const saveJson = await saveRes.json();
      const intId = saveJson.data?.integration?.id;

      if (!intId) throw new Error("Could not register integration");

      // Test connection
      const testRes = await fetch(`/api/integrations/${intId}/test`, { method: "POST" });
      const testJson = await testRes.json();

      setOllamaStatus({
        tested: true,
        success: testJson.data?.isConnected || false,
        message: testJson.data?.message || testJson.error,
        models: testJson.data?.models || [],
      });
    } catch (err: unknown) {
      setOllamaStatus({
        tested: true,
        success: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    try {
      if (!smtpHost.trim() || !smtpPort || !smtpUser.trim() || (!smtpPass && !smtpHasSavedPassword) || !smtpFrom.trim() || !smtpSecurity) {
        throw new Error("Complete the SMTP host, port, username, password, sender, and security settings.");
      }

      const saveRes = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SMTP",
          name: smtpIntegrationName,
          config: {
            host: smtpHost,
            port: Number(smtpPort),
            user: smtpUser,
            pass: smtpPass,
            from: smtpFrom,
            secure: smtpSecurity === "tls",
          },
        }),
      });

      const saveJson = await saveRes.json();
      const intId = saveJson.data?.integration?.id || smtpIntegrationId;
      if (!intId) throw new Error("Could not register SMTP integration");
      setSmtpIntegrationId(intId);

      const testRes = await fetch(`/api/integrations/${intId}/test`, { method: "POST" });
      const testJson = await testRes.json();

      setSmtpStatus({
        tested: true,
        success: testJson.data?.isConnected || false,
        message: testJson.data?.message || testJson.error,
      });
      if (testJson.data?.isConnected) {
        setSmtpHasSavedPassword(true);
        setSmtpPass("");
      }
    } catch (err: unknown) {
      setSmtpStatus({
        tested: true,
        success: false,
        message: err instanceof Error ? err.message : "SMTP test failed",
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Integrations</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Connect your local AI engine, email notifications, webhooks and external APIs.
        </p>
      </div>

      {(isLoadingIntegrations || integrationLoadError) && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[#252C3A] bg-[#141925] px-3 py-2 text-xs text-[#929BAE]" role="status">
          <span>
            {isLoadingIntegrations ? "Loading saved workspace integrations…" : integrationLoadError}
          </span>
          {integrationLoadError && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsLoadingIntegrations(true);
                setIntegrationLoadError("");
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ollama Local AI Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Ollama Local AI</CardTitle>
                  <CardDescription className="text-xs">Primary free local LLM provider</CardDescription>
                </div>
              </div>
              <Badge variant={isLoadingIntegrations ? "secondary" : ollamaStatus.success ? "success" : "secondary"}>
                {isLoadingIntegrations ? "LOADING" : ollamaStatus.success ? "CONNECTED" : "NOT CONNECTED"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {!isLoadingIntegrations && !integrationLoadError && !hasOllamaIntegration && (
              <p className="rounded-md border border-[#252C3A] bg-[#0E111B] px-3 py-2 text-xs text-[#929BAE]">
                No Ollama integration is saved for this workspace. Open AI Configuration to check an OpenAI-compatible integration.
              </p>
            )}
            {hasOllamaIntegration && (
              <Input
                label="Integration Name"
                value={ollamaIntegrationName}
                readOnly
                disabled={isLoadingIntegrations}
              />
            )}
            <Input
              label="Ollama Base URL"
              value={ollamaUrl}
              disabled={isLoadingIntegrations}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="Provider endpoint URL"
            />
            <Input
              label="Model"
              value={ollamaModel}
              disabled={isLoadingIntegrations}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="Model identifier"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Temperature"
                type="number"
                step="0.1"
                value={ollamaTemperature}
                disabled={isLoadingIntegrations}
                onChange={(e) => setOllamaTemperature(e.target.value)}
              />
              <Input
                label="Max Tokens"
                type="number"
                value={ollamaMaxTokens}
                disabled={isLoadingIntegrations}
                onChange={(e) => setOllamaMaxTokens(e.target.value)}
              />
              <Input
                label="Timeout (ms)"
                type="number"
                value={ollamaTimeoutMs}
                disabled={isLoadingIntegrations}
                onChange={(e) => setOllamaTimeoutMs(e.target.value)}
              />
            </div>

            {ollamaStatus.tested && (
              <div
                className={`rounded-lg p-3 text-xs border ${
                  ollamaStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {ollamaStatus.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span>{ollamaStatus.message}</span>
                </div>
                {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                  <div className="mt-2 text-[11px] text-[#929BAE]">
                    Available models: {ollamaStatus.models.join(", ")}
                  </div>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-[#252C3A] pt-4 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestOllama}
              isLoading={isTestingOllama}
              disabled={isLoadingIntegrations || Boolean(integrationLoadError)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Test Connection
            </Button>
          </CardFooter>
        </Card>

        {/* SMTP Email Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">SMTP Email Server</CardTitle>
                  <CardDescription className="text-xs">Send outbound emails from Action nodes</CardDescription>
                </div>
              </div>
              <Badge variant={isLoadingIntegrations ? "secondary" : smtpStatus.success ? "success" : "secondary"}>
                {isLoadingIntegrations ? "LOADING" : smtpStatus.success ? "CONFIGURED" : "NOT CONFIGURED"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {smtpIntegrationId && (
              <Input
                label="Integration Name"
                value={smtpIntegrationName}
                readOnly
                disabled={isLoadingIntegrations}
              />
            )}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input
                  label="SMTP Host"
                  value={smtpHost}
                  disabled={isLoadingIntegrations}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="SMTP host"
                />
              </div>
              <Input
                label="Port"
                value={smtpPort}
                disabled={isLoadingIntegrations}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="SMTP port"
              />
            </div>
            <Input
              label="Username"
              value={smtpUser}
              name="smtp-integration-user"
              autoComplete="off"
              disabled={isLoadingIntegrations}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="SMTP username"
            />
            <Input
              label="Password"
              type="password"
              value={smtpPass}
              name="smtp-integration-password"
              autoComplete="new-password"
              disabled={isLoadingIntegrations}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={smtpHasSavedPassword ? "Saved securely; leave blank to keep it" : "SMTP password or app password"}
            />
            <Input
              label="Sender Email"
              type="email"
              value={smtpFrom}
              disabled={isLoadingIntegrations}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="Sender email address"
            />
            <div className="space-y-1.5">
              <label htmlFor="smtp-security" className="text-xs font-medium text-[#929BAE]">Connection Security</label>
              <select
                id="smtp-security"
                value={smtpSecurity}
                disabled={isLoadingIntegrations}
                onChange={(e) => setSmtpSecurity(e.target.value)}
                className="w-full rounded-md border border-[#252C3A] bg-[#141925] px-3 py-2 text-sm text-[#F5F7FA]"
                required
              >
                <option value="">Select security mode</option>
                <option value="starttls">STARTTLS</option>
                <option value="tls">TLS from connection start</option>
              </select>
            </div>

            {smtpStatus.tested && (
              <div
                className={`rounded-lg p-3 text-xs border ${
                  smtpStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {smtpStatus.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span>{smtpStatus.message}</span>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-[#252C3A] pt-4 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestSmtp}
              isLoading={isTestingSmtp}
              disabled={isLoadingIntegrations || Boolean(integrationLoadError)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Verify SMTP
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Ollama Setup Guide */}
      <Card className="bg-[#141925]/40 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Ollama Provider Setup
          </CardTitle>
          <CardDescription className="text-xs">
            Configure the endpoint and model provided by your Ollama deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[#929BAE]">
          <p>1. Download Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">ollama.com</a>.</p>
          <p>2. Enter the endpoint URL and model identifier in the AI integration settings.</p>
        </CardContent>
      </Card>
    </div>
  );
}

