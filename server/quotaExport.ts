import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";
import { drawPdfTable, type PdfTableColumn } from "./pdfTable";

export type ExportQuotaItem = {
  id: number;
  memberId: number;
  memberName: string;
  groupId?: number | null;
  year: number;
  month: number;
  amount: string | number;
  isPaid: boolean;
  responsibleName: string | null;
};

export type QuotaExportFilters = {
  year: number;
  month?: number;
  memberId?: number;
  groupId?: number;
  memberQuery?: string;
};

export function filterQuotaExportItems(items: ExportQuotaItem[], filters: QuotaExportFilters) {
  const memberQuery = String(filters.memberQuery ?? "").trim().toLocaleLowerCase("pt-PT");
  return items.filter((item) => {
    const matchesQuery = !memberQuery || String(item.memberId) === memberQuery || item.memberName.toLocaleLowerCase("pt-PT").includes(memberQuery);
    return item.isPaid && item.year === filters.year && (filters.month === undefined || item.month === filters.month) && (filters.memberId === undefined || item.memberId === filters.memberId) && (filters.groupId === undefined || item.groupId === filters.groupId) && matchesQuery;
  });
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const QUOTA_COLUMNS = ["ID", "Nome", "Ano", "Mês pagos", "Valor", "Responsável"];
const QUOTA_PDF_WEIGHTS = [0.6, 2.4, 0.8, 1.4, 1.0, 1.6];

function formatAmount(amount: string | number) {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (Number.isNaN(num)) return "0,00 AOA";
  return num.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " AOA";
}

function getRowsForMonth(items: ExportQuotaItem[], month: number, includePersonalData: boolean) {
  return items
    .filter((item) => item.month === month && item.isPaid)
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((item) => [
      item.memberId,
      includePersonalData ? item.memberName : "Membro Protegido",
      item.year,
      MONTH_NAMES[month - 1] || String(month),
      formatAmount(item.amount),
      includePersonalData ? (item.responsibleName || "—") : "—",
    ]);
}

export function generateQuotasCsv(items: ExportQuotaItem[], includePersonalData = true): string {
  const allRows: (string | number)[][] = [QUOTA_COLUMNS];
  for (let m = 1; m <= 12; m++) {
    const monthRows = getRowsForMonth(items, m, includePersonalData);
    if (monthRows.length > 0) {
      allRows.push([`=== MÊS: ${MONTH_NAMES[m - 1].toUpperCase()} ===`, "", "", "", "", ""]);
      allRows.push(...monthRows);
    }
  }
  const bom = "\ufeff";
  const csvContent = allRows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          if (str.includes(";") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(";")
    )
    .join("\r\n");
  return bom + csvContent;
}

export function generateQuotasExcel(items: ExportQuotaItem[], includePersonalData = true): Buffer {
  const workbook = XLSX.utils.book_new();

  for (let m = 1; m <= 12; m++) {
    const monthRows = getRowsForMonth(items, m, includePersonalData);
    const sheetData = [QUOTA_COLUMNS, ...monthRows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, MONTH_NAMES[m - 1]);
  }

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(out);
}

async function createQuotaPdf(title: string, landscape: boolean) {
  const document = new PDFDocument({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 42 });
  const chunks: Buffer[] = [];
  const branding = await loadPdfBranding();
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  drawPdfHeader(document, branding, title, { landscape });
  document.fontSize(9).fillColor("#64748b").text(`Relatório Mensal de Quotas`, { align: "center" });
  document.moveDown(1);
  return { document, chunks, branding };
}

function finishQuotaPdf(document: InstanceType<typeof PDFDocument>, chunks: Buffer[], branding: Awaited<ReturnType<typeof loadPdfBranding>>) {
  document.moveDown(0.8);
  document.font("Helvetica").fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "relatório protegido de quotas"), { align: "center" });
  const result = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  document.end();
  return result;
}

export async function generateQuotasPdf(items: ExportQuotaItem[], includePersonalData = true): Promise<Buffer> {
  const landscape = true;
  const { document, chunks, branding } = await createQuotaPdf("Relatório de Quotas Mensais", landscape);

  const tableColumns: PdfTableColumn[] = QUOTA_COLUMNS.map((title, idx) => ({
    title,
    weight: QUOTA_PDF_WEIGHTS[idx],
    align: idx === 0 || idx === 2 ? "center" : idx === 4 ? "right" : "left",
  }));

  for (let m = 1; m <= 12; m++) {
    if (m > 1) {
      document.addPage({ size: "A4", layout: "landscape", margin: 40 });
    }

    document.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text(`Mês: ${MONTH_NAMES[m - 1]}`);
    document.moveDown(0.4);

    const monthRows = getRowsForMonth(items, m, includePersonalData);
    drawPdfTable(
      document,
      branding,
      `Quotas — ${MONTH_NAMES[m - 1]}`,
      tableColumns,
      monthRows,
      { landscape, emptyLabel: `Nenhum pagamento registado em ${MONTH_NAMES[m - 1]}.` }
    );
  }

  return finishQuotaPdf(document, chunks, branding);
}
