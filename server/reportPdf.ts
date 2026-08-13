import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getReportById, updateReport } from "./db";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";

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

      const branding = await loadPdfBranding();
      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="relatorio-${id}.pdf"`);

      const document = new PDFDocument({ size: "A4", margin: 48 });
      document.pipe(res);
      drawPdfHeader(document, branding, report.type === "ata" ? "ATA DA ACTIVIDADE" : "RELATÓRIO DE ACTIVIDADE");
      document.fontSize(10).fillColor("#64748b").text(`N.º ${report.id}  |  Actividade ${report.activityId}  |  Gerado em ${new Date(report.createdAt).toLocaleString("pt-PT")}`, { align: "center" });
      document.moveDown(1);
      document.fontSize(12).fillColor("#0f172a").text(report.content || "Sem conteúdo registado.", { align: "left", lineGap: 5 });
      document.moveDown(2);
      document.fontSize(9).fillColor("#64748b").text(pdfFooterText(branding, "documento gerado pelo sistema"), { align: "center" });
      document.end();
    } catch (error) {
      console.error("[Reports] PDF generation error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Não foi possível gerar o PDF" });
    }
  });
}
