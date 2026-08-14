import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { drawPdfHeader, loadPdfBranding, pdfFooterText } from "./pdfBranding";
import { drawPdfTable, type PdfTableColumn } from "./pdfTable";
import {
  MEMBER_EXPORT_COLUMN_KEYS,
  MEMBER_EXPORT_COLUMNS,
  REPORT_EXPORT_COLUMN_KEYS,
  REPORT_EXPORT_COLUMNS,
  type MemberExportColumn,
  type ReportExportColumn,
  PERSONAL_MEMBER_EXPORT_COLUMNS,
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

const memberPdfWeights: Record<MemberExportColumn, number> = {
  id: 0.55,
  name: 2.2,
  sex: 0.85,
  birthDate: 1.2,
  age: 0.55,
  position: 1.45,
  groupId: 0.75,
  isGuest: 0.8,
  isActive: 0.85,
  phoneOrange: 1.1,
  phoneTelecel: 1.1,
  email: 1.7,
};

const reportPdfWeights: Record<ReportExportColumn, number> = {
  id: 0.55,
  type: 1.25,
  activityId: 0.9,
  createdAt: 1.35,
  content: 4.2,
};

export function sanitizeMemberExportColumns(columns: MemberExportColumn[], includePersonalData: boolean) {
  if (includePersonalData) return columns;
  return columns.filter((column) => !PERSONAL_MEMBER_EXPORT_COLUMNS.includes(column as (typeof PERSONAL_MEMBER_EXPORT_COLUMNS)[number]));
}

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

function applyWorksheetTableFormatting(worksheet: XLSX.WorkSheet, rows: unknown[][], columnCount: number, widths: number[]) {
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(Math.max(0, columnCount - 1))}${Math.max(rows.length, 1)}` };
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
  if (rows.length > 0) {
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"] ?? `A1:${XLSX.utils.encode_col(Math.max(0, columnCount - 1))}1`);
    headerRange.s.r = 0;
    headerRange.e.r = 0;
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range(XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1")) };
  }
}

export function generateMembersExcel(members: ExportMember[], columns: MemberExportColumn[] = MEMBER_EXPORT_COLUMN_KEYS) {
  const rows = [
    columns.map((column) => memberLabels[column]),
    ...members.map((member) => columns.map((column) => memberValue(member, column))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  applyWorksheetTableFormatting(worksheet, rows, columns.length, columns.map((column) => column === "name" || column === "email" ? 30 : 18));
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

export function generateReportsExcel(reports: ExportReport[], columns: ReportExportColumn[] = REPORT_EXPORT_COLUMN_KEYS) {
  const rows = [
    columns.map((column) => reportLabels[column]),
    ...reports.map((report) => columns.map((column) => reportValue(report, column))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  applyWorksheetTableFormatting(worksheet, rows, columns.length, columns.map((column) => column === "content" ? 60 : column === "type" ? 22 : 18));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatórios");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function createPdf(title: string, landscape: boolean) {
  const document = new PDFDocument({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 42 });
  const chunks: Buffer[] = [];
  const branding = await loadPdfBranding();
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  drawPdfHeader(document, branding, title, { landscape });
  document.fontSize(9).fillColor("#64748b").text(`Gerado em ${displayDateTime(new Date())}`, { align: "center" });
  document.moveDown(1);
  return { document, chunks, branding };
}

function finishPdf(document: InstanceType<typeof PDFDocument>, chunks: Buffer[], branding: Awaited<ReturnType<typeof loadPdfBranding>>) {
  document.moveDown(0.8);
  document.font("Helvetica").fontSize(8).fillColor("#64748b").text(pdfFooterText(branding, "exportação protegida pelo sistema"), { align: "center" });
  const result = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  document.end();
  return result;
}

export async function generateMembersPdf(members: ExportMember[], search = "", columns: MemberExportColumn[] = MEMBER_EXPORT_COLUMN_KEYS) {
  const landscape = columns.length > 6;
  const { document, chunks, branding } = await createPdf("Lista de membros", landscape);
  document.font("Helvetica").fontSize(10).fillColor("#334155").text(search ? `Pesquisa: ${search}` : "Todos os membros activos");
  document.moveDown(0.6);
  const tableColumns: PdfTableColumn[] = columns.map((column) => ({ title: memberLabels[column], weight: memberPdfWeights[column], align: column === "id" || column === "age" || column === "groupId" ? "center" : column === "isActive" || column === "isGuest" ? "center" : "left" }));
  drawPdfTable(document, branding, "Lista de membros", tableColumns, members.map((member) => columns.map((column) => memberValue(member, column))), { landscape, emptyLabel: "Nenhum membro encontrado." });
  return finishPdf(document, chunks, branding);
}

export async function generateReportsPdf(reports: ExportReport[], columns: ReportExportColumn[] = REPORT_EXPORT_COLUMN_KEYS) {
  const landscape = columns.includes("content");
  const { document, chunks, branding } = await createPdf("Lista de relatórios e atas", landscape);
  const tableColumns: PdfTableColumn[] = columns.map((column) => ({ title: reportLabels[column], weight: reportPdfWeights[column], align: column === "id" || column === "activityId" ? "center" : "left" }));
  drawPdfTable(document, branding, "Lista de relatórios e atas", tableColumns, reports.map((report) => columns.map((column) => reportValue(report, column))), { landscape, emptyLabel: "Ainda não existem relatórios." });
  return finishPdf(document, chunks, branding);
}
