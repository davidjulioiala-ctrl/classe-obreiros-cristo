import { Request, Response, NextFunction } from "express";
import { parse } from "cookie";
import { getUserById } from "../auth";
import { getAppSetting, getGlobalSessionRevokedAt } from "../db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { refreshLocalSessionToken, verifyLocalSessionToken } from "./localSession";

function getLocalSession(req: Request) {
  const rawCookies = req.headers.cookie ?? "";
  const cookies = parse(rawCookies);
  return verifyLocalSessionToken(cookies[COOKIE_NAME]);
}

function refreshSessionCookie(req: Request, res: Response, session: ReturnType<typeof verifyLocalSessionToken>) {
  if (!session) return;
  res.cookie(COOKIE_NAME, refreshLocalSessionToken(session), getSessionCookieOptions(req));
}

function getRequestPath(req: Request) {
  const path = (req as Request & { path?: string; originalUrl?: string }).path
    ?? (req as Request & { originalUrl?: string }).originalUrl?.split("?")[0]
    ?? "";
  return path.replace(/\/+$/, "") || "/";
}

function isTwoFactorPendingAllowedPath(req: Request) {
  const path = getRequestPath(req);
  // Um utilizador com 2FA obrigatório pendente só pode obter os próprios
  // metadados de sessão e concluir o setup. Não pode chamar rotas tRPC nem
  // aceder a dados de membros, finanças ou outros recursos protegidos.
  return path === "/api/auth/me"
    || path === "/api/auth/2fa/setup"
    || path === "/api/auth/2fa/confirm";
}

async function isGlobalTwoFactorRequired() {
  const raw = await getAppSetting("global_two_factor_required");
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { required?: unknown };
    return parsed.required === true;
  } catch {
    return false;
  }
}

async function isTwoFactorBlocked(req: Request, user: { twoFactorEnabled?: unknown }) {
  return !isTwoFactorPendingAllowedPath(req) && await isGlobalTwoFactorRequired() && user.twoFactorEnabled !== true;
}

export async function localAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = getLocalSession(req);
    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const globalRevokedAt = await getGlobalSessionRevokedAt();
    if (globalRevokedAt) {
      const revokedAtMs = Date.parse(globalRevokedAt);
      if (Number.isFinite(revokedAtMs) && session.issuedAt * 1000 <= revokedAtMs) {
        return res.status(401).json({ error: "Session revoked" });
      }
    }

    const user = await getUserById(session.userId);
    if (!user || !user.isActive || (user.sessionVersion ?? 1) !== session.sessionVersion) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (await isTwoFactorBlocked(req, user)) {
      return res.status(403).json({ code: "TWO_FACTOR_REQUIRED", error: "A autenticação de dois factores é obrigatória. Configure o 2FA para continuar." });
    }

    refreshSessionCookie(req, res, session);
    (req as Request & { localUser?: unknown }).localUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      churchRole: user.churchRole,
      isActive: user.isActive,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    };

    return next();
  } catch (error) {
    console.error("[LocalAuth] Middleware error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

export async function getLocalUserFromRequest(req: Request, res?: Response) {
  const session = getLocalSession(req);
  if (!session) return null;
  const globalRevokedAt = await getGlobalSessionRevokedAt();
  if (globalRevokedAt) {
    const revokedAtMs = Date.parse(globalRevokedAt);
    if (Number.isFinite(revokedAtMs) && session.issuedAt * 1000 <= revokedAtMs) return null;
  }
  const user = await getUserById(session.userId);
  if (!user || !user.isActive || (user.sessionVersion ?? 1) !== session.sessionVersion) return null;
  if (await isTwoFactorBlocked(req, user)) return null;
  if (res) refreshSessionCookie(req, res, session);
  return user;
}
