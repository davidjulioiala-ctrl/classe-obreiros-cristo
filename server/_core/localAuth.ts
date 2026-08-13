import { Express, Request, Response } from "express";
import { authenticateUser, getUserById } from "../auth";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { localAuthMiddleware } from "./localAuthMiddleware";
import { createLocalSessionToken } from "./localSession";

export function registerLocalAuthRoutes(app: Express) {
  // Local login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: "Username and password are required",
        });
      }

      const user = await authenticateUser(username, password);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      // Set a signed, expiring session cookie; never expose an unsigned user id.
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, createLocalSessionToken(user.id), cookieOptions);

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
  app.post("/api/auth/logout", (req: Request, res: Response) => {
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

