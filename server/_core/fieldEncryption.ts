import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./env";

const ENCRYPTION_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getEncryptionKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for data encryption");
  return createHash("sha256").update(`classe-obreiros-cristo:data-encryption:${ENV.cookieSecret}`).digest();
}

export function encryptSensitive(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return value;
  if (value.startsWith(ENCRYPTION_PREFIX)) return value;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64url");
  return `${ENCRYPTION_PREFIX}${payload}`;
}

export function decryptSensitive(value: string | null | undefined) {
  if (value === null || value === undefined || value === "" || !value.startsWith(ENCRYPTION_PREFIX)) return value;
  try {
    const payload = Buffer.from(value.slice(ENCRYPTION_PREFIX.length), "base64url");
    if (payload.length <= IV_BYTES + AUTH_TAG_BYTES) return null;
    const iv = payload.subarray(0, IV_BYTES);
    const authTag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const encrypted = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error("[DataEncryption] Failed to decrypt field:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function encryptFields<T extends Record<string, unknown>>(row: T, fields: readonly string[]) {
  const copy = { ...row } as Record<string, unknown>;
  for (const field of fields) {
    if (typeof copy[field] === "string") copy[field] = encryptSensitive(copy[field] as string);
  }
  return copy as T;
}

export function decryptFields<T extends Record<string, unknown>>(row: T, fields: readonly string[]) {
  const copy = { ...row } as Record<string, unknown>;
  for (const field of fields) {
    if (typeof copy[field] === "string") copy[field] = decryptSensitive(copy[field] as string);
  }
  return copy as T;
}

export function encryptJson(value: unknown) {
  const json = JSON.stringify(value);
  return encryptSensitive(json) as string;
}

export function decryptJson<T = Record<string, unknown>>(value: string): T {
  const json = decryptSensitive(value) ?? value;
  return JSON.parse(json) as T;
}

export const DATA_ENCRYPTION_PREFIX = ENCRYPTION_PREFIX;
