import { Express, Request, Response } from "express";
import { authenticateUser } from "../auth";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

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

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, user.id.toString(), cookieOptions);

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

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

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
