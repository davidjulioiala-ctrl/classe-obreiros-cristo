import type { Express, Request, Response } from "express";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getAllMembers, listReports } from "./db";
import { generateMembersCsv, generateMembersPdf, generateReportsCsv, generateReportsPdf } from "./listExport";
import { notifySecurityEvent } from "./_core/securityAlerts";

function canExportReports(user: { role: string; churchRole: string } | null) {
  return Boolean(user && (user.role === "admin" || user.churchRole === "lider" || user.churchRole === "oficial"));
}

function safeSearch(value: unknown) {
  return String(value ?? "").trim().slice(0, 100);
}

export function registerListExportRoutes(app: Express) {
  app.get("/api/members/export/:format", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      const format = req.params.format;
      if (format !== "pdf" && format !== "csv") return res.status(400).json({ error: "Formato inválido" });
      const search = safeSearch(req.query.search).toLocaleLowerCase("pt-PT");
      const members = (await getAllMembers()).filter((member) => !search || member.name.toLocaleLowerCase("pt-PT").includes(search));
      const suffix = search ? "-pesquisa" : "";
      if (format === "pdf") {
        const buffer = await generateMembersPdf(members, search);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="membros${suffix}.pdf"`);
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de membros concluída", actorId: user.id, resource: "membros:pdf", metadata: { count: members.length, filtered: Boolean(search) } });
        return res.send(buffer);
      }
      const csv = generateMembersCsv(members);
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
      if (format !== "pdf" && format !== "csv") return res.status(400).json({ error: "Formato inválido" });
      const reports = await listReports();
      if (format === "pdf") {
        const buffer = await generateReportsPdf(reports);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="relatorios.pdf"');
        void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de relatórios concluída", actorId: user.id, resource: "relatorios:pdf", metadata: { count: reports.length } });
        return res.send(buffer);
      }
      const csv = generateReportsCsv(reports);
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
