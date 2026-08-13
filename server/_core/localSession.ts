import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./env";

const SESSION_VERSION = "v1";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: number;
  expiresAt: number;
};

function getSigningSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is required for local sessions");
  }
  return ENV.cookieSecret;
}

function sign(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createLocalSessionToken(userId: number, now = Date.now()): string {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user id for local session");
  }
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const payload = `${SESSION_VERSION}.${userId}.${issuedAt}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyLocalSessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== SESSION_VERSION) return null;

  const [, userIdValue, issuedAtValue, expiresAtValue, signature] = parts;
  const userId = Number.parseInt(userIdValue, 10);
  const issuedAt = Number.parseInt(issuedAtValue, 10);
  const expiresAt = Number.parseInt(expiresAtValue, 10);
  if (![userId, issuedAt, expiresAt].every(Number.isInteger) || userId <= 0 || issuedAt <= 0 || expiresAt <= issuedAt) {
    return null;
  }

  const payload = `${SESSION_VERSION}.${userId}.${issuedAt}.${expiresAt}`;
  const expectedSignature = sign(payload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (Math.floor(now / 1000) >= expiresAt) return null;

  return { userId, expiresAt };
}

export const LOCAL_SESSION_TTL_SECONDS = SESSION_TTL_SECONDS;
