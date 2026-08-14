import type { Express, Request, Response } from "express";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getAllMembers, listReports } from "./db";
import { generateMembersCsv, generateMembersExcel, generateMembersPdf, generateReportsCsv, generateReportsPdf, sanitizeMemberExportColumns } from "./listExport";
import { notifySecurityEvent } from "./_core/securityAlerts";
import { MEMBER_EXPORT_COLUMN_KEYS, REPORT_EXPORT_COLUMN_KEYS, type MemberExportColumn, type ReportExportColumn } from "../shared/exportColumns";

function canExportReports(user: { role: string; churchRole: string } | null) {
  return Boolean(user && (user.role === "admin" || user.churchRole === "lider" || user.churchRole === "oficial"));
}

function safeSearch(value: unknown) {
  return String(value ?? "").trim().slice(0, 100);
}

function parseIncludePersonalData(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value ?? "false").toLowerCase() === "true";
}

function parseColumns<T extends string>(value: unknown, allowed: readonly T[]): T[] | null {
  if (value === undefined) return [...allowed];
  const raw = Array.isArray(value) ? value[0] : value;
  const requested = String(raw).split(",").map((item) => item.trim()).filter(Boolean);
  if (requested.length === 0) return null;
  const unique = Array.from(new Set(requested));
  if (unique.some((item) => !allowed.includes(item as T))) return null;
  return unique as T[];
}

export function registerListExportRoutes(app: Express) {
  app.get("/api/members/export/:format", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      const format = req.params.format;
      if (format !== "pdf" && format !== "csv" && format !== "xlsx") return res.status(400).json({ error: "Formato inválido" });
      const search = safeSearch(req.query.search).toLocaleLowerCase("pt-PT");
      const requestedColumns = parseColumns(req.query.columns, MEMBER_EXPORT_COLUMN_KEYS);
      if (!requestedColumns) return res.status(400).json({ error: "A selecção de colunas é inválida." });
      const columns = sanitizeMemberExportColumns(requestedColumns, parseIncludePersonalData(req.query.includePersonalData));
      if (columns.length === 0) return res.status(400).json({ error: "Seleccione pelo menos uma coluna não pessoal para exportar." });
      const members = (await getAllMembers()).filter((member) => !search || member.name.toLocaleLowerCase("pt-PT").includes(search));
      const suffix = search ? "-pesquisa" : "";
      if (format === "pdf") {
        const buffer = await generateMembersPdf(members, search, columns as MemberExportColumn[]);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.pdf"`);
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:pdf", metadata: { count: members.length, filtered: Boolean(search) } });
        return res.send(buffer);
      }
      if (format === "xlsx") {
        const workbook = generateMembersExcel(members, columns as MemberExportColumn[]);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.xlsx"`);
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:xlsx", metadata: { count: members.length, filtered: Boolean(search) } });
        return res.send(workbook);
      }
      const csv = generateMembersCsv(members, columns as MemberExportColumn[]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.csv"`);
      void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:csv", metadata: { count: members.length, filtered: Boolean(search) } });
      return res.send(csv);
    } catch (error) {
      console.error("[MembersExport]", error);
      return res.status(500).json({ error: "Não foi possível exportar a lista de membros." });
    }
  });

  app.get("/api/reports/export/:format", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      if (!canExportReports(user)) return res.status(403).json({ error: "Sem permissão para exportar relatórios." });
      const format = req.params.format;
      if (format !== "pdf" && format !== "csv" && format !== "xlsx") return res.status(400).json({ error: "Formato inválido" });
      const columns = parseColumns(req.query.columns, REPORT_EXPORT_COLUMN_KEYS);
      if (!columns) return res.status(400).json({ error: "A selecção de colunas é inválida." });
      const reports = await listReports();
      if (format === "pdf") {
        const buffer = await generateReportsPdf(reports, columns as ReportExportColumn[]);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="relatorios.pdf"');
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de relatórios concluída", actorId: user.id, resource: "relatorios:pdf", metadata: { count: reports.length } });
        return res.send(buffer);
      }
      const csv = generateReportsCsv(reports, columns as ReportExportColumn[]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="relatorios.csv"');
      void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de relatórios concluída", actorId: user.id, resource: "relatorios:csv", metadata: { count: reports.length } });
      return res.send(csv);
    } catch (error) {
      console.error("[ReportsExport]", error);
      return res.status(500).json({ error: "Não foi possível exportar a lista de relatórios." });
    }
  });
}
