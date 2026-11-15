import { Integration, IntegrationType, Prisma } from "@prisma/client";
import { decrypt, encrypt, isEncryptedPayload } from "@/lib/security/encrypt";
import { prisma } from "@/lib/db";

function asConfig(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function protectIntegrationConfig(
  _type: IntegrationType,
  incomingValue: unknown,
  existingValue?: unknown,
): Record<string, unknown> {
  const incoming = asConfig(incomingValue);
  const existing = asConfig(existingValue);
  return protectObject(incoming, existing);
}

export function revealIntegrationSecret(value: unknown): string {
  if (isEncryptedPayload(value)) return decrypt(value);
  return typeof value === "string" ? value : "";
}

export function presentIntegration<T extends { type: IntegrationType; config: unknown }>(integration: T) {
  const { config, hasSecret } = redactObject(asConfig(integration.config));

  return {
    ...integration,
    config,
    hasSecret,
  };
}

export async function ensureIntegrationSecretsEncrypted(integration: Integration): Promise<Integration> {
  const config = protectIntegrationConfig(integration.type, integration.config, integration.config);
  if (JSON.stringify(config) === JSON.stringify(integration.config)) return integration;

  await prisma.integration.update({
    where: { id: integration.id },
    data: { config: config as Prisma.InputJsonObject },
  });

  return { ...integration, config: config as Prisma.JsonObject };
}

function protectObject(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...incoming };

  for (const [key, oldValue] of Object.entries(existing)) {
    if (isSecretKey(key) && !(key in result)) result[key] = oldValue;
  }

  for (const [key, value] of Object.entries(result)) {
    const oldValue = existing[key];
    if (isSecretKey(key)) {
      if (typeof value === "string" && value.trim() !== "") {
        result[key] = encrypt(value);
      } else if (isEncryptedPayload(oldValue)) {
        result[key] = oldValue;
      } else if (typeof oldValue === "string" && oldValue !== "") {
        result[key] = encrypt(oldValue);
      } else {
        delete result[key];
      }
    } else if (isPlainObject(value)) {
      result[key] = protectObject(value, isPlainObject(oldValue) ? oldValue : {});
    } else if (Array.isArray(value)) {
      result[key] = value.map((item, index) => {
        const oldItem = Array.isArray(oldValue) ? oldValue[index] : undefined;
        return isPlainObject(item) ? protectObject(item, isPlainObject(oldItem) ? oldItem : {}) : item;
      });
    }
  }

  return result;
}

function redactObject(value: Record<string, unknown>): { config: Record<string, unknown>; hasSecret: boolean } {
  const config: Record<string, unknown> = {};
  let hasSecret = false;

  for (const [key, item] of Object.entries(value)) {
    if (isSecretKey(key)) {
      hasSecret ||= item !== undefined && item !== null && item !== "";
      continue;
    }
    if (isPlainObject(item)) {
      const nested = redactObject(item);
      config[key] = nested.config;
      hasSecret ||= nested.hasSecret;
    } else if (Array.isArray(item)) {
      config[key] = item.map((entry) => {
        if (!isPlainObject(entry)) return entry;
        const nested = redactObject(entry);
        hasSecret ||= nested.hasSecret;
        return nested.config;
      });
    } else {
      config[key] = item;
    }
  }

  return { config, hasSecret };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !isEncryptedPayload(value);
}

function isSecretKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  return /(^|_)(api_key|password|passwd|pass|secret|token|authorization|credential|private_key)(_|$)/.test(normalized);
}