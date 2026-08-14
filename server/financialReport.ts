import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";
import { drawPdfTable, type PdfTableColumn } from "./pdfTable";

export type FinancialReportPayload = {
  startDate: string;
  endDate: string;
  includePersonalData?: boolean;
  quotas: Array<{ id?: number; memberId: number; month: number; year: number; amount: string | number; isPaid: boolean; responsible?: string | null }>;
  otherIncome: Array<{ id?: number; description: string; amount: string | number; date: Date | string; responsible?: string | null }>;
  expenses: Array<{ id?: number; designation: string; quantity: number; unitPrice: string | number; totalPrice: string | number; date: Date | string; responsible?: string | null }>;
};

function money(value: number) {
  return `${value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XOF`;
}

function dateValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString("pt-PT");
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function generateRows(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export function summarizeFinancialReport(payload: FinancialReportPayload) {
  const quotasPaid = payload.quotas.filter((quota) => quota.isPaid);
  const quotaTotal = quotasPaid.reduce((total, quota) => total + Number(quota.amount), 0);
  const incomeTotal = payload.otherIncome.reduce((total, income) => total + Number(income.amount), 0);
  const expenseTotal = payload.expenses.reduce((total, expense) => total + Number(expense.totalPrice), 0);
  return { quotaTotal, incomeTotal, expenseTotal, balance: quotaTotal + incomeTotal - expenseTotal, quotaCount: quotasPaid.length, incomeCount: payload.otherIncome.length, expenseCount: payload.expenses.length };
}

function financialTableColumns(showPersonal: boolean): PdfTableColumn[] {
  return [
    { title: "ID", weight: 0.55, align: "center" },
    { title: "Data/período", weight: 1.15, align: "left" },
    { title: "Descrição", weight: 2.5, align: "left" },
    { title: "Quantidade", weight: 0.85, align: "center" },
    { title: "Preço unitário", weight: 1.15, align: "right" },
    { title: "Valor", weight: 1.15, align: "right" },
    { title: "Estado", weight: 0.85, align: "center" },
    ...(showPersonal ? [{ title: "Responsável", weight: 1.5, align: "left" as const }] : []),
  ];
}

function quotaRows(payload: FinancialReportPayload, showPersonal: boolean) {
  return payload.quotas.filter((quota) => quota.isPaid).map((quota) => [
    quota.id ?? quota.memberId,
    `${String(quota.month).padStart(2, "0")}/${quota.year}`,
    `Quota do membro #${quota.memberId}`,
    "1",
    money(Number(quota.amount)),
    money(Number(quota.amount)),
    "Pago",
    ...(showPersonal ? [quota.responsible || ""] : []),
  ]);
}

function incomeRows(payload: FinancialReportPayload, showPersonal: boolean) {
  return payload.otherIncome.map((income) => [
    income.id ?? "",
    dateValue(income.date),
    income.description,
    "1",
    money(Number(income.amount)),
    money(Number(income.amount)),
    "Receita",
    ...(showPersonal ? [income.responsible || ""] : []),
  ]);
}

function expenseRows(payload: FinancialReportPayload, showPersonal: boolean) {
  return payload.expenses.map((expense) => [
    expense.id ?? "",
    dateValue(expense.date),
    expense.designation,
    expense.quantity,
    money(Number(expense.unitPrice)),
    money(Number(expense.totalPrice)),
    "Despesa",
    ...(showPersonal ? [expense.responsible || ""] : []),
  ]);
}

export async function generateFinancialPdf(payload: FinancialReportPayload) {
  const totals = summarizeFinancialReport(payload);
  const branding = await loadPdfBranding();
  const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  drawPdfHeader(document, branding, "RELATÓRIO FINANCEIRO", { landscape: true });
  document.font("Helvetica").fontSize(10).fillColor("#334155").text(`Período: ${payload.startDate} a ${payload.endDate}`, { align: "center" });
  document.moveDown(0.8);

  const summaryColumns: PdfTableColumn[] = [
    { title: "Indicador", weight: 2.4 },
    { title: "Quantidade", weight: 1, align: "center" },
    { title: "Total", weight: 1.6, align: "right" },
  ];
  drawPdfTable(document, branding, "RELATÓRIO FINANCEIRO", summaryColumns, [
    ["Cotas pagas", totals.quotaCount, money(totals.quotaTotal)],
    ["Outras receitas", totals.incomeCount, money(totals.incomeTotal)],
    ["Despesas", totals.expenseCount, money(totals.expenseTotal)],
    ["Saldo", "", money(totals.balance)],
  ], { landscape: true, emptyLabel: "Sem resumo financeiro." });

  const showPersonal = payload.includePersonalData !== false;
  const columns = financialTableColumns(showPersonal);
  document.moveDown(0.8).font("Helvetica-Bold").fontSize(10).fillColor("#047857").text("COTAS PAGAS");
  drawPdfTable(document, branding, "RELATÓRIO FINANCEIRO", columns, quotaRows(payload, showPersonal), { landscape: true, emptyLabel: "Não existem quotas pagas no período." });
  document.moveDown(0.8).font("Helvetica-Bold").fontSize(10).fillColor("#047857").text("OUTRAS RECEITAS");
  drawPdfTable(document, branding, "RELATÓRIO FINANCEIRO", columns, incomeRows(payload, showPersonal), { landscape: true, emptyLabel: "Não existem outras receitas no período." });
  document.moveDown(0.8).font("Helvetica-Bold").fontSize(10).fillColor("#b91c1c").text("DESPESAS");
  drawPdfTable(document, branding, "RELATÓRIO FINANCEIRO", columns, expenseRows(payload, showPersonal), { landscape: true, emptyLabel: "Não existem despesas no período." });

  document.moveDown(0.8).font("Helvetica").fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "documento gerado pelo sistema"), { align: "center" });
  const result = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  document.end();
  return result;
}

