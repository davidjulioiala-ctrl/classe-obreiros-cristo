import type { Express, Request, Response } from "express";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getAllMembers, listQuotas } from "./db";
import type { members, quotas } from "../drizzle/schema";
import { generateQuotasCsv, generateQuotasExcel, generateQuotasPdf, type ExportQuotaItem } from "./quotaExport";
import { notifySecurityEvent } from "./_core/securityAlerts";

type MemberRow = typeof members.$inferSelect;
type QuotaRow = typeof quotas.$inferSelect;

export function registerQuotaExportRoutes(app: Express) {
  const handleExport = async (req: Request, res: Response, format: "pdf" | "xlsx" | "csv") => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Sessão inválida." });

      const yearParam = parseInt(String(req.query.year ?? new Date().getFullYear()), 10);
      const year = Number.isNaN(yearParam) ? new Date().getFullYear() : yearParam;
      const includePersonalData = String(req.query.includePersonalData ?? "true").toLowerCase() === "true";

      const allQuotas = (await listQuotas()) as QuotaRow[];
      const membersList = (await getAllMembers(false)) as MemberRow[];
      const memberMap = new Map<number, MemberRow>(membersList.map((m) => [m.id, m]));

      const items: ExportQuotaItem[] = allQuotas
        .filter((q) => Number(q.year) === year && q.isPaid)
        .map((q) => {
          const member = memberMap.get(q.memberId);
          return {
            id: q.id,
            memberId: q.memberId,
            memberName: member ? member.name : `Membro #${q.memberId}`,
            year: Number(q.year),
            month: Number(q.month),
            amount: q.amount,
            isPaid: q.isPaid,
            responsibleName: q.responsibleName || null,
          };
        })
        .sort((a, b) => Number(a.id) - Number(b.id));

      if (format === "pdf") {
        const buffer = await generateQuotasPdf(items, includePersonalData);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=quotas-anuais-${year}.pdf`);
        void notifySecurityEvent({
          kind: "sensitive_export",
          title: "Exportação de quotas em PDF concluída",
          actorId: user.id,
          resource: `quotas:pdf:${year}`,
          metadata: { format, year, includePersonalData },
        });
        return res.send(buffer);
      }

      if (format === "csv") {
        const csv = generateQuotasCsv(items, includePersonalData);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=quotas-anuais-${year}.csv`);
        void notifySecurityEvent({
          kind: "sensitive_export",
          title: "Exportação de quotas em CSV concluída",
          actorId: user.id,
          resource: `quotas:csv:${year}`,
          metadata: { format, year, includePersonalData },
        });
        return res.send(csv);
      }

      const buffer = generateQuotasExcel(items, includePersonalData);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=quotas-anuais-${year}.xlsx`);
      void notifySecurityEvent({
        kind: "sensitive_export",
        title: "Exportação de quotas em Excel concluída",
        actorId: user.id,
        resource: `quotas:xlsx:${year}`,
        metadata: { format, year, includePersonalData },
      });
      return res.send(buffer);
    } catch (error) {
      console.error("[QuotaExport]", error);
      return res.status(500).json({ error: "Erro ao gerar exportação de quotas." });
    }
  };

  app.get("/api/quotas/export/pdf", (req, res) => void handleExport(req, res, "pdf"));
  app.get("/api/quotas/export/xlsx", (req, res) => void handleExport(req, res, "xlsx"));
  app.get("/api/quotas/export/csv", (req, res) => void handleExport(req, res, "csv"));
}
