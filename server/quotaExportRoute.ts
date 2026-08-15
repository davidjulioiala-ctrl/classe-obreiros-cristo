import type { Express, Request, Response } from "express";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getAllGroups, getAllMembers, listQuotas } from "./db";
import type { members, quotas } from "../drizzle/schema";
import { filterQuotaExportItems, generateQuotasCsv, generateQuotasExcel, generateQuotasPdf, type ExportQuotaItem } from "./quotaExport";
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
      const monthParam = String(req.query.month ?? "").trim();
      const month = monthParam && monthParam !== "all" ? parseInt(monthParam, 10) : undefined;
      const memberIdParam = String(req.query.memberId ?? "").trim();
      const memberId = memberIdParam ? parseInt(memberIdParam, 10) : undefined;
      const groupIdParam = String(req.query.groupId ?? "").trim();
      const groupId = groupIdParam && groupIdParam !== "all" ? parseInt(groupIdParam, 10) : undefined;
      const memberQuery = String(req.query.memberQuery ?? "").trim();
      const includePersonalData = String(req.query.includePersonalData ?? "true").toLowerCase() === "true";

      if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: "Ano inválido." });
      if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) return res.status(400).json({ error: "Mês inválido." });
      if (memberId !== undefined && (!Number.isInteger(memberId) || memberId <= 0)) return res.status(400).json({ error: "Pessoa inválida." });
      if (groupId !== undefined && (!Number.isInteger(groupId) || groupId <= 0)) return res.status(400).json({ error: "Grupo inválido." });

      const allQuotas = (await listQuotas()) as QuotaRow[];
      const membersList = (await getAllMembers(false)) as MemberRow[];
      const memberMap = new Map<number, MemberRow>(membersList.map((m) => [m.id, m]));
      if (memberId !== undefined && !memberMap.has(memberId)) return res.status(404).json({ error: "Pessoa não encontrada." });
      if (groupId !== undefined && !(await getAllGroups()).some((group) => group.id === groupId)) return res.status(404).json({ error: "Grupo não encontrado." });
      const items: ExportQuotaItem[] = allQuotas
        .filter((q) => Number(q.year) === year)
        .map((q) => {
          const member = memberMap.get(q.memberId);
          return {
            id: q.id,
            memberId: q.memberId,
            memberName: member ? member.name : `Membro #${q.memberId}`,
            groupId: member?.groupId ?? null,
            year: Number(q.year),
            month: Number(q.month),
            amount: q.amount,
            isPaid: q.isPaid,
            responsibleName: q.responsibleName || null,
          };
        });
      const filteredItems = filterQuotaExportItems(items, { year, month, memberId, groupId, memberQuery }).sort((a, b) => Number(a.id) - Number(b.id));

      if (format === "pdf") {
        const buffer = await generateQuotasPdf(filteredItems, includePersonalData);
        res.setHeader("Content-Type", "application/pdf");
        const suffix = month ? `-${String(month).padStart(2, "0")}` : groupId ? `-grupo-${groupId}` : memberId ? `-pessoa-${memberId}` : "-anuais";
        res.setHeader("Content-Disposition", `attachment; filename=quotas${suffix}-${year}.pdf`);
        void notifySecurityEvent({
          kind: "sensitive_export",
          title: "Exportação de quotas em PDF concluída",
          actorId: user.id,
          resource: `quotas:pdf:${year}`,
          metadata: { format, year, month, memberId, groupId, includePersonalData },
        });
        return res.send(buffer);
      }

      if (format === "csv") {
        const csv = generateQuotasCsv(filteredItems, includePersonalData);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        const suffix = month ? `-${String(month).padStart(2, "0")}` : groupId ? `-grupo-${groupId}` : memberId ? `-pessoa-${memberId}` : "-anuais";
        res.setHeader("Content-Disposition", `attachment; filename=quotas${suffix}-${year}.csv`);
        void notifySecurityEvent({
          kind: "sensitive_export",
          title: "Exportação de quotas em CSV concluída",
          actorId: user.id,
          resource: `quotas:csv:${year}`,
          metadata: { format, year, month, memberId, groupId, includePersonalData },
        });
        return res.send(csv);
      }

      const buffer = generateQuotasExcel(filteredItems, includePersonalData);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const suffix = month ? `-${String(month).padStart(2, "0")}` : groupId ? `-grupo-${groupId}` : memberId ? `-pessoa-${memberId}` : "-anuais";
      res.setHeader("Content-Disposition", `attachment; filename=quotas${suffix}-${year}.xlsx`);
      void notifySecurityEvent({
        kind: "sensitive_export",
        title: "Exportação de quotas em Excel concluída",
        actorId: user.id,
        resource: `quotas:xlsx:${year}`,
        metadata: { format, year, month, memberId, groupId, includePersonalData },
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
