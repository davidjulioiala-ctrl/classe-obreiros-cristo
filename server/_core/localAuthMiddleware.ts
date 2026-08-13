import { Request, Response, NextFunction } from "express";
import { parse } from "cookie";
import { getUserById } from "../auth";
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

    const user = await getUserById(session.userId);
    if (!user || !user.isActive || (user.sessionVersion ?? 1) !== session.sessionVersion) {
      return res.status(401).json({ error: "Not authenticated" });
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
  const user = await getUserById(session.userId);
  if (!user || !user.isActive || (user.sessionVersion ?? 1) !== session.sessionVersion) return null;
  if (res) refreshSessionCookie(req, res, session);
  return user;
}