function formatWorksheet(worksheet: XLSX.WorkSheet, widths: number[]) {
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  if (worksheet["!ref"]) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
}

export function generateFinancialExcel(payload: FinancialReportPayload) {
  const totals = summarizeFinancialReport(payload);
  const workbook = XLSX.utils.book_new();
  const summaryRows = [
    ["Indicador", "Quantidade", "Total"],
    ["Período", "", `${payload.startDate} a ${payload.endDate}`],
    ["Cotas pagas", totals.quotaCount, totals.quotaTotal],
    ["Outras receitas", totals.incomeCount, totals.incomeTotal],
    ["Despesas", totals.expenseCount, totals.expenseTotal],
    ["Saldo", "", totals.balance],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  formatWorksheet(summarySheet, [28, 14, 24]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const showPersonal = payload.includePersonalData !== false;
  const quotaHeaders = ["ID", "Membro ID", "Mês", "Ano", "Valor", "Estado", ...(showPersonal ? ["Responsável"] : [])];
  const quotaSheet = XLSX.utils.aoa_to_sheet([quotaHeaders, ...payload.quotas.filter((quota) => quota.isPaid).map((quota) => [quota.id ?? quota.memberId, quota.memberId, quota.month, quota.year, Number(quota.amount), "Pago", ...(showPersonal ? [quota.responsible || ""] : [])])]);
  formatWorksheet(quotaSheet, [12, 14, 10, 10, 16, 14, 24]);
  XLSX.utils.book_append_sheet(workbook, quotaSheet, "Cotas");

  const incomeHeaders = ["ID", "Data", "Descrição", "Valor", ...(showPersonal ? ["Responsável"] : [])];
  const incomeSheet = XLSX.utils.aoa_to_sheet([incomeHeaders, ...payload.otherIncome.map((income) => [income.id ?? "", dateValue(income.date), income.description, Number(income.amount), ...(showPersonal ? [income.responsible || ""] : [])])]);
  formatWorksheet(incomeSheet, [12, 14, 42, 16, 24]);
  XLSX.utils.book_append_sheet(workbook, incomeSheet, "Outras receitas");

  const expenseHeaders = ["ID", "Data", "Designação", "Quantidade", "Preço unitário", "Total", ...(showPersonal ? ["Responsável"] : [])];
  const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...payload.expenses.map((expense) => [expense.id ?? "", dateValue(expense.date), expense.designation, expense.quantity, Number(expense.unitPrice), Number(expense.totalPrice), ...(showPersonal ? [expense.responsible || ""] : [])])]);
  formatWorksheet(expenseSheet, [12, 14, 42, 14, 18, 18, 24]);
  XLSX.utils.book_append_sheet(workbook, expenseSheet, "Despesas");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function generateFinancialCsv(payload: FinancialReportPayload) {
  const totals = summarizeFinancialReport(payload);
  const showPersonal = payload.includePersonalData !== false;
  const headers = ["Tipo", "ID", "Membro ID", "Data/período", "Descrição", "Quantidade", "Preço unitário", "Valor", "Estado", ...(showPersonal ? ["Responsável"] : [])];
  const rows: unknown[][] = [
    ["Resumo", "", "", `${payload.startDate} a ${payload.endDate}`, "Cotas pagas", totals.quotaCount, "", totals.quotaTotal, "", ...(showPersonal ? [""] : [])],
    ["Resumo", "", "", `${payload.startDate} a ${payload.endDate}`, "Outras receitas", totals.incomeCount, "", totals.incomeTotal, "", ...(showPersonal ? [""] : [])],
    ["Resumo", "", "", `${payload.startDate} a ${payload.endDate}`, "Despesas", totals.expenseCount, "", totals.expenseTotal, "", ...(showPersonal ? [""] : [])],
    ["Resumo", "", "", `${payload.startDate} a ${payload.endDate}`, "Saldo", "", "", totals.balance, "", ...(showPersonal ? [""] : [])],
    ...payload.quotas.filter((quota) => quota.isPaid).map((quota) => ["Quota", quota.id ?? "", quota.memberId, `${String(quota.month).padStart(2, "0")}/${quota.year}`, "Quota", 1, Number(quota.amount), Number(quota.amount), "Pago", ...(showPersonal ? [quota.responsible || ""] : [])]),
    ...payload.otherIncome.map((income) => ["Outra receita", income.id ?? "", "", dateValue(income.date), income.description, 1, Number(income.amount), Number(income.amount), "Receita", ...(showPersonal ? [income.responsible || ""] : [])]),
    ...payload.expenses.map((expense) => ["Despesa", expense.id ?? "", "", dateValue(expense.date), expense.designation, expense.quantity, Number(expense.unitPrice), Number(expense.totalPrice), "Despesa", ...(showPersonal ? [expense.responsible || ""] : [])]),
  ];
  return `\uFEFF${generateRows(headers, rows)}\r\n`;
}
