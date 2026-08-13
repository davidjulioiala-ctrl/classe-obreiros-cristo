import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./env";

const SESSION_VERSION = "v3";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_IDLE_TIMEOUT_SECONDS = 60 * 20;
const SESSION_WARNING_SECONDS = 60 * 18;

export type SessionPayload = {
  userId: number;
  sessionVersion: number;
  issuedAt: number;
  lastActivityAt: number;
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

export function createLocalSessionToken(userId: number, sessionVersion = 1, now = Date.now()): string {
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(sessionVersion) || sessionVersion <= 0) {
    throw new Error("Invalid local session parameters");
  }
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const payload = `${SESSION_VERSION}.${userId}.${sessionVersion}.${issuedAt}.${issuedAt}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function refreshLocalSessionToken(session: SessionPayload, now = Date.now()): string {
  const lastActivityAt = Math.floor(now / 1000);
  const payload = `${SESSION_VERSION}.${session.userId}.${session.sessionVersion}.${session.issuedAt}.${lastActivityAt}.${session.expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyLocalSessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 7 || parts[0] !== SESSION_VERSION) return null;

  const [, userIdValue, sessionVersionValue, issuedAtValue, lastActivityValue, expiresAtValue, signature] = parts;
  const userId = Number.parseInt(userIdValue, 10);
  const sessionVersion = Number.parseInt(sessionVersionValue, 10);
  const issuedAt = Number.parseInt(issuedAtValue, 10);
  const lastActivityAt = Number.parseInt(lastActivityValue, 10);
  const expiresAt = Number.parseInt(expiresAtValue, 10);
  if (![userId, sessionVersion, issuedAt, lastActivityAt, expiresAt].every(Number.isInteger) || userId <= 0 || sessionVersion <= 0 || issuedAt <= 0 || lastActivityAt < issuedAt || expiresAt <= issuedAt) {
    return null;
  }

  const payload = `${SESSION_VERSION}.${userId}.${sessionVersion}.${issuedAt}.${lastActivityAt}.${expiresAt}`;
  const expectedSignature = sign(payload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const nowSeconds = Math.floor(now / 1000);
  if (nowSeconds >= expiresAt || nowSeconds - lastActivityAt >= SESSION_IDLE_TIMEOUT_SECONDS) return null;

  return { userId, sessionVersion, issuedAt, lastActivityAt, expiresAt };
}

export function getSessionIdleSeconds(session: SessionPayload, now = Date.now()) {
  return Math.max(0, Math.floor(now / 1000) - session.lastActivityAt);
}

export const LOCAL_SESSION_TTL_SECONDS = SESSION_TTL_SECONDS;
export const LOCAL_SESSION_IDLE_TIMEOUT_SECONDS = SESSION_IDLE_TIMEOUT_SECONDS;
export const LOCAL_SESSION_WARNING_SECONDS = SESSION_WARNING_SECONDS;
