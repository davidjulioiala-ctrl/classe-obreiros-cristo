import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getActivityById, getAllMembers, getAttendanceByActivity } from "./db";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";
import { notifySecurityEvent } from "./_core/securityAlerts";

function cleanText(value: unknown, fallback = "—") {
  const text = String(value ?? "").replace(/[<>]/g, "").trim();
  return text || fallback;
}

export function registerAttendancePdfRoute(app: Express) {
  app.get("/api/attendance/:activityId/pdf", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      if (user.role !== "admin" && user.churchRole !== "lider" && user.churchRole !== "oficial") {
        return res.status(403).json({ error: "Sem permissão para exportar presenças." });
      }

      const activityId = Number(req.params.activityId);
      if (!Number.isInteger(activityId) || activityId <= 0) {
        return res.status(400).json({ error: "ID de actividade inválido." });
      }

      const activity = await getActivityById(activityId);
      if (!activity) return res.status(404).json({ error: "Actividade não encontrada." });
      const [records, allMembers] = await Promise.all([getAttendanceByActivity(activityId), getAllMembers(false)]);
      const membersById = new Map(allMembers.map((member) => [member.id, member]));
      const rows = records
        .map((record) => ({ record, member: membersById.get(record.memberId) }))
        .filter((item) => item.member)
        .sort((first, second) => first.member!.name.localeCompare(second.member!.name, "pt-PT"));

      const branding = await loadPdfBranding();
      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="presencas-${activityId}-${new Date().toISOString().slice(0, 10)}.pdf"`);
      const document = new PDFDocument({ size: "A4", margin: 42 });
      document.pipe(res);
      const title = `PRESENÇAS — ${cleanText(activity.name, "Actividade")}`;
      drawPdfHeader(document, branding, title);
      document.fontSize(9).fillColor("#64748b").text(`Data: ${new Date(activity.date).toLocaleDateString("pt-PT")} · Gerado em ${new Date().toLocaleString("pt-PT")}`, { align: "center" });
      document.moveDown(0.8);
      document.fontSize(10).fillColor("#0f172a").text(`Registos apresentados: ${rows.length} · Presentes: ${rows.filter(({ record }) => record.isPresent).length} · Ausentes: ${rows.filter(({ record }) => !record.isPresent).length}`);
      document.moveDown(0.8);

      const columns = [
        { title: "ID", x: 42, width: 50 },
        { title: "Nome completo", x: 92, width: 270 },
        { title: "Cargo", x: 362, width: 125 },
        { title: "Estado", x: 487, width: 105 },
      ];
      const pageWidth = 510;
      const rowHeight = 22;
      let y = document.y + 4;
      const drawRow = (values: string[], header = false) => {
        if (y > 720) {
          document.addPage({ size: "A4", margin: 42 });
          drawPdfHeader(document, branding, title);
          y = document.y + 4;
        }
        document.save().fillColor(header ? "#d1fae5" : "#f8fafc").rect(42, y, pageWidth, rowHeight).fill().restore();
        document.strokeColor("#cbd5e1").rect(42, y, pageWidth, rowHeight).stroke();
        values.forEach((value, index) => {
          const column = columns[index];
          document.fontSize(header ? 8 : 8.5).fillColor(header ? "#065f46" : "#0f172a").text(value, column.x + 4, y + 6, { width: column.width - 8, ellipsis: true });
          if (index > 0) document.strokeColor("#cbd5e1").moveTo(column.x, y).lineTo(column.x, y + rowHeight).stroke();
        });
        y += rowHeight;
      };

      drawRow(columns.map((column) => column.title), true);
      rows.forEach(({ record, member }) => drawRow([String(member!.id), cleanText(member!.name), cleanText(member!.position), record.isPresent ? "Presente" : "Ausente"]));
      document.fontSize(8).fillColor("#64748b").text(`${pdfFooterText(branding, "documento gerado pelo sistema")}. A exportação contém apenas os registos de presença da actividade seleccionada.`, 42, Math.min(y + 14, 770), { width: pageWidth });
      document.end();
      void notifySecurityEvent({ kind: "sensitive_export", title: "Exportação de presenças concluída", actorId: user.id, resource: "presencas-pdf", metadata: { activityId, registos: rows.length, formato: "pdf" } });
    } catch (error) {
      console.error("[Attendance] PDF generation error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Não foi possível gerar o PDF de presenças." });
    }
  });
}
