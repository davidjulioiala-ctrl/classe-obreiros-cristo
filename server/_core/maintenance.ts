import type { NextFunction, Request, Response } from "express";
import { getSystemMaintenanceState } from "../db";

const AUTH_PREFIXES = ["/api/auth/", "/api/oauth/"];

function isEmergencyOperation(req: Request) {
  const url = req.originalUrl;
  if (url.startsWith("/api/trpc/incident.")) return true;
  if (url.startsWith("/api/trpc/system.")) return true;
  if (req.method === "GET" && url.startsWith("/api/backups/")) return true;
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

    return res.status(503).json({
      error: "O sistema está em manutenção de emergência.",
      maintenance: true,
      reason: state.reason || "As operações estão temporariamente bloqueadas.",
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
