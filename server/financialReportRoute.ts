import type { Express, Request, Response } from "express";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getFinancialReportData } from "./db";
import { generateFinancialExcel, generateFinancialPdf } from "./financialReport";
import { notifySecurityEvent } from "./_core/securityAlerts";

function canManageFinance(user: { role: string; churchRole: string } | null) {
  return Boolean(user && (user.role === "admin" || user.churchRole === "financeiro" || user.churchRole === "financeira"));
}

function parseRange(req: Request) {
  const startDate = String(req.query.startDate ?? "");
  const endDate = String(req.query.endDate ?? "");
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  return { startDate, endDate, start, end };
}

export function registerFinancialReportRoutes(app: Express) {
  const handle = async (req: Request, res: Response, format: "pdf" | "xlsx") => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user || !canManageFinance(user)) return res.status(403).json({ error: "Sem permissão para exportar relatórios financeiros." });
      const range = parseRange(req);
      if (!range) return res.status(400).json({ error: "Indique um intervalo válido com startDate e endDate." });
      const raw = await getFinancialReportData(range.start, range.end);
      const payload = { startDate: range.startDate, endDate: range.endDate, ...raw };
      if (format === "pdf") {
        const buffer = await generateFinancialPdf(payload);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=relatorio-financeiro-${range.startDate}-${range.endDate}.pdf`);
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação financeira concluída", actorId: user.id, resource: `relatorio-financeiro:${format}`, metadata: { formato: format, inicio: range.startDate, fim: range.endDate } });
        return res.send(buffer);
      }
      const buffer = generateFinancialExcel(payload);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=relatorio-financeiro-${range.startDate}-${range.endDate}.xlsx`);
      void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação financeira concluída", actorId: user.id, resource: `relatorio-financeiro:${format}`, metadata: { formato: format, inicio: range.startDate, fim: range.endDate } });
      return res.send(buffer);
    } catch (error) {
      console.error("[FinancialReport]", error);
      return res.status(500).json({ error: "Não foi possível gerar o relatório financeiro." });
    }
  };
  app.get("/api/finances/report/pdf", (req, res) => void handle(req, res, "pdf"));
  app.get("/api/finances/report/xlsx", (req, res) => void handle(req, res, "xlsx"));
}
