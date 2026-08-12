import { Request, Response, NextFunction } from "express";
import { getUserById } from "../auth";
import { COOKIE_NAME } from "@shared/const";

export async function localAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get user ID from cookie
    const userId = req.cookies[COOKIE_NAME];

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Fetch user from database
    const user = await getUserById(parseInt(userId));

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    // Attach user to request
    (req as any).localUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      churchRole: user.churchRole,
    };

    next();
  } catch (error) {
    console.error("[LocalAuth] Middleware error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}
