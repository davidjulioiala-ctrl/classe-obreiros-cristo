import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ENV } from "./env";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const CHALLENGE_VERSION = "2fa:v1";
const CHALLENGE_TTL_SECONDS = 5 * 60;

function signingSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for 2FA");
  return ENV.cookieSecret;
}

function normalizeBase32(value: string) {
  return value.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

function decodeBase32(value: string) {
  const normalized = normalizeBase32(value);
  let bits = "";
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function encodeBase32(value: Buffer) {
  let bits = "";
  for (let index = 0; index < value.length; index += 1) bits += value[index].toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    result += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return result;
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => randomBytes(6).toString("hex").toUpperCase());
}

export function hashRecoveryCode(code: string) {
  return createHmac("sha256", signingSecret()).update(code.replace(/[^A-Z0-9]/gi, "").toUpperCase(), "utf8").digest("hex");
}

export function serializeRecoveryCodes(codes: string[]) {
  return JSON.stringify(codes.map(hashRecoveryCode));
}

export function consumeRecoveryCode(serialized: string | null | undefined, code: string) {
  if (!serialized) return null;
  try {
    const stored = JSON.parse(serialized) as unknown;
    if (!Array.isArray(stored) || !stored.every((item) => typeof item === "string")) return null;
    const candidate = Buffer.from(hashRecoveryCode(code), "hex");
    const matchIndex = stored.findIndex((item) => {
      const expected = Buffer.from(item, "hex");
      return expected.length === candidate.length && timingSafeEqual(expected, candidate);
    });
    if (matchIndex < 0) return null;
    return JSON.stringify(stored.filter((_, index) => index !== matchIndex));
  } catch {
    return null;
  }
}

export function verifyTotpCode(secret: string, code: string, now = Date.now()) {
  const normalizedCode = String(code || "").replace(/[^0-9]/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) return false;
  let key: Buffer;
  try {
    key = decodeBase32(secret);
  } catch {
    return false;
  }
  const currentCounter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
  for (const offset of [-2, -1, 0, 1, 2]) {
    const counter = BigInt(currentCounter + offset);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(counter);
    const digest = createHmac("sha1", key).update(counterBuffer).digest();
    const position = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[position] & 0x7f) << 24) | (digest[position + 1] << 16) | (digest[position + 2] << 8) | digest[position + 3];
    const expected = String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(normalizedCode);
    if (timingSafeEqual(expectedBuffer, actualBuffer)) return true;
  }
  return false;
}

export function buildTotpUri(secret: string, username: string, issuer = "Classe Obreiros de Cristo") {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${username}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value, "utf8").digest("base64url");
}

export function createTwoFactorChallengeToken(userId: number, sessionVersion: number, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + CHALLENGE_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${CHALLENGE_VERSION}.${userId}.${sessionVersion}.${issuedAt}.${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyTwoFactorChallengeToken(token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 7 || parts[0] !== CHALLENGE_VERSION) return null;
  const [, userIdValue, sessionVersionValue, issuedAtValue, expiresAtValue, nonce, signature] = parts;
  const userId = Number.parseInt(userIdValue, 10);
  const sessionVersion = Number.parseInt(sessionVersionValue, 10);
  const issuedAt = Number.parseInt(issuedAtValue, 10);
  const expiresAt = Number.parseInt(expiresAtValue, 10);
  if (![userId, sessionVersion, issuedAt, expiresAt].every(Number.isInteger) || userId <= 0 || sessionVersion <= 0 || issuedAt <= 0 || expiresAt <= issuedAt || !nonce) return null;
  const payload = `${CHALLENGE_VERSION}.${userId}.${sessionVersion}.${issuedAt}.${expiresAt}.${nonce}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  if (Math.floor(now / 1000) >= expiresAt) return null;
  return { userId, sessionVersion, issuedAt, expiresAt };
}

export const TWO_FACTOR_REQUIRED_FOR_ALL = true;
const twoFactorAttempts = new Map<string, { count: number; resetAt: number }>();
const TWO_FACTOR_MAX_ATTEMPTS = 5;
const TWO_FACTOR_WINDOW_MS = 5 * 60 * 1000;

export function checkTwoFactorRateLimit(key: string, now = Date.now()) {
  const current = twoFactorAttempts.get(key);
  if (!current || current.resetAt <= now) {
    twoFactorAttempts.set(key, { count: 0, resetAt: now + TWO_FACTOR_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= TWO_FACTOR_MAX_ATTEMPTS) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordTwoFactorFailure(key: string, now = Date.now()) {
  const current = twoFactorAttempts.get(key);
  if (!current || current.resetAt <= now) {
    twoFactorAttempts.set(key, { count: 1, resetAt: now + TWO_FACTOR_WINDOW_MS });
    return;
  }
  current.count += 1;
}

export function clearTwoFactorFailures(key: string) {
  twoFactorAttempts.delete(key);
}

export const TWO_FACTOR_CHALLENGE_COOKIE = "local_2fa_challenge";
export const TWO_FACTOR_CHALLENGE_TTL_SECONDS = CHALLENGE_TTL_SECONDS;
