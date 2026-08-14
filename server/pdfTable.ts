import PDFDocument from "pdfkit";
import { drawPdfHeader, type PdfBranding } from "./pdfBranding";

export type PdfTableColumn = {
  title: string;
  weight: number;
  align?: "left" | "center" | "right";
};

type PdfTableOptions = {
  landscape?: boolean;
  startY?: number;
  emptyLabel?: string;
};

function cleanCell(value: unknown) {
  const text = String(value ?? "—").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return text || "—";
}

export function drawPdfTable(
  document: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
  title: string,
  columns: PdfTableColumn[],
  rows: unknown[][],
  options: PdfTableOptions = {},
) {
  if (!columns.length) return document.y;

  const landscape = options.landscape === true;
  const pageWidth = landscape ? 841.89 : 595.28;
  const pageHeight = landscape ? 595.28 : 841.89;
  const left = 42;
  const tableWidth = pageWidth - 84;
  const bottom = pageHeight - 58;
  const totalWeight = columns.reduce((sum, column) => sum + Math.max(column.weight, 0.1), 0);
  const widths = columns.map((column) => tableWidth * Math.max(column.weight, 0.1) / totalWeight);
  const headerHeight = 25;
  let y = options.startY ?? document.y + 8;
  let rowIndex = 0;

  const drawHeader = () => {
    if (y + headerHeight > bottom) {
      document.addPage({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 42 });
      drawPdfHeader(document, branding, title, { landscape });
      y = document.y + 8;
    }
    document.save().fillColor("#d1fae5").rect(left, y, tableWidth, headerHeight).fill().restore();
    document.strokeColor("#94a3b8").lineWidth(0.6).rect(left, y, tableWidth, headerHeight).stroke();
    let x = left;
    columns.forEach((column, index) => {
      document.font("Helvetica").fontSize(8).fillColor("#065f46").text(cleanCell(column.title), x + 4, y + 8, {
        width: widths[index] - 8,
        align: column.align ?? "left",
        ellipsis: true,
        lineBreak: false,
      });
      if (index > 0) document.strokeColor("#94a3b8").moveTo(x, y).lineTo(x, y + headerHeight).stroke();
      x += widths[index];
    });
    y += headerHeight;
  };

  const drawDataRow = (values: unknown[]) => {
    const texts = columns.map((_, index) => cleanCell(values[index]));
    document.font("Helvetica").fontSize(8.2);
    const heights = texts.map((text, index) => document.heightOfString(text, { width: Math.max(20, widths[index] - 8), lineGap: 1 }));
    const rowHeight = Math.max(23, Math.min(72, Math.max(...heights) + 10));
    if (y + rowHeight > bottom) {
      document.addPage({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 42 });
      drawPdfHeader(document, branding, title, { landscape });
      y = document.y + 8;
      drawHeader();
    }

    document.save().fillColor(rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc").rect(left, y, tableWidth, rowHeight).fill().restore();
    document.strokeColor("#cbd5e1").lineWidth(0.5).rect(left, y, tableWidth, rowHeight).stroke();
    let x = left;
    columns.forEach((column, index) => {
      document.font("Helvetica").fontSize(8.2).fillColor("#0f172a").text(texts[index], x + 4, y + 6, {
        width: Math.max(20, widths[index] - 8),
        height: rowHeight - 8,
        align: column.align ?? "left",
        ellipsis: true,
      });
      if (index > 0) document.strokeColor("#cbd5e1").moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      x += widths[index];
    });
    y += rowHeight;
    rowIndex += 1;
  };

  drawHeader();
  if (rows.length === 0) {
    const emptyRow = columns.map((_, index) => index === 0 ? (options.emptyLabel ?? "Nenhum registo encontrado.") : "");
    drawDataRow(emptyRow);
  } else {
    rows.forEach(drawDataRow);
  }
  return y;
}
