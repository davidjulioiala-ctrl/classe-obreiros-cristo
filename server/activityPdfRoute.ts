import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getDb, getActivityById, getCommissionByActivity } from "./db";
import { members } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifySecurityEvent } from "./_core/securityAlerts";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";

export function registerActivityPdfRoute(app: Express) {
  app.get("/api/activities/:id/export-pdf", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });

      const activityId = Number(req.params.id);
      if (!Number.isInteger(activityId) || activityId <= 0) {
        return res.status(400).json({ error: "ID de atividade inválido" });
      }

      const docType = String(req.query.type ?? "ata").toLowerCase() === "relatorio" ? "relatorio" : "ata";

      const activity = await getActivityById(activityId);
      if (!activity) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }

      const rawCommission = await getCommissionByActivity(activityId);
      const dbInstance = await getDb();
      const commissions = await Promise.all(
        rawCommission.map(async (c) => {
          let memberName = "Membro não encontrado";
          if (c.memberId && dbInstance) {
            const [m] = await dbInstance.select().from(members).where(eq(members.id, c.memberId)).limit(1);
            if (m) memberName = m.name;
          }
          return {
            role: c.role ?? "Participante",
            phone: c.phone ?? "",
            memberName,
          };
        })
      );

      const branding = await loadPdfBranding();
      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      const filename = `${docType === "ata" ? "ata-reuniao" : "relatorio-atividade"}-${activity.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      doc.pipe(res);

      // Cabeçalho personalizado da congregação
      drawPdfHeader(doc, branding, docType === "ata" ? "ATA DE REUNIÃO" : "RELATÓRIO DE ATIVIDADE");
      doc.fontSize(9).fillColor("#64748b").text(`Emitido em ${new Date().toLocaleString("pt-PT")} por ${user.username}`, { align: "center" });
      doc.moveDown(1);

      // Informações gerais da atividade
      doc.fontSize(11).fillColor("#064e3b").text("1. DADOS DA ATIVIDADE");
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#0f172a");
      doc.text(`Nome da Atividade: ${activity.name}`);
      doc.text(`Data e Horário: ${activity.date} | ${activity.startTime} - ${activity.endTime}`);
      doc.text(`Local: ${activity.location}`);
      doc.text(`Tipo: ${activity.type}`);
      doc.text(`Público-alvo / Grupo: ${activity.audience}`);
      if (activity.theme) doc.text(`Tema: ${activity.theme}`);
      if (activity.speakerName) doc.text(`Pregador / Preletor: ${activity.speakerName}`);
      if (activity.biblicalReference) doc.text(`Referência Bíblica: ${activity.biblicalReference}`);
      doc.moveDown(1);

      // Campos específicos se for Reunião
      if (activity.type === "Reunião") {
        doc.fontSize(11).fillColor("#064e3b").text("2. PONTOS DE ORDEM DO DIA E MOTIVO");
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#0f172a");
        doc.text("Ordem do Dia:", { underline: true });
        doc.text(activity.meetingAgenda || "Não especificada.");
        doc.moveDown(0.5);
        doc.text("Motivo da Reunião:", { underline: true });
        doc.text(activity.meetingReason || "Não especificado.");
        doc.moveDown(1);
      }

      // Comissão / Escala associada
      if (commissions.length > 0) {
        doc.fontSize(11).fillColor("#064e3b").text(activity.type === "Reunião" ? "3. PARTICIPANTES / COMISSÃO" : "2. COMISSÃO / ESCALA ASSOCIADA");
        doc.moveDown(0.3);
        commissions.forEach((c, idx) => {
          doc.fontSize(9.5).fillColor("#0f172a").text(`• ${idx + 1}. ${c.memberName} — Cargo: ${c.role}${c.phone ? ` (Tel: ${c.phone})` : ""}`);
        });
        doc.moveDown(1);
      }

      // Conclusões
      doc.fontSize(11).fillColor("#064e3b").text(activity.type === "Reunião" ? "4. DELIBERAÇÕES E ENCERRAMENTO" : "3. CONCLUSÕES E REGISTOS DE EXECUÇÃO");
      doc.moveDown(0.3);
      doc.fontSize(9.5).fillColor("#475569");
      doc.text(
        docType === "ata"
          ? "A presente ata foi lavrada para registrar os pontos discutidos, deliberações e compromissos assumidos pelos obreiros presentes na data acima indicada."
          : "Este relatório documenta a execução bem-sucedida da atividade programada, servindo de registo oficial para o arquivo da organização religiosa."
      );
      doc.moveDown(3);

      // Assinaturas
      doc.fontSize(9).fillColor("#0f172a");
      doc.text("O(a) Secretário(a): ___________________________        O(a) Dirigente: ___________________________", { align: "center" });
      doc.moveDown(1);
      doc.fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "documento gerado pelo sistema"), { align: "center" });

      doc.end();

      void notifySecurityEvent({
        kind: "sensitive_export",
        title: `Exportação de ${docType === "ata" ? "Ata" : "Relatório"} PDF`,
        actorId: user.id,
        resource: `activity-${activityId}-${docType}-pdf`,
        metadata: { activityId, docType },
      });
    } catch (error) {
      console.error("[ActivityPdf] Generation error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Não foi possível gerar o PDF da atividade" });
    }
  });
}
