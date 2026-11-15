import { AIConfig } from "./types";

export class AIProviderError extends Error {
  code: "PROVIDER_UNAVAILABLE" | "MODEL_NOT_FOUND" | "TIMEOUT" | "INVALID_RESPONSE" | "GENERATION_FAILED";
  details?: unknown;

  constructor(
    message: string,
    code: "PROVIDER_UNAVAILABLE" | "MODEL_NOT_FOUND" | "TIMEOUT" | "INVALID_RESPONSE" | "GENERATION_FAILED",
    details?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.details = details;
  }
}

export class AIClient {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * Health check to test provider availability and list installed models
   */
  async checkHealth(): Promise<{ available: boolean; models: string[]; version?: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const baseUrl = this.config.baseUrl.replace(/\/+$/, "");
      const isOllama = this.config.provider === "OLLAMA";
      const headers: Record<string, string> = {};
      if (!isOllama && this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;

      const response = await fetch(`${baseUrl}${isOllama ? "/api/tags" : "/models"}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { available: false, models: [], error: "Could not connect to the configured AI provider." };
      }

      const data = await response.json();
      const models = isOllama
        ? (Array.isArray(data.models) ? data.models : []).map((item: { name?: unknown }) => String(item.name ?? "")).filter(Boolean)
        : (Array.isArray(data.data) ? data.data : []).map((item: { id?: unknown }) => String(item.id ?? "")).filter(Boolean);
      return { available: true, models, version: isOllama ? "Ollama" : "OpenAI-compatible" };
    } catch (err: unknown) {
      return {
        available: false,
        models: [],
        error: err instanceof Error && err.name === "AbortError"
          ? `AI provider check timed out after ${this.config.timeoutMs}ms.`
          : "Could not connect to the configured AI provider.",
      };
    }
  }

  /**
   * Generates completion text or JSON
   */
  async generate(prompt: string, options?: { systemPrompt?: string; formatJson?: boolean }): Promise<string> {
    const model = this.config.model;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const baseUrl = this.config.baseUrl.replace(/\/+$/, "");

    try {
      if (this.config.provider === "OPENAI_COMPATIBLE") {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [
              ...(options?.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            ...(options?.formatJson ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new AIProviderError(`AI provider request failed with status ${response.status}.`, "GENERATION_FAILED");
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }

      const requestBody: Record<string, unknown> = {
        model,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      };

      if (options?.systemPrompt) {
        requestBody.system = options.systemPrompt;
      }

      if (options?.formatJson) {
        requestBody.format = "json";
      }

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).catch((fetchErr: unknown) => {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new AIProviderError(`AI request timed out after ${this.config.timeoutMs}ms`, "TIMEOUT");
        }
        throw new AIProviderError(
          "Configured AI provider is not reachable.",
          "PROVIDER_UNAVAILABLE",
        );
      });

      clearTimeout(timer);

      if (!response.ok) {
        const status = response.status;
        if (status === 404) {
          throw new AIProviderError(
            `Configured model '${model}' was not found by the AI provider.`,
            "MODEL_NOT_FOUND",
            { model }
          );
        }
        throw new AIProviderError(`AI provider request failed with status ${status}.`, "GENERATION_FAILED");
      }

      const result = await response.json();
      return result.response || "";
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof AIProviderError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new AIProviderError(`AI request timed out after ${this.config.timeoutMs}ms`, "TIMEOUT");
      }
      throw new AIProviderError(
        err instanceof Error ? err.message : "Unexpected AI generation failure",
        "GENERATION_FAILED",
        err
      );
    }
  }

  /**
   * Executes structured AI Classification
   */
  async classify(text: string, categories: string[]): Promise<{ category: string; confidence: number; reasoning: string }> {
    const systemPrompt = `You are an accurate data classification AI. Your job is to classify the user's input strictly into one of the following allowed categories:
${categories.map((c, i) => `${i + 1}. "${c}"`).join("\n")}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "category": "<one of the exact category strings listed above>",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<brief explanation of why this category was chosen>"
}`;

    const prompt = `Input to classify:\n"""\n${text}\n"""`;

    const raw = await this.generate(prompt, {
      systemPrompt,
      formatJson: true,
    });

    try {
      // Find JSON block if wrapped
      const cleanJson = extractJsonString(raw);
      const parsed = JSON.parse(cleanJson);
      return {
        category: parsed.category || categories[0] || "Unknown",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
        reasoning: parsed.reasoning || "Classified based on contextual semantics",
      };
    } catch {
      // Fallback matching if JSON parsing had extra chars
      const matched = categories.find((c) => raw.toLowerCase().includes(c.toLowerCase()));
      return {
        category: matched || categories[0] || "Unknown",
        confidence: 0.7,
        reasoning: "Matched from output text",
      };
    }
  }

  /**
   * Executes AI Summarization
   */
  async summarize(text: string, format: "bullet-points" | "paragraph" | "executive-summary" = "paragraph"): Promise<{ summary: string; bulletPoints?: string[] }> {
    const systemPrompt = `You are a concise, high-impact business summarizer.
Summarize the user text in the requested format: "${format}".
Provide only the clean formatted summary. If bullet-points format is requested, list key points starting with "- ".`;

    const prompt = `Text to summarize:\n"""\n${text}\n"""`;

    const summary = await this.generate(prompt, { systemPrompt });

    const lines = summary.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("•"));
    const bulletPoints = lines.map((l) => l.replace(/^[-•*]\s*/, "").trim());

    return {
      summary: summary.trim(),
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined,
    };
  }

  /**
   * Executes structured AI Extraction
   */
  async extract(text: string, schemaDescription: string): Promise<Record<string, unknown>> {
    const systemPrompt = `You are an advanced data extraction assistant.
Extract information from the provided input according to the following schema definition:
${schemaDescription}

Return ONLY valid JSON matching this schema. Do not add markdown backticks or commentary.`;

    const prompt = `Content to extract from:\n"""\n${text}\n"""`;

    const raw = await this.generate(prompt, {
      systemPrompt,
      formatJson: true,
    });

    try {
      const clean = extractJsonString(raw);
      return JSON.parse(clean);
    } catch {
      throw new AIProviderError(`Failed to parse AI output as JSON: ${raw.slice(0, 200)}`, "INVALID_RESPONSE");
    }
  }
}

function extractJsonString(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) return match[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

