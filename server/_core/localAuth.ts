import { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { authenticateUser, disableTwoFactor, enableTwoFactor, getTwoFactorSettings, getUserById, saveTwoFactorSetup, updateTwoFactorRecoveryCodes } from "../auth";
import { createAuditLog, getAppSetting } from "../db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { localAuthMiddleware } from "./localAuthMiddleware";
import { createLocalSessionToken } from "./localSession";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure, requireSameOrigin } from "./security";
import { buildTotpUri, checkTwoFactorRateLimit, clearTwoFactorFailures, consumeRecoveryCode, createTwoFactorChallengeToken, generateRecoveryCodes, generateTotpSecret, recordTwoFactorFailure, TWO_FACTOR_CHALLENGE_COOKIE, TWO_FACTOR_CHALLENGE_TTL_SECONDS, verifyTotpCode, verifyTwoFactorChallengeToken } from "./twoFactor";
import { notifySecurityEvent } from "./securityAlerts";
import { parsePublicOrganizationBranding } from "../../shared/organizationBranding";

function publicUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    churchRole: user.churchRole,
    isActive: user.isActive,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
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
  if (!settings?.enabled || !settings.secret) return { valid: false, recoveryCodes: null as string | null, reason: "unconfigured" as const };
  if (verifyTotpCode(settings.secret, code)) return { valid: true, recoveryCodes: null as string | null, reason: "valid" as const };
  if (!allowRecoveryCode) return { valid: false, recoveryCodes: null as string | null, reason: "invalid" as const };
  const remaining = consumeRecoveryCode(settings.recoveryCodes, code);
  return { valid: Boolean(remaining), recoveryCodes: remaining, reason: remaining ? "valid" as const : "invalid" as const };
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", requireSameOrigin, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
      if (!normalizedUsername || typeof password !== "string" || !password) return res.status(400).json({ success: false, error: "Por favor, preencha o nome de utilizador e a senha." });

      const rate = checkLoginRateLimit(req, normalizedUsername);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ success: false, error: "Demasiadas tentativas. Tente novamente mais tarde." });
      }

      const user = await authenticateUser(normalizedUsername, password);
      if (!user) {
        recordLoginFailure(req, normalizedUsername);
        void notifySecurityEvent({ kind: "login_failure", title: "Falha de login local detectada", metadata: { ip: req.ip ?? "desconhecido" } });
        return res.status(401).json({ success: false, error: "Nome de utilizador ou palavra-passe incorretos. Por favor, verifique os dados inseridos." });
      }

      clearLoginFailures(req, normalizedUsername);
      const globalPolicyRaw = await getAppSetting("global_two_factor_required");
      let globalTwoFactorRequired = false;
      try {
        if (globalPolicyRaw) {
          const parsed = JSON.parse(globalPolicyRaw);
          globalTwoFactorRequired = Boolean(parsed.required);
        }
      } catch {
        globalTwoFactorRequired = false;
      }

      if (!user.twoFactorEnabled) {
        if (globalTwoFactorRequired) {
          setChallengeCookie(req, res, user);
          return res.json({ success: true, twoFactorSetupRequired: true, message: "A administração exigiu a ativação obrigatória do 2FA para todos os utilizadores. Por favor, configure o seu 2FA." });
        }
        // Caso contrário, entra normalmente sem forçar 2FA (opcional)
        setSessionCookie(req, res, user);
        return res.json({ success: true, user: publicUser(user) });
      }

      const settings = await getTwoFactorSettings(user.id);
      if (!settings?.enabled || !settings.secret) {
        if (globalTwoFactorRequired) {
          setChallengeCookie(req, res, user);
          return res.json({ success: true, twoFactorSetupRequired: true, message: "A configuração 2FA desta conta está incompleta. Por favor, complete a configuração." });
        }
        setSessionCookie(req, res, user);
        return res.json({ success: true, user: publicUser(user) });
      }
      setChallengeCookie(req, res, user);
      return res.json({ success: true, twoFactorRequired: true, message: "Introduza o código da aplicação autenticadora ou um código de recuperação." });
    } catch (error) {
      console.error("[LocalAuth] Login error:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/auth/2fa/verify", requireSameOrigin, async (req: Request, res: Response) => {
    try {
      const { code } = req.body as { code?: string };
      const normalizedCode = typeof code === "string" ? code.trim().slice(0, 64) : "";
      const cookies = parseCookieHeader(req.headers.cookie ?? "");
      const challenge = verifyTwoFactorChallengeToken(cookies[TWO_FACTOR_CHALLENGE_COOKIE]);
      if (!challenge || !normalizedCode) return res.status(401).json({ success: false, error: "O desafio 2FA expirou. Volte ao login e introduza novamente as suas credenciais." });
      const user = await getUserById(challenge.userId);
      if (!user || !user.isActive || (user.sessionVersion ?? 1) !== challenge.sessionVersion || !user.twoFactorEnabled) {
        clearChallengeCookie(req, res);
        return res.status(401).json({ success: false, error: "Não foi possível validar o desafio 2FA." });
      }

      const key = challengeKey(req, user.id);
      const rate = checkTwoFactorRateLimit(key);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ success: false, error: "Demasiadas tentativas de 2FA. Tente novamente mais tarde." });
      }
      const verification = await verifyAdminCode(req, user.id, normalizedCode, true);
      if (verification.reason === "unconfigured") {
        clearChallengeCookie(req, res);
        return res.status(503).json({ success: false, error: "A configuração 2FA desta conta está incompleta. Contacte outro administrador para a recuperar." });
      }
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
      if (!user) return res.status(401).json({ success: false, error: "Sessão não autenticada. Entre novamente para configurar o 2FA." });
      const secret = generateTotpSecret();
      const recoveryCodes = generateRecoveryCodes();
      if (user.twoFactorEnabled) return res.status(409).json({ success: false, error: "O 2FA já está activo nesta conta. Desactive-o primeiro se precisar de configurar um novo dispositivo." });
      const saved = await saveTwoFactorSetup(user.id, secret, recoveryCodes);
      if (!saved) return res.status(503).json({ success: false, error: "Não foi possível guardar a configuração 2FA. Tente novamente." });
      const persistedSetup = await getTwoFactorSettings(user.id);
      if (!persistedSetup?.secret || persistedSetup.secret !== secret) {
        console.error("[LocalAuth] 2FA setup persistence verification failed", { userId: user.id });
        return res.status(503).json({ success: false, error: "A configuração 2FA não pôde ser validada no servidor. Reinicie a configuração." });
      }
      await createAuditLog({ userId: user.id, action: "configurar", entityType: "two_factor", entityId: user.id, details: JSON.stringify({ action: "setup_started" }) });
      const organization = parsePublicOrganizationBranding(await getAppSetting("organization"));
      return res.json({ success: true, secret, otpauthUri: buildTotpUri(secret, user.username ?? `admin-${user.id}`, organization.organizationName), recoveryCodes, message: "Guarde os códigos de recuperação antes de confirmar." });
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
      const normalizedCode = typeof code === "string" ? code.trim().slice(0, 64) : "";
      const settings = user ? await getTwoFactorSettings(user.id) : null;
      if (!user) return res.status(401).json({ success: false, error: "Sessão não autenticada. Entre novamente para activar o 2FA." });
      if (!settings?.secret) return res.status(409).json({ success: false, error: "Não existe uma configuração 2FA pendente. Clique em Configurar 2FA novamente." });
      if (!normalizedCode || !verifyTotpCode(settings.secret, normalizedCode)) return res.status(400).json({ success: false, error: "Código 2FA inválido ou expirado. Confirme o código actual da aplicação autenticadora e tente novamente." });
      if (!await enableTwoFactor(user.id)) return res.status(503).json({ success: false, error: "Não foi possível activar o 2FA. Tente novamente." });
      const enabledUser = await getUserById(user.id);
      if (!enabledUser?.twoFactorEnabled) return res.status(503).json({ success: false, error: "O 2FA não ficou activo. Tente confirmar novamente." });
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
      if (!user || !settings?.secret || !code || !verifyTotpCode(settings.secret, code)) return res.status(400).json({ success: false, error: "É necessário um código válido da aplicação autenticadora." });
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
