import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";

export type FinancialReportPayload = {
  startDate: string;
  endDate: string;
  quotas: Array<{ memberId: number; month: number; year: number; amount: string | number; isPaid: boolean }>;
  otherIncome: Array<{ description: string; amount: string | number; date: Date | string }>;
  expenses: Array<{ designation: string; quantity: number; unitPrice: string | number; totalPrice: string | number; date: Date | string }>;
};

function money(value: number) {
  return `${value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XOF`;
}

export function summarizeFinancialReport(payload: FinancialReportPayload) {
  const quotasPaid = payload.quotas.filter((quota) => quota.isPaid);
  const quotaTotal = quotasPaid.reduce((total, quota) => total + Number(quota.amount), 0);
  const incomeTotal = payload.otherIncome.reduce((total, income) => total + Number(income.amount), 0);
  const expenseTotal = payload.expenses.reduce((total, expense) => total + Number(expense.totalPrice), 0);
  return { quotaTotal, incomeTotal, expenseTotal, balance: quotaTotal + incomeTotal - expenseTotal, quotaCount: quotasPaid.length, incomeCount: payload.otherIncome.length, expenseCount: payload.expenses.length };
}

export async function generateFinancialPdf(payload: FinancialReportPayload) {
  const totals = summarizeFinancialReport(payload);
  const branding = await loadPdfBranding();
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  drawPdfHeader(doc, branding, "RELATÓRIO FINANCEIRO", { landscape: true });
  doc.moveDown(0.4).fontSize(10).fillColor("#334155").text(`Período: ${payload.startDate} a ${payload.endDate}`, { align: "center" });
  doc.moveDown(1);
  const summary = [
    ["Cotas pagas", money(totals.quotaTotal)],
    ["Outras receitas", money(totals.incomeTotal)],
    ["Despesas", money(totals.expenseTotal)],
    ["Saldo", money(totals.balance)],
  ];
  let x = 36;
  for (const [label, value] of summary) {
    doc.roundedRect(x, 150, 175, 52, 6).fillAndStroke(label === "Saldo" ? "#dcfce7" : "#f8fafc", "#cbd5e1");
    doc.fillColor("#475569").fontSize(9).text(label, x + 10, 162);
    doc.fillColor(label === "Despesas" ? "#b91c1c" : label === "Saldo" ? "#047857" : "#0f172a").fontSize(13).text(value, x + 10, 178);
    x += 185;
  }
  let y = 235;
  const line = (text: string, color = "#0f172a") => { doc.fillColor(color).fontSize(9).text(text, 36, y, { width: 760 }); y += 15; };
  line("COTAS PAGAS", "#047857");
  for (const quota of payload.quotas.filter((item) => item.isPaid)) line(`Membro #${quota.memberId} · ${String(quota.month).padStart(2, "0")}/${quota.year} · ${money(Number(quota.amount))}`);
  y += 6;
  line("OUTRAS RECEITAS", "#047857");
  for (const income of payload.otherIncome) line(`${String(income.date).slice(0, 10)} · ${income.description} · ${money(Number(income.amount))}`);
  y += 6;
  line("DESPESAS", "#b91c1c");
  for (const expense of payload.expenses) line(`${String(expense.date).slice(0, 10)} · ${expense.designation} · ${expense.quantity} × ${money(Number(expense.unitPrice))} = ${money(Number(expense.totalPrice))}`);
  doc.fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "documento gerado pelo sistema"), 36, 560, { width: 760, align: "center" });
  doc.end();
  return new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
}

export function generateFinancialExcel(payload: FinancialReportPayload) {
  const totals = summarizeFinancialReport(payload);
  const workbook = XLSX.utils.book_new();
  const summaryRows = [
    { Indicador: "Período inicial", Valor: payload.startDate },
    { Indicador: "Período final", Valor: payload.endDate },
    { Indicador: "Cotas pagas", Valor: totals.quotaTotal },
    { Indicador: "Outras receitas", Valor: totals.incomeTotal },
    { Indicador: "Despesas", Valor: totals.expenseTotal },
    { Indicador: "Saldo", Valor: totals.balance },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumo");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.quotas.filter((quota) => quota.isPaid).map((quota) => ({ Membro: quota.memberId, Mes: quota.month, Ano: quota.year, Valor: Number(quota.amount), Estado: "Pago" }))), "Cotas");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.otherIncome.map((income) => ({ Data: String(income.date).slice(0, 10), Descrição: income.description, Valor: Number(income.amount) }))), "Outras receitas");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.expenses.map((expense) => ({ Data: String(expense.date).slice(0, 10), Designação: expense.designation, Quantidade: expense.quantity, Preço_unitário: Number(expense.unitPrice), Total: Number(expense.totalPrice) }))), "Despesas");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
