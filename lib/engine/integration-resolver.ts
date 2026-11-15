/**
 * Integration resolver for the workflow execution engine.
 *
 * Fetches workspace-specific AI and SMTP integration configs from the database
 * and decrypts any encrypted credentials before returning them.
 *
 * Rules:
 *  - Never returns raw encrypted blobs to callers.
 *  - Never logs decrypted secrets.
 *  - Throws a user-friendly error if no active integration is found.
 */

import prisma from "@/lib/db";
import { ensureIntegrationSecretsEncrypted, revealIntegrationSecret } from "@/lib/integrations/config";

// ─── AI Integration ──────────────────────────────────────────────────────────

export interface ResolvedAIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  provider: "OLLAMA" | "OPENAI_COMPATIBLE";
}

/**
 * Retrieves and decrypts the active AI integration for a workspace.
 * Checks OLLAMA first, then OPENAI_COMPATIBLE.
 * Throws if no active (isConnected) AI integration is configured.
 */
export async function getAIIntegration(workspaceId: string): Promise<ResolvedAIConfig> {
  const integrations = await prisma.integration.findMany({
    where: {
      workspaceId,
      type: { in: ["OLLAMA", "OPENAI_COMPATIBLE"] },
      isConnected: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (integrations.length === 0) {
    throw new Error(
      "AI integration is not configured. Please configure your AI provider in Integrations."
    );
  }
  if (integrations.length !== 1) {
    throw new Error("Multiple AI integrations are active. Verify only the provider you want to use in Integrations.");
  }

  const integration = await ensureIntegrationSecretsEncrypted(integrations[0]);
  return resolveAIConfig(integration.type as "OLLAMA" | "OPENAI_COMPATIBLE", integration.config);
}

// ─── SMTP Integration ────────────────────────────────────────────────────────

export interface ResolvedSMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function resolveAIConfig(
  type: "OLLAMA" | "OPENAI_COMPATIBLE",
  value: unknown,
): ResolvedAIConfig {
  const cfg = (value ?? {}) as Record<string, unknown>;
  const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl.trim() : "";
  const model = typeof cfg.model === "string" ? cfg.model.trim() : "";
  const temperature = cfg.temperature;
  const maxTokens = cfg.maxTokens;
  const timeoutMs = cfg.timeoutMs;
  if (
    !baseUrl ||
    !model ||
    typeof temperature !== "number" ||
    typeof maxTokens !== "number" ||
    typeof timeoutMs !== "number"
  ) {
    throw new Error("AI integration is incomplete. Configure its endpoint, model, temperature, token limit, and timeout in Integrations.");
  }

  return {
    baseUrl,
    model,
    apiKey: revealIntegrationSecret(cfg.apiKey),
    temperature,
    maxTokens,
    timeoutMs,
    provider: type,
  };
}

export function resolveSMTPConfig(value: unknown): ResolvedSMTPConfig {
  const cfg = (value ?? {}) as Record<string, unknown>;
  const host = typeof cfg.host === "string" ? cfg.host.trim() : "";
  const port = Number(cfg.port);
  const user = typeof cfg.user === "string" ? cfg.user.trim() : "";
  const from = typeof cfg.from === "string" ? cfg.from.trim() : "";
  const pass = revealIntegrationSecret(cfg.pass);
  const secure = cfg.secure;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from || typeof secure !== "boolean") {
    throw new Error(
      "SMTP integration is incomplete. Configure host, port, username, password, sender email, and security settings in Integrations."
    );
  }

  return { host, port, secure, user, pass, from };
}

/**
 * Retrieves and decrypts the active SMTP integration for a workspace.
 * Throws if no active SMTP integration is configured.
 */
export async function getSMTPIntegration(workspaceId: string): Promise<ResolvedSMTPConfig> {
  const integrations = await prisma.integration.findMany({
    where: {
      workspaceId,
      type: "SMTP",
      isConnected: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (integrations.length === 0) {
    throw new Error(
      "SMTP integration is not configured. Please configure SMTP in Integrations."
    );
  }
  if (integrations.length !== 1) {
    throw new Error("Multiple SMTP integrations are active. Verify only the SMTP provider you want to use in Integrations.");
  }

  const integration = await ensureIntegrationSecretsEncrypted(integrations[0]);
  return resolveSMTPConfig(integration.config);
}
