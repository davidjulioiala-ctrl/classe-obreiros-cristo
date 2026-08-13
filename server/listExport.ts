import PDFDocument from "pdfkit";

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

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function generateCsv(headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function generateMembersCsv(members: ExportMember[]) {
  return generateCsv(
    ["ID", "Nome", "Sexo", "Data de nascimento", "Idade", "Cargo", "Grupo ID", "Convidado", "Estado", "Telefone Orange", "Telefone Telecel", "Email"],
    members.map((member) => [
      member.id,
      member.name,
      member.sex === "M" ? "Masculino" : "Feminino",
      displayDate(member.birthDate),
      calculateAge(member.birthDate),
      member.position || "Sem cargo",
      member.groupId ?? "",
      member.isGuest ? "Sim" : "Não",
      member.isActive ? "Ativo" : "Inativo",
      member.phoneOrange || "",
      member.phoneTelecel || "",
      member.email || "",
    ])
  );
}

export function generateReportsCsv(reports: ExportReport[]) {
  return generateCsv(
    ["ID", "Tipo", "Actividade ID", "Data de criação", "Conteúdo"],
    reports.map((report) => [
      report.id,
      report.type === "ata" ? "Ata de actividade" : "Relatório",
      report.activityId,
      displayDateTime(report.createdAt),
      report.content || "",
    ])
  );
}

function createPdf(title: string) {
  const document = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  document.fontSize(18).fillColor("#064e3b").text(title, { align: "center" });
  document.moveDown(0.35).fontSize(9).fillColor("#64748b").text(`Gerado em ${displayDateTime(new Date())}`, { align: "center" });
  document.moveDown(1);
  return { document, chunks };
}

export function generateMembersPdf(members: ExportMember[], search = "") {
  const { document, chunks } = createPdf("Lista de membros");
  document.fontSize(10).fillColor("#334155").text(search ? `Pesquisa: ${search}` : "Todos os membros activos");
  document.moveDown(0.6);
  for (const member of members) {
    document.fontSize(10).fillColor("#0f172a").text(`#${member.id} · ${member.name}`);
    document.fontSize(8).fillColor("#475569").text(
      `${member.position || "Sem cargo"} · ${member.sex === "M" ? "Masculino" : "Feminino"} · ${calculateAge(member.birthDate)} anos · Grupo #${member.groupId ?? "—"} · ${member.isActive ? "Activo" : "Inactivo"}${member.isGuest ? " · Convidado" : ""}`
    );
    document.moveDown(0.45);
  }
  if (members.length === 0) document.fontSize(10).fillColor("#64748b").text("Nenhum membro encontrado.");
  document.fontSize(8).fillColor("#64748b").text("Classe Obreiros de Cristo — exportação protegida pelo sistema", { align: "center" });
  document.end();
  return new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
}

export function generateReportsPdf(reports: ExportReport[]) {
  const { document, chunks } = createPdf("Lista de relatórios e atas");
  for (const report of reports) {
    document.fontSize(11).fillColor("#0f172a").text(`#${report.id} · ${report.type === "ata" ? "Ata de actividade" : "Relatório"}`);
    document.fontSize(8).fillColor("#475569").text(`Actividade #${report.activityId} · ${displayDateTime(report.createdAt)}`);
    document.moveDown(0.3).fontSize(9).fillColor("#334155").text(report.content || "Sem conteúdo registado.", { lineGap: 3 });
    document.moveDown(0.8);
  }
  if (reports.length === 0) document.fontSize(10).fillColor("#64748b").text("Ainda não existem relatórios.");
  document.fontSize(8).fillColor("#64748b").text("Classe Obreiros de Cristo — exportação protegida pelo sistema", { align: "center" });
  document.end();
  return new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
}
