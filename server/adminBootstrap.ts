import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { createUser, getUserCount } from "./auth";
import { ENV } from "./_core/env";
import { requireSameOrigin } from "./_core/security";

function tokenMatches(provided: unknown) {
  if (typeof provided !== "string" || !ENV.initialAdminBootstrapToken) return false;
  const expected = Buffer.from(ENV.initialAdminBootstrapToken, "utf8");
  const actual = Buffer.from(provided, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength) : "";
}

function validPassword(value: string) {
  return value.length >= 12 && value.length <= 256;
}

export function registerAdminBootstrapRoute(app: Express) {
  app.get("/api/auth/bootstrap/status", async (_req: Request, res: Response) => {
    try {
      const userCount = await getUserCount();
      return res.json({ available: Boolean(ENV.initialAdminBootstrapToken) && userCount === 0 });
    } catch {
      return res.status(503).json({ available: false });
    }
  });

  app.post("/api/auth/bootstrap", requireSameOrigin, async (req: Request, res: Response) => {
    try {
      if (!tokenMatches(req.headers["x-initial-admin-token"])) {
        return res.status(401).json({ success: false, error: "Token de bootstrap inválido." });
      }
      const userCount = await getUserCount();
      if (userCount !== 0) {
        return res.status(409).json({ success: false, error: "O bootstrap inicial já foi concluído." });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const username = clean(body.username, 80).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      const name = clean(body.name, 160);
      const email = clean(body.email, 180).toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username) || !validPassword(password) || name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: "Indique username, nome, email e palavra-passe válidos. A palavra-passe deve ter pelo menos 12 caracteres." });
      }

      const created = await createUser(username, password, name, email, "membro", "admin");
      if (!created) return res.status(503).json({ success: false, error: "Não foi possível criar o administrador inicial." });
      return res.status(201).json({ success: true, user: { id: created.id, username: created.username, name: created.name, email: created.email, role: created.role } });
    } catch (error) {
      console.error("[AdminBootstrap] Failed:", error);
      return res.status(500).json({ success: false, error: "Não foi possível concluir o bootstrap inicial." });
    }
  });
}
