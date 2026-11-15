/**
 * AES-256-GCM encryption utilities for sensitive integration credentials.
 *
 * Uses the ENCRYPTION_KEY env var (32-byte hex string = 64 hex chars).
 * Never logs or returns plain-text secrets.
 */

import crypto from "crypto";
import { env } from "@/lib/config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV
const TAG_LENGTH = 16; // 128-bit auth tag

function getKey(): Buffer {
  const hex = env.encryptionKey;
  if (hex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
        `Current length: ${hex.length}. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedPayload {
  encryptedValue: string; // base64
  iv: string; // base64
  tag: string; // base64
}

/**
 * Encrypts a plain-text string.
 * Returns { encryptedValue, iv, tag } — all base64-encoded.
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypts an encrypted payload back to plain text.
 * Throws if decryption fails (bad key, tampered data, wrong tag).
 */
export function decrypt(payload: EncryptedPayload): string {
  const key = getKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encryptedData = Buffer.from(payload.encryptedValue, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Returns true if the value looks like an encrypted payload JSON blob */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "encryptedValue" in value &&
    "iv" in value &&
    "tag" in value
  );
}

/** Mask a secret value for safe display in API responses / logs */
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "***";
  return value.slice(0, 2) + "***" + value.slice(-2);
}
