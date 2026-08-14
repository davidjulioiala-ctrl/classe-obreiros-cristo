import type { Express, Request, Response } from "express";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getAllMembers, listReports } from "./db";
import { filterMembers } from "@shared/memberSearch";
import { sanitizeMemberExportColumns, generateMembersCsv, generateMembersExcel, generateMembersPdf, generateReportsCsv, generateReportsExcel, generateReportsPdf } from "./listExport";
import { notifySecurityEvent } from "./_core/securityAlerts";
import { MEMBER_EXPORT_COLUMN_KEYS, REPORT_EXPORT_COLUMN_KEYS, type MemberExportColumn, type ReportExportColumn } from "../shared/exportColumns";

function safeSearch(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseColumns<T extends string>(value: unknown, validKeys: readonly T[]): T[] | null {
  if (typeof value !== "string" || !value.trim()) return [...validKeys];
  const keys = value.split(",").map((k) => k.trim()) as T[];
  const isValid = keys.every((k) => validKeys.includes(k));
  if (!isValid) return null;
  return keys;
}

function parseIncludePersonalData(value: unknown): boolean {
  return value === "true" || value === true;
}

function canExportReports(user: { role: string; churchRole: string } | null) {
  if (!user) return false;
  const role = user.role.toLowerCase();
  const churchRole = user.churchRole.toLowerCase();
  return role === "admin" || churchRole.includes("líder") || churchRole.includes("lider") || churchRole.includes("financeiro");
}

export function registerListExportRoutes(app: Express) {
  app.get("/api/members/export/:format", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      const format = req.params.format;
      if (format !== "pdf" && format !== "csv" && format !== "xlsx") return res.status(400).json({ error: "Formato inválido" });
      const searchQuery = safeSearch(req.query.search);
      const positionFilter = safeSearch(req.query.position);
      const sexFilter = safeSearch(req.query.sex);
      const statusFilter = safeSearch(req.query.status);
      const guestFilter = safeSearch(req.query.guest);
      const groupIdFilter = req.query.groupId ? Number(req.query.groupId) : NaN;

      const requestedColumns = parseColumns(req.query.columns, MEMBER_EXPORT_COLUMN_KEYS);
      if (!requestedColumns) return res.status(400).json({ error: "A selecção de colunas é inválida." });
      const columns = sanitizeMemberExportColumns(requestedColumns, parseIncludePersonalData(req.query.includePersonalData));
      if (columns.length === 0) return res.status(400).json({ error: "Seleccione pelo menos uma coluna não pessoal para exportar." });

      const allMembers = await getAllMembers();
      const filteredMembers = filterMembers(allMembers, {
        query: searchQuery,
        position: positionFilter || "all",
        sex: (sexFilter === "M" || sexFilter === "F" ? sexFilter : "all"),
        status: (statusFilter === "active" || statusFilter === "inactive" ? statusFilter : "all"),
        guest: (guestFilter === "members" || guestFilter === "guests" ? guestFilter : "all"),
        groupId: Number.isNaN(groupIdFilter) ? "all" : groupIdFilter,
      });

      const hasActiveFilters = Boolean(searchQuery.trim()) || Boolean(positionFilter && positionFilter !== "all") || Boolean(sexFilter && sexFilter !== "all") || Boolean(statusFilter && statusFilter !== "all") || Boolean(guestFilter && guestFilter !== "all") || !Number.isNaN(groupIdFilter);
      const suffix = hasActiveFilters ? "-filtrados" : "";
      if (format === "pdf") {
        const buffer = await generateMembersPdf(filteredMembers, searchQuery, columns as MemberExportColumn[]);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.pdf"`);
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:pdf", metadata: { count: filteredMembers.length, filtered: hasActiveFilters } });
        return res.send(buffer);
      }
      if (format === "xlsx") {
        const workbook = generateMembersExcel(filteredMembers, columns as MemberExportColumn[]);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.xlsx"`);
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:xlsx", metadata: { count: filteredMembers.length, filtered: hasActiveFilters } });
        return res.send(workbook);
      }
      const csv = generateMembersCsv(filteredMembers, columns as MemberExportColumn[]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.csv"`);
      void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:csv", metadata: { count: filteredMembers.length, filtered: hasActiveFilters } });
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
      if (format === "xlsx") {
        const workbook = generateReportsExcel(reports, columns as ReportExportColumn[]);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="relatorios.xlsx"');
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de relatórios concluída", actorId: user.id, resource: "relatorios:xlsx", metadata: { count: reports.length } });
        return res.send(workbook);
      }
      const csv = generateReportsCsv(reports, columns as ReportExportColumn[]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="relatorios.csv"');
      void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de relatórios concluída", actorId: user.id, resource: "relatorios:csv", metadata: { count: reports.length } });
      return res.send(csv);
    } catch (error) {
      console.error("[ReportsExport]", error);
      return res.status(500).json({ error: "Não foi possível exportar os relatórios." });
    }
  });
}
