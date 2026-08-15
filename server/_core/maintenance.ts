import type { NextFunction, Request, Response } from "express";
import { getSystemMaintenanceState } from "../db";
import { getLocalUserFromRequest } from "./localAuthMiddleware";

const AUTH_PREFIXES = ["/api/auth/", "/api/oauth/"];

function isEmergencyOperation(req: Request) {
  const url = req.originalUrl;
  if (url.startsWith("/api/trpc/incident.")) return true;
  if (url.startsWith("/api/trpc/system.")) return true;
  if (url.startsWith("/api/trpc/audit.")) return true;
  if (url.startsWith("/api/trpc/backup.")) return true;
  if (url.startsWith("/api/backups/")) return true;
  return false;
}

export async function maintenanceGate(req: Request, res: Response, next: NextFunction) {
  if (!req.originalUrl.startsWith("/api/")) return next();
  if (AUTH_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))) return next();
  if (req.originalUrl.startsWith("/api/maintenance")) return next();
  if (req.originalUrl.startsWith("/api/scheduled/daily-backup")) return next();

  try {
    const state = await getSystemMaintenanceState();
    if (!state.enabled || isEmergencyOperation(req)) return next();

    // Durante a manutenção, apenas um administrador autenticado pode
    // continuar a utilizar a aplicação para diagnóstico e recuperação.
    const authenticatedUser = await getLocalUserFromRequest(req, res);
    if (authenticatedUser?.role === "admin" && (isMaintenanceSafeMethod(req) || isEmergencyOperation(req))) return next();

    return res.status(503).json({
      error: "O sistema está em manutenção de emergência.",
      maintenance: true,
      reason: state.reason || "As operações estão temporariamente bloqueadas.",
      customMessage: state.customMessage || null,
      estimatedCompletionAt: state.estimatedCompletionAt,
      incidentId: state.incidentId,
    });
  } catch (error) {
    console.error("[Maintenance] Failed to read maintenance state:", error);
    // Fail closed: if the maintenance flag cannot be read, do not allow writes.
    if (req.method !== "GET" || req.originalUrl.startsWith("/api/trpc/")) {
      return res.status(503).json({ error: "O sistema está temporariamente indisponível para manutenção." });
    }
    return next();
  }
}

export function isMaintenanceSafeMethod(req: Request) {
  return req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
}
