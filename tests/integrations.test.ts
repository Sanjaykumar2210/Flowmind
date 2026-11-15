import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Integration } from "@prisma/client";

let AIClient: (typeof import("@/lib/ai/client"))["AIClient"];
let resolveAIConfig: (typeof import("@/lib/engine/integration-resolver"))["resolveAIConfig"];
let resolveSMTPConfig: (typeof import("@/lib/engine/integration-resolver"))["resolveSMTPConfig"];
let getAIIntegration: (typeof import("@/lib/engine/integration-resolver"))["getAIIntegration"];
let presentIntegration: (typeof import("@/lib/integrations/config"))["presentIntegration"];
let protectIntegrationConfig: (typeof import("@/lib/integrations/config"))["protectIntegrationConfig"];
let prisma: (typeof import("@/lib/db"))["prisma"];

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@database.invalid:5432/test");
  vi.stubEnv("REDIS_URL", "redis://cache.invalid:6379");
  vi.stubEnv("JWT_SECRET", "test-signing-secret-that-is-at-least-32-chars");
  vi.stubEnv("ENCRYPTION_KEY", "0000000000000000000000000000000000000000000000000000000000000000");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://flowmind.example.test");
  ({ AIClient } = await import("@/lib/ai/client"));
  ({ resolveAIConfig, resolveSMTPConfig, getAIIntegration } = await import("@/lib/engine/integration-resolver"));
  ({ presentIntegration, protectIntegrationConfig } = await import("@/lib/integrations/config"));
  ({ prisma } = await import("@/lib/db"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("user-owned integrations", () => {
  it("uses the configured OpenAI-compatible provider and selected model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "generated" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const config = resolveAIConfig("OPENAI_COMPATIBLE", {
      baseUrl: "https://provider.example/v1",
      model: "workspace-selected-model",
      apiKey: protectIntegrationConfig("OPENAI_COMPATIBLE", { apiKey: "provider-secret" }).apiKey,
      temperature: 0.4,
      maxTokens: 200,
      timeoutMs: 1000,
    });
    const client = new AIClient(config);

    await expect(client.generate("prompt")).resolves.toBe("generated");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://provider.example/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer provider-secret" }),
        body: expect.stringContaining('"model":"workspace-selected-model"'),
      }),
    );
  });

  it("resolves distinct active AI models by workspace", async () => {
    const makeIntegration = (workspaceId: string, model: string): Integration => ({
      id: `${workspaceId}-ai`,
      workspaceId,
      type: "OLLAMA",
      name: `${workspaceId} provider`,
      config: { baseUrl: "https://ollama.example.test", model, temperature: 0.3, maxTokens: 100, timeoutMs: 2000 },
      isConnected: true,
      lastTestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const findMany = vi.spyOn(prisma.integration, "findMany");
    findMany
      .mockResolvedValueOnce([makeIntegration("workspace-a", "model-a")])
      .mockResolvedValueOnce([makeIntegration("workspace-b", "model-b")]);

    await expect(getAIIntegration("workspace-a")).resolves.toMatchObject({ model: "model-a" });
    await expect(getAIIntegration("workspace-b")).resolves.toMatchObject({ model: "model-b" });
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ workspaceId: "workspace-a" }),
    }));
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ workspaceId: "workspace-b" }),
    }));
  });

  it("encrypts stored secrets and omits them from API presentation", () => {
    const config = protectIntegrationConfig("SMTP", {
      host: "mail.example.test",
      pass: "smtp-secret",
    });
    const integration = presentIntegration({
      id: "integration-1",
      type: "SMTP",
      config,
    });

    expect(config.pass).toEqual(expect.objectContaining({ encryptedValue: expect.any(String) }));
    expect(JSON.stringify(config)).not.toContain("smtp-secret");
    expect(integration.hasSecret).toBe(true);
    expect(integration.config).not.toHaveProperty("pass");
  });

  it("encrypts and redacts credentials in generic nested integration settings", () => {
    const config = protectIntegrationConfig("WEBHOOK", {
      headers: { Authorization: "Bearer integration-secret" },
    });
    const integration = presentIntegration({ id: "integration-2", type: "WEBHOOK", config });

    expect(JSON.stringify(config)).not.toContain("integration-secret");
    expect(JSON.stringify(integration)).not.toContain("integration-secret");
    expect(integration.hasSecret).toBe(true);
  });

  it("requires all SMTP connection settings without defaults", () => {
    expect(() => resolveSMTPConfig({ host: "mail.example.test", user: "user" })).toThrow(
      "SMTP integration is incomplete.",
    );
  });
});