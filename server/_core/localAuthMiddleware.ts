import { Request, Response, NextFunction } from "express";
import { parse } from "cookie";
import { getUserById } from "../auth";
import { COOKIE_NAME } from "@shared/const";
import { verifyLocalSessionToken } from "./localSession";

function getSessionUserId(req: Request): number | null {
  const rawCookies = req.headers.cookie ?? "";
  const cookies = parse(rawCookies);
  const session = verifyLocalSessionToken(cookies[COOKIE_NAME]);
  return session?.userId ?? null;
}

export async function localAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await getUserById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    (req as Request & { localUser?: unknown }).localUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      churchRole: user.churchRole,
      isActive: user.isActive,
    };

    return next();
  } catch (error) {
    console.error("[LocalAuth] Middleware error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

export async function getLocalUserFromRequest(req: Request) {
  const rawCookies = req.headers.cookie ?? "";
  const cookies = parse(rawCookies);
  const session = verifyLocalSessionToken(cookies[COOKIE_NAME]);
  if (!session) return null;
  const user = await getUserById(session.userId);
  return user && user.isActive ? user : null;
}
