/**
 * Centralized environment configuration with fail-fast validation.
 *
 * Rules:
 *  - Required vars cause process exit if missing.
 *  - No `|| "default"` or `?? "default"` fallbacks for required vars.
 *  - AI and SMTP credentials are user-owned; they are NOT here.
 */

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable ${name}. Set it before starting FlowMind; see .env.example.`);
  }
  return value.trim();
}

// ─── Validate on first import ────────────────────────────────────────────────

const databaseUrl = requireEnv("DATABASE_URL", process.env.DATABASE_URL);
const redisUrl = requireEnv("REDIS_URL", process.env.REDIS_URL);
const jwtSecret = requireEnv("JWT_SECRET", process.env.JWT_SECRET);
const encryptionKey = requireEnv("ENCRYPTION_KEY", process.env.ENCRYPTION_KEY);
const appUrl = requireEnv("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL);
const nodeEnv = process.env.NODE_ENV;
const port = process.env.PORT;

if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

if (!/^[\da-fA-F]{64}$/.test(encryptionKey)) {
  throw new Error("ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).");
}

try {
  new URL(appUrl);
} catch {
  throw new Error("NEXT_PUBLIC_APP_URL must be an absolute URL.");
}

if (port !== undefined && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
  throw new Error("PORT must be an integer between 1 and 65535 when set.");
}

// ─── Exported config ──────────────────────────────────────────────────────────

export const env = {
  databaseUrl,
  redisUrl,
  jwtSecret,
  encryptionKey,
  appUrl,
  nodeEnv,
  port: port === undefined ? undefined : Number(port),
  isDevelopment: nodeEnv === "development",
  isProduction: nodeEnv === "production",
} as const;

export function getSeedAdminConfig() {
  return {
    email: requireEnv("SEED_ADMIN_EMAIL", process.env.SEED_ADMIN_EMAIL),
    password: requireEnv("SEED_ADMIN_PASSWORD", process.env.SEED_ADMIN_PASSWORD),
  };
}

export type Env = typeof env;
