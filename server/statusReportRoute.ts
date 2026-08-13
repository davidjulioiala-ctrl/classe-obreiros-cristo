import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createSecurityIncident } from "./db";
import { requireSameOrigin, safeText } from "./_core/security";

const REPORT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 3;
const reportAttempts = new Map<string, { count: number; windowStartedAt: number }>();

const reportSchema = z.object({
  category: z.enum(["operational", "access", "data", "security", "other"]),
  description: safeText(4000),
});

function getClientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function consumeReportAttempt(key: string) {
  const now = Date.now();
  const current = reportAttempts.get(key);
  if (!current || now - current.windowStartedAt >= REPORT_WINDOW_MS) {
    reportAttempts.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_REPORTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((REPORT_WINDOW_MS - (now - current.windowStartedAt)) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function registerStatusReportRoute(app: Express) {
  app.post("/api/status-report", requireSameOrigin, async (req: Request, res: Response) => {
    const attempt = consumeReportAttempt(getClientKey(req));
    if (!attempt.allowed) {
      res.setHeader("Retry-After", String(attempt.retryAfterSeconds));
      return res.status(429).json({ success: false, error: "Foram recebidos vários relatos. Tente novamente mais tarde." });
    }

    const parsed = reportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Indique uma categoria e descreva o problema sem código ou marcação." });
    }

    try {
      const categoryLabels: Record<typeof parsed.data.category, string> = {
        operational: "Funcionamento geral",
        access: "Acesso ou autenticação",
        data: "Dados ou registos",
        security: "Segurança",
        other: "Outro problema",
      };
      const incident = await createSecurityIncident({
        category: `reporte-publico:${parsed.data.category}`,
        severity: parsed.data.category === "security" ? "medium" : "low",
        title: `Reporte público: ${categoryLabels[parsed.data.category]}`,
        description: parsed.data.description,
        source: "pagina-de-estado",
        affectedRecords: null,
        containmentActions: null,
        resolution: null,
        containedAt: null,
        resolvedAt: null,
        createdBy: 0,
      });

      return res.status(201).json({ success: true, reference: incident.incidentCode });
    } catch (error) {
      console.error("[StatusReport] Failed to create public report:", error);
      return res.status(503).json({ success: false, error: "Não foi possível registar o reporte neste momento." });
    }
  });
}

export function resetStatusReportRateLimitForTests() {
  reportAttempts.clear();
}
