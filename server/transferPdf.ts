import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { getAllMembers } from "./db";

function calculateAge(value: unknown) {
  if (!value) return null;
  const birth = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function registerTransferPdfRoute(app: Express) {
  app.get("/api/transfers/adult-pdf", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) return res.status(401).json({ error: "Não autenticado" });
      const ids = String(req.query.ids ?? "").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
      if (!ids.length) return res.status(400).json({ error: "Nenhum membro selecionado" });
      const reason = String(req.query.reason ?? "Transferência validada para a camada de jovens").slice(0, 300);
      // A operação de transferência marca os membros como inativos antes de abrir o PDF.
      // Por isso, esta rota deve consultar o histórico completo, não apenas membros ativos.
      const allMembers = await getAllMembers(false);
      const selected = allMembers.filter((member) => ids.includes(member.id));
      if (!selected.length) return res.status(404).json({ error: "Membros não encontrados" });

      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="transferencias-jovens-${new Date().toISOString().slice(0, 10)}.pdf"`);
      const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 34 });
      document.pipe(res);
      document.fontSize(18).fillColor("#064e3b").text("Classe Obreiros de Cristo");
      document.fontSize(14).fillColor("#0f172a").text("Transferência validada para a camada de jovens");
      document.fontSize(9).fillColor("#64748b").text(`Gerado em ${new Date().toLocaleString("pt-PT")} · ${selected.length} pessoa(s)`);
      document.moveDown(0.7);
      document.fontSize(10).fillColor("#0f172a").text(`Motivo comum: ${reason}`);
      document.moveDown(0.8);

      const columns = [
        { title: "Nome completo", x: 34, width: 190 },
        { title: "Nascimento", x: 224, width: 86 },
        { title: "Idade", x: 310, width: 42 },
        { title: "Sexo", x: 352, width: 52 },
        { title: "Grupo", x: 404, width: 125 },
        { title: "Contacto", x: 529, width: 120 },
        { title: "Estado", x: 649, width: 100 },
      ];
      let y = document.y + 4;
      const rowHeight = 24;
      const drawRow = (values: string[], header = false) => {
        document.save().fillColor(header ? "#d1fae5" : "#f8fafc").rect(34, y, 716, rowHeight).fill().restore();
        document.strokeColor("#cbd5e1").rect(34, y, 716, rowHeight).stroke();
        values.forEach((value, index) => {
          const column = columns[index];
          document.fontSize(header ? 8 : 8.5).fillColor(header ? "#065f46" : "#0f172a").text(value, column.x + 4, y + 7, { width: column.width - 8, ellipsis: true });
          if (index > 0) document.strokeColor("#cbd5e1").moveTo(column.x, y).lineTo(column.x, y + rowHeight).stroke();
        });
        y += rowHeight;
      };
      drawRow(columns.map((column) => column.title), true);
      selected.forEach((member) => {
        const birthDate = member.birthDate ? new Date(member.birthDate).toLocaleDateString("pt-PT") : "—";
        drawRow([member.name, birthDate, calculateAge(member.birthDate)?.toString() ?? "—", member.sex === "M" ? "Masculino" : "Feminino", member.groupId ? `Grupo #${member.groupId}` : "—", member.phoneOrange || member.phoneTelecel || "—", member.isActive ? "Ativo" : "Inativo"]);
        if (y > 520) { document.addPage({ size: "A4", layout: "landscape", margin: 34 }); y = 34; drawRow(columns.map((column) => column.title), true); }
      });
      document.moveDown(1);
      document.fontSize(8).fillColor("#64748b").text("Os registos originais permanecem guardados no sistema; a transferência altera apenas o estado operacional do membro.", 34, Math.min(y + 12, 550));
      document.end();
    } catch (error) {
      console.error("[Transfers] PDF generation error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Não foi possível gerar o PDF" });
    }
  });
}
