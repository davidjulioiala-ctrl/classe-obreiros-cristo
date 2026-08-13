import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";
import {
  MEMBER_EXPORT_COLUMN_KEYS,
  MEMBER_EXPORT_COLUMNS,
  REPORT_EXPORT_COLUMN_KEYS,
  REPORT_EXPORT_COLUMNS,
  type MemberExportColumn,
  type ReportExportColumn,
} from "../shared/exportColumns";

type ExportMember = {
  id: number;
  name: string;
  sex: string;
  birthDate: Date | string | null;
  position: string | null;
  groupId: number | null;
  isGuest: boolean;
  isActive: boolean;
  phoneOrange: string | null;
  phoneTelecel: string | null;
  email: string | null;
};

type ExportReport = {
  id: number;
  activityId: number;
  type: "ata" | "relatorio" | string;
  content: string | null;
  createdAt: Date | string;
};

const memberLabels = Object.fromEntries(MEMBER_EXPORT_COLUMNS.map((column) => [column.key, column.label])) as Record<MemberExportColumn, string>;
const reportLabels = Object.fromEntries(REPORT_EXPORT_COLUMNS.map((column) => [column.key, column.label])) as Record<ReportExportColumn, string>;

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString("pt-PT");
}

function displayDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-PT");
}

function calculateAge(value: Date | string | null) {
  if (!value) return "—";
  const birth = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : "—";
}

function memberValue(member: ExportMember, column: MemberExportColumn): string | number {
  switch (column) {
    case "id": return member.id;
    case "name": return member.name;
    case "sex": return member.sex === "M" ? "Masculino" : "Feminino";
    case "birthDate": return displayDate(member.birthDate);
    case "age": return calculateAge(member.birthDate);
    case "position": return member.position || "Sem cargo";
    case "groupId": return member.groupId ?? "";
    case "isGuest": return member.isGuest ? "Sim" : "Não";
    case "isActive": return member.isActive ? "Ativo" : "Inativo";
    case "phoneOrange": return member.phoneOrange || "";
    case "phoneTelecel": return member.phoneTelecel || "";
    case "email": return member.email || "";
  }
}

function reportValue(report: ExportReport, column: ReportExportColumn): string | number {
  switch (column) {
    case "id": return report.id;
    case "type": return report.type === "ata" ? "Ata de actividade" : "Relatório";
    case "activityId": return report.activityId;
    case "createdAt": return displayDateTime(report.createdAt);
    case "content": return report.content || "";
  }
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function generateCsv(headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function generateMembersCsv(members: ExportMember[], columns: MemberExportColumn[] = MEMBER_EXPORT_COLUMN_KEYS) {
  return generateCsv(
    columns.map((column) => memberLabels[column]),
    members.map((member) => columns.map((column) => memberValue(member, column)))
  );
}

export function generateMembersExcel(members: ExportMember[], columns: MemberExportColumn[] = MEMBER_EXPORT_COLUMN_KEYS) {
  const rows = [
    columns.map((column) => memberLabels[column]),
    ...members.map((member) => columns.map((column) => memberValue(member, column))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(columns.length - 1)}${Math.max(rows.length, 1)}` };
  worksheet["!cols"] = columns.map((column) => ({ wch: column === "name" || column === "email" ? 30 : 18 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Membros");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function generateReportsCsv(reports: ExportReport[], columns: ReportExportColumn[] = REPORT_EXPORT_COLUMN_KEYS) {
  return generateCsv(
    columns.map((column) => reportLabels[column]),
    reports.map((report) => columns.map((column) => reportValue(report, column)))
  );
}

async function createPdf(title: string) {
  const document = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  const branding = await loadPdfBranding();
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  drawPdfHeader(document, branding, title);
  document.fontSize(9).fillColor("#64748b").text(`Gerado em ${displayDateTime(new Date())}`, { align: "center" });
  document.moveDown(1);
  return { document, chunks, branding };
}

export async function generateMembersPdf(members: ExportMember[], search = "", columns: MemberExportColumn[] = MEMBER_EXPORT_COLUMN_KEYS) {
  const { document, chunks, branding } = await createPdf("Lista de membros");
  document.fontSize(10).fillColor("#334155").text(search ? `Pesquisa: ${search}` : "Todos os membros activos");
  document.moveDown(0.6);
  for (const member of members) {
    const values = columns.map((column) => `${memberLabels[column]}: ${memberValue(member, column)}`);
    document.fontSize(9).fillColor("#0f172a").text(values.join(" · "), { lineGap: 2 });
    document.moveDown(0.45);
  }
  if (members.length === 0) document.fontSize(10).fillColor("#64748b").text("Nenhum membro encontrado.");
  document.fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "exportação protegida pelo sistema"), { align: "center" });
  const result = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  document.end();
  return result;
}

export async function generateReportsPdf(reports: ExportReport[], columns: ReportExportColumn[] = REPORT_EXPORT_COLUMN_KEYS) {
  const { document, chunks, branding } = await createPdf("Lista de relatórios e atas");
  for (const report of reports) {
    const values = columns.map((column) => `${reportLabels[column]}: ${reportValue(report, column)}`);
    document.fontSize(9).fillColor("#0f172a").text(values.join(" · "), { lineGap: 3 });
    document.moveDown(0.8);
  }
  if (reports.length === 0) document.fontSize(10).fillColor("#64748b").text("Ainda não existem relatórios.");
  document.fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "exportação protegida pelo sistema"), { align: "center" });
  const result = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  document.end();
  return result;
}
