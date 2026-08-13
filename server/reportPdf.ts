import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getReportById, updateReport } from "./db";

export function registerReportPdfRoute(app: Express) {
  app.get("/api/reports/:id/pdf", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      if (user.role !== "admin" && user.churchRole !== "lider" && user.churchRole !== "oficial") {
        return res.status(403).json({ error: "Sem permissão para descarregar relatórios." });
      }

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Relatório inválido" });
      const report = await getReportById(id);
      if (!report) return res.status(404).json({ error: "Relatório não encontrado" });

      const previousDownloads = report.downloadedBy ? JSON.parse(report.downloadedBy) as number[] : [];
      const downloadedBy = Array.from(new Set([...previousDownloads, user.id]));
      await updateReport(id, { downloadedBy: JSON.stringify(downloadedBy) });

      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="relatorio-${id}.pdf"`);

      const document = new PDFDocument({ size: "A4", margin: 48 });
      document.pipe(res);
      document.fontSize(20).fillColor("#064e3b").text(report.type === "ata" ? "Ata da atividade" : "Relatório de atividade");
      document.moveDown(0.5);
      document.fontSize(10).fillColor("#64748b").text(`N.º ${report.id}  |  Actividade ${report.activityId}  |  Gerado em ${new Date(report.createdAt).toLocaleString("pt-PT")}`);
      document.moveDown(1);
      document.fontSize(12).fillColor("#0f172a").text(report.content || "Sem conteúdo registado.", { align: "left", lineGap: 5 });
      document.moveDown(2);
      document.fontSize(9).fillColor("#64748b").text("Classe Obreiros de Cristo — documento gerado pelo sistema", { align: "center" });
      document.end();
    } catch (error) {
      console.error("[Reports] PDF generation error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Não foi possível gerar o PDF" });
    }
  });
}
