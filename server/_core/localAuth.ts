import { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { authenticateUser, disableTwoFactor, enableTwoFactor, getTwoFactorSettings, getUserById, saveTwoFactorSetup, updateTwoFactorRecoveryCodes } from "../auth";
import { createAuditLog } from "../db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { localAuthMiddleware } from "./localAuthMiddleware";
import { createLocalSessionToken } from "./localSession";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure, requireSameOrigin } from "./security";
import { buildTotpUri, checkTwoFactorRateLimit, clearTwoFactorFailures, consumeRecoveryCode, createTwoFactorChallengeToken, generateRecoveryCodes, generateTotpSecret, recordTwoFactorFailure, TWO_FACTOR_CHALLENGE_COOKIE, TWO_FACTOR_CHALLENGE_TTL_SECONDS, verifyTotpCode, verifyTwoFactorChallengeToken } from "./twoFactor";
import { notifySecurityEvent } from "./securityAlerts";

function publicUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    churchRole: user.churchRole,
    isActive: user.isActive,
    twoFactorEnabled: user.role === "admin" ? Boolean(user.twoFactorEnabled) : false,
  };
}

function clearChallengeCookie(req: Request, res: Response) {
  res.clearCookie(TWO_FACTOR_CHALLENGE_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}

function setSessionCookie(req: Request, res: Response, user: { id: number; sessionVersion?: number }) {
  res.cookie(COOKIE_NAME, createLocalSessionToken(user.id, user.sessionVersion ?? 1), getSessionCookieOptions(req));
}

function setChallengeCookie(req: Request, res: Response, user: { id: number; sessionVersion?: number }) {
  res.cookie(
    TWO_FACTOR_CHALLENGE_COOKIE,
    createTwoFactorChallengeToken(user.id, user.sessionVersion ?? 1),
    { ...getSessionCookieOptions(req), maxAge: TWO_FACTOR_CHALLENGE_TTL_SECONDS * 1000 },
  );
}

function challengeKey(req: Request, userId: number) {
  return `${req.ip ?? req.socket.remoteAddress ?? "unknown"}:${userId}`;
}

async function verifyAdminCode(req: Request, userId: number, code: string, allowRecoveryCode: boolean) {
  const settings = await getTwoFactorSettings(userId);
  if (!settings?.enabled || !settings.secret) return { valid: false, recoveryCodes: null as string | null };
  if (verifyTotpCode(settings.secret, code)) return { valid: true, recoveryCodes: null as string | null };
  if (!allowRecoveryCode) return { valid: false, recoveryCodes: null as string | null };
  const remaining = consumeRecoveryCode(settings.recoveryCodes, code);
  return { valid: Boolean(remaining), recoveryCodes: remaining };
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", requireSameOrigin, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      if (!username || !password) return res.status(400).json({ success: false, error: "Username and password are required" });

      const rate = checkLoginRateLimit(req, username);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ success: false, error: "Demasiadas tentativas. Tente novamente mais tarde." });
      }

      const user = await authenticateUser(username, password);
      if (!user) {
        recordLoginFailure(req, username);
        void notifySecurityEvent({ kind: "login_failure", title: "Falha de login local detectada", metadata: { ip: req.ip ?? "desconhecido" } });
        return res.status(401).json({ success: false, error: "Credenciais inválidas" });
      }

      clearLoginFailures(req, username);
      if (user.role === "admin" && user.twoFactorEnabled) {
        setChallengeCookie(req, res, user);
        return res.json({ success: true, twoFactorRequired: true, message: "Introduza o código da aplicação autenticadora." });
      }

      setSessionCookie(req, res, user);
      return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
      console.error("[LocalAuth] Login error:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/auth/2fa/verify", requireSameOrigin, async (req: Request, res: Response) => {
    try {
      const { code } = req.body as { code?: string };
      const cookies = parseCookieHeader(req.headers.cookie ?? "");
      const challenge = verifyTwoFactorChallengeToken(cookies[TWO_FACTOR_CHALLENGE_COOKIE]);
      if (!challenge || !code) return res.status(401).json({ success: false, error: "Desafio 2FA inválido ou expirado." });
      const user = await getUserById(challenge.userId);
      if (!user || user.role !== "admin" || !user.isActive || (user.sessionVersion ?? 1) !== challenge.sessionVersion || !user.twoFactorEnabled) {
        clearChallengeCookie(req, res);
        return res.status(401).json({ success: false, error: "Não foi possível validar o desafio 2FA." });
      }

      const key = challengeKey(req, user.id);
      const rate = checkTwoFactorRateLimit(key);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ success: false, error: "Demasiadas tentativas de 2FA. Tente novamente mais tarde." });
      }
      const verification = await verifyAdminCode(req, user.id, code, true);
      if (!verification.valid) {
        recordTwoFactorFailure(key);
        void notifySecurityEvent({ kind: "two_factor_failure", title: "Falha de verificação 2FA detectada", actorId: user.id, metadata: { ip: req.ip ?? "desconhecido" } });
        return res.status(401).json({ success: false, error: "Código 2FA inválido." });
      }
      if (verification.recoveryCodes) await updateTwoFactorRecoveryCodes(user.id, verification.recoveryCodes);
      clearTwoFactorFailures(key);
      clearChallengeCookie(req, res);
      setSessionCookie(req, res, user);
      return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
      console.error("[LocalAuth] 2FA verification error:", error);
      return res.status(500).json({ success: false, error: "Não foi possível validar o código 2FA." });
    }
  });

  app.post("/api/auth/2fa/setup", requireSameOrigin, localAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await getUserById((req as Request & { localUser?: { id: number } }).localUser?.id ?? 0);
      if (!user || user.role !== "admin") return res.status(403).json({ success: false, error: "Apenas administradores podem configurar 2FA." });
      const secret = generateTotpSecret();
      const recoveryCodes = generateRecoveryCodes();
      const saved = await saveTwoFactorSetup(user.id, secret, recoveryCodes);
      if (!saved) return res.status(503).json({ success: false, error: "Não foi possível guardar a configuração 2FA." });
      await createAuditLog({ userId: user.id, action: "configurar", entityType: "two_factor", entityId: user.id, details: JSON.stringify({ action: "setup_started" }) });
      return res.json({ success: true, secret, otpauthUri: buildTotpUri(secret, user.username ?? `admin-${user.id}`), recoveryCodes, message: "Guarde os códigos de recuperação antes de confirmar." });
    } catch (error) {
      console.error("[LocalAuth] 2FA setup error:", error);
      return res.status(500).json({ success: false, error: "Não foi possível iniciar a configuração 2FA." });
    }
  });

  app.post("/api/auth/2fa/confirm", requireSameOrigin, localAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const current = (req as Request & { localUser?: { id: number } }).localUser;
      const user = await getUserById(current?.id ?? 0);
      const { code } = req.body as { code?: string };
      const settings = user ? await getTwoFactorSettings(user.id) : null;
      if (!user || user.role !== "admin" || !settings?.secret || !code || !verifyTotpCode(settings.secret, code)) return res.status(400).json({ success: false, error: "Código inválido. Confirme o código actual da aplicação autenticadora." });
      if (!await enableTwoFactor(user.id)) return res.status(503).json({ success: false, error: "Não foi possível activar o 2FA." });
      await createAuditLog({ userId: user.id, action: "activar", entityType: "two_factor", entityId: user.id, details: JSON.stringify({ action: "enabled" }) });
      return res.json({ success: true, twoFactorEnabled: true });
    } catch (error) {
      console.error("[LocalAuth] 2FA confirmation error:", error);
      return res.status(500).json({ success: false, error: "Não foi possível confirmar o 2FA." });
    }
  });

  app.post("/api/auth/2fa/disable", requireSameOrigin, localAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const current = (req as Request & { localUser?: { id: number } }).localUser;
      const user = await getUserById(current?.id ?? 0);
      const { code } = req.body as { code?: string };
      const settings = user ? await getTwoFactorSettings(user.id) : null;
      if (!user || user.role !== "admin" || !settings?.secret || !code || !verifyTotpCode(settings.secret, code)) return res.status(400).json({ success: false, error: "É necessário um código válido da aplicação autenticadora." });
      if (!await disableTwoFactor(user.id)) return res.status(503).json({ success: false, error: "Não foi possível desactivar o 2FA." });
      const updatedUser = await getUserById(user.id);
      if (updatedUser) setSessionCookie(req, res, updatedUser);
      await createAuditLog({ userId: user.id, action: "desactivar", entityType: "two_factor", entityId: user.id, details: JSON.stringify({ action: "disabled" }) });
      return res.json({ success: true, twoFactorEnabled: false });
    } catch (error) {
      console.error("[LocalAuth] 2FA disable error:", error);
      return res.status(500).json({ success: false, error: "Não foi possível desactivar o 2FA." });
    }
  });

  app.post("/api/auth/activity", requireSameOrigin, localAuthMiddleware, (_req: Request, res: Response) => res.json({ success: true }));

  app.get("/api/auth/me", localAuthMiddleware, (req: Request, res: Response) => {
    try {
      return res.json({ success: true, user: (req as any).localUser });
    } catch (error) {
      console.error("[LocalAuth] Get user error:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", requireSameOrigin, (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearChallengeCookie(req, res);
      return res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Logout error:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });
}
