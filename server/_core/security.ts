import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_ATTEMPTS = 30;

type LoginBucket = {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const loginBuckets = new Map<string, LoginBucket>();

function now() {
  return Date.now();
}

function normaliseUsername(username: string) {
  return username.trim().toLowerCase().slice(0, 120);
}

export function getClientAddress(req: Request) {
  // Express does not trust forwarded headers unless the deployment explicitly
  // configures a trusted proxy. This avoids client-controlled IP spoofing.
  return req.ip || req.socket.remoteAddress || "unknown";
}

function readBucket(key: string, timestamp: number) {
  const current = loginBuckets.get(key);
  if (!current) {
    const fresh = { count: 0, windowStartedAt: timestamp, blockedUntil: 0 };
    loginBuckets.set(key, fresh);
    return fresh;
  }
  if (current.blockedUntil > timestamp) return current;
  if (timestamp - current.windowStartedAt >= LOGIN_WINDOW_MS) {
    current.count = 0;
    current.windowStartedAt = timestamp;
    current.blockedUntil = 0;
  }
  return current;
}

function pruneBuckets(timestamp: number) {
  if (loginBuckets.size < 5000) return;
  loginBuckets.forEach((bucket, key) => {
    if (bucket.blockedUntil <= timestamp && timestamp - bucket.windowStartedAt > LOGIN_WINDOW_MS) {
      loginBuckets.delete(key);
    }
  });
}

export function checkLoginRateLimit(req: Request, username: string) {
  const timestamp = now();
  pruneBuckets(timestamp);
  const address = getClientAddress(req);
  const userKey = `user:${address}:${normaliseUsername(username)}`;
  const ipKey = `ip:${address}`;
  const userBucket = readBucket(userKey, timestamp);
  const ipBucket = readBucket(ipKey, timestamp);
  const retryAfterMs = Math.max(userBucket.blockedUntil, ipBucket.blockedUntil) - timestamp;

  if (retryAfterMs > 0) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  if (userBucket.count >= LOGIN_MAX_ATTEMPTS || ipBucket.count >= IP_MAX_ATTEMPTS) {
    const blockedUntil = timestamp + LOGIN_BLOCK_MS;
    userBucket.blockedUntil = blockedUntil;
    ipBucket.blockedUntil = blockedUntil;
    return { allowed: false, retryAfterSeconds: Math.ceil(LOGIN_BLOCK_MS / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(req: Request, username: string) {
  const timestamp = now();
  const address = getClientAddress(req);
  const userBucket = readBucket(`user:${address}:${normaliseUsername(username)}`, timestamp);
  const ipBucket = readBucket(`ip:${address}`, timestamp);
  userBucket.count += 1;
  ipBucket.count += 1;
  if (userBucket.count >= LOGIN_MAX_ATTEMPTS || ipBucket.count >= IP_MAX_ATTEMPTS) {
    const blockedUntil = timestamp + LOGIN_BLOCK_MS;
    userBucket.blockedUntil = blockedUntil;
    ipBucket.blockedUntil = blockedUntil;
  }
}

export function clearLoginFailures(req: Request, username: string) {
  const address = getClientAddress(req);
  loginBuckets.delete(`user:${address}:${normaliseUsername(username)}`);
}

function getRequestOrigin(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(",")[0])?.trim() || req.protocol;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost?.split(",")[0])?.trim() || req.get("host");
  return host ? `${protocol}://${host}` : null;
}

function isSameOrigin(value: string, req: Request) {
  try {
    const expected = getRequestOrigin(req);
    return Boolean(expected && new URL(value).origin === expected);
  } catch {
    return false;
  }
}

export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  // Requests without cookies cannot be used for cookie-based CSRF. Login and
  // cron requests therefore remain usable without an Origin header.
  if (!req.headers.cookie) return next();

  const origin = req.get("origin");
  const referer = req.get("referer");
  if ((origin && isSameOrigin(origin, req)) || (!origin && referer && isSameOrigin(referer, req))) return next();

  return res.status(403).json({ error: "Origem da requisição não autorizada." });
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.protocol === "https" || req.get("x-forwarded-proto")?.split(",")[0].trim() === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (process.env.NODE_ENV === "production") {
    const analyticsOrigin = process.env.VITE_ANALYTICS_ENDPOINT ? (() => {
      try { return new URL(process.env.VITE_ANALYTICS_ENDPOINT).origin; } catch { return ""; }
    })() : "";
    const scriptSources = ["'self'", analyticsOrigin].filter(Boolean).join(" ");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' data: https:`,
    );
  }
  next();
}

export function safeText(maxLength: number): z.ZodString;
export function safeText(maxLength: number, required: false): z.ZodOptional<z.ZodString>;
export function safeText(maxLength: number, required = true): z.ZodString | z.ZodOptional<z.ZodString> {
  const base = z.string().trim().max(maxLength).refine((value) => !/[<>]/.test(value), "Texto contém markup não permitido.");
  return required ? base.min(1) : base.optional();
}

export function safeEmail() {
  return z.string().trim().email().max(320);
}

export const positiveId = z.number().int().positive();

export const SECURITY_LIMITS = {
  loginWindowMs: LOGIN_WINDOW_MS,
  loginMaxAttempts: LOGIN_MAX_ATTEMPTS,
  loginBlockMs: LOGIN_BLOCK_MS,
  maxJsonBody: "2mb",
  maxUrlEncodedBody: "256kb",
} as const;
