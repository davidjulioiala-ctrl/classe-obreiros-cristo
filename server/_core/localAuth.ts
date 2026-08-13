import { Express, Request, Response } from "express";
import { authenticateUser, getUserById } from "../auth";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { localAuthMiddleware } from "./localAuthMiddleware";
import { createLocalSessionToken } from "./localSession";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure, requireSameOrigin } from "./security";

export function registerLocalAuthRoutes(app: Express) {
  // Local login endpoint
  app.post("/api/auth/login", requireSameOrigin, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: "Username and password are required",
        });
      }

      const rate = checkLoginRateLimit(req, username);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ success: false, error: "Demasiadas tentativas. Tente novamente mais tarde." });
      }

      const user = await authenticateUser(username, password);

      if (!user) {
        recordLoginFailure(req, username);
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      clearLoginFailures(req, username);
      // Set a signed, expiring session cookie; never expose an unsigned user id.
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, createLocalSessionToken(user.id, user.sessionVersion ?? 1), cookieOptions);

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          churchRole: user.churchRole,
        },
      });
    } catch (error) {
      console.error("[LocalAuth] Login error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Activity endpoint: validates the idle timeout and refreshes the signed session cookie.
  app.post("/api/auth/activity", requireSameOrigin, localAuthMiddleware, (_req: Request, res: Response) => {
    return res.json({ success: true });
  });

  // Get current user endpoint
  app.get("/api/auth/me", localAuthMiddleware, (req: Request, res: Response) => {
    try {
      const user = (req as any).localUser;
      return res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("[LocalAuth] Get user error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", requireSameOrigin, (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error("[LocalAuth] Logout error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
}

