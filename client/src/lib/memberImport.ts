import * as XLSX from "xlsx";

export type ImportGroup = { id: number; name: string };
export type ImportExistingMember = { id: number; name: string; email?: string | null };

export type MemberImportRow = {
  sourceRow: number;
  name: string;
  sex: "M" | "F" | "";
  birthDate?: string;
  father?: string;
  mother?: string;
  nationality?: string;
  region?: string;
  residence?: string;
  phoneOrange?: string;
  phoneTelecel?: string;
  email?: string;
  position?: string;
  leaderRole?: string;
  louvorRole?: string;
  isGuest: boolean;
  groupId?: number;
  groupName?: string;
  errors: string[];
};

export const MEMBER_IMPORT_COLUMNS = [
  { key: "name", label: "Nome", required: true },
  { key: "sex", label: "Sexo (M/F)", required: true },
  { key: "birthDate", label: "Data de nascimento (AAAA-MM-DD)", required: false },
  { key: "father", label: "Nome do pai", required: false },
  { key: "mother", label: "Nome da mãe", required: false },
  { key: "nationality", label: "Nacionalidade", required: false },
  { key: "region", label: "Região", required: false },
  { key: "residence", label: "Residência", required: false },
  { key: "phoneOrange", label: "Telefone Orange", required: false },
  { key: "phoneTelecel", label: "Telefone Telecel", required: false },
  { key: "email", label: "Email", required: false },
  { key: "position", label: "Cargo eclesiástico", required: false },
  { key: "leaderRole", label: "Função de líder", required: false },
  { key: "louvorRole", label: "Função no louvor", required: false },
  { key: "isGuest", label: "Convidado (sim/não)", required: false },
  { key: "group", label: "Grupo ou ID do grupo", required: false },
] as const;

const HEADER_ALIASES: Record<string, keyof MemberImportRow | "group"> = {
  nome: "name",
  name: "name",
  sexo: "sex",
  sexomf: "sex",
  genero: "sex",
  género: "sex",
  nascimento: "birthDate",
  datadenascimento: "birthDate",
  birthdate: "birthDate",
  pai: "father",
  nomedopai: "father",
  father: "father",
  mae: "mother",
  mãe: "mother",
  nomedamae: "mother",
  nomedamãe: "mother",
  mother: "mother",
  nacionalidade: "nationality",
  nationality: "nationality",
  regiao: "region",
  região: "region",
  region: "region",
  residencia: "residence",
  residência: "residence",
  residence: "residence",
  telefoneorange: "phoneOrange",
  phoneorange: "phoneOrange",
  orange: "phoneOrange",
  telefonetelecel: "phoneTelecel",
  phonetelecel: "phoneTelecel",
  telecel: "phoneTelecel",
  email: "email",
  correioeletronico: "email",
  correioeletrónico: "email",
  cargo: "position",
  cargoeclesiastico: "position",
  cargoeclesiástico: "position",
  position: "position",
  funcaodelider: "leaderRole",
  funçãodelíder: "leaderRole",
  leaderrole: "leaderRole",
  funcaonolouvor: "louvorRole",
  funçãonolouvor: "louvorRole",
  louvorrole: "louvorRole",
  convidado: "isGuest",
  isguest: "isGuest",
  grupo: "group",
  group: "group",
  grupoid: "group",
  iddogrupo: "group",
};

export function normaliseMemberImportHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normaliseName(value: string) {
  return value.trim().toLocaleLowerCase("pt-PT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y.toString().padStart(4, "0")}-${parsed.m.toString().padStart(2, "0")}-${parsed.d.toString().padStart(2, "0")}`;
  }
  const raw = text(value);
  if (!raw) return undefined;
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const european = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(raw);
  if (european) return `${european[3]}-${european[2].padStart(2, "0")}-${european[1].padStart(2, "0")}`;
  return raw;
}

function parseSex(value: unknown) {
  const raw = normaliseName(text(value));
  if (["m", "masculino", "homem"].includes(raw)) return "M" as const;
  if (["f", "feminino", "mulher"].includes(raw)) return "F" as const;
  return "" as const;
}

function parseBoolean(value: unknown) {
  const raw = normaliseName(text(value));
  return ["sim", "s", "yes", "y", "true", "1", "convidado", "convidada"].includes(raw);
}

function resolveGroup(value: unknown, groups: ImportGroup[]) {
  const raw = text(value);
  if (!raw) return { groupId: undefined, groupName: undefined };
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0) {
    const match = groups.find((group) => group.id === numeric);
    return match ? { groupId: match.id, groupName: match.name } : { groupId: undefined, groupName: raw };
  }
  const match = groups.find((group) => normaliseName(group.name) === normaliseName(raw));
  return match ? { groupId: match.id, groupName: match.name } : { groupId: undefined, groupName: raw };
}

function validDate(value?: string) {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date();
}

function toRow(raw: Record<string, unknown>, sourceRow: number, groups: ImportGroup[]): MemberImportRow {
  const values: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_ALIASES[normaliseMemberImportHeader(header)];
    if (key) values[key] = value;
  }
  const name = text(values.name);
  const sex = parseSex(values.sex);
  const birthDate = parseDate(values.birthDate);
  const group = resolveGroup(values.group, groups);
  const row: MemberImportRow = {
    sourceRow,
    name,
    sex,
    birthDate,
    father: text(values.father) || undefined,
    mother: text(values.mother) || undefined,
    nationality: text(values.nationality) || undefined,
    region: text(values.region) || undefined,
    residence: text(values.residence) || undefined,
    phoneOrange: text(values.phoneOrange) || undefined,
    phoneTelecel: text(values.phoneTelecel) || undefined,
    email: text(values.email) || undefined,
    position: text(values.position) || "Membro",
    leaderRole: text(values.leaderRole) || undefined,
    louvorRole: text(values.louvorRole) || undefined,
    isGuest: parseBoolean(values.isGuest) || normaliseName(group.groupName ?? "").includes("convidad"),
    groupId: group.groupId,
    groupName: group.groupName,
    errors: [],
  };
  if (!row.name) row.errors.push("O nome é obrigatório.");
  if (!row.sex) row.errors.push("O sexo deve ser M/F, Masculino ou Feminino.");
  if (!validDate(row.birthDate)) row.errors.push("A data de nascimento deve ser válida, estar no formato AAAA-MM-DD e não ser futura.");
  if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) row.errors.push("O email não é válido.");
  if (values.group && !row.groupId) row.errors.push(`Grupo não encontrado: ${row.groupName}.`);
  return row;
}

export async function parseMemberImportFile(file: File, groups: ImportGroup[], existingMembers: ImportExistingMember[]) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error("Selecione um ficheiro CSV, XLSX ou XLS.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O ficheiro não pode exceder 5 MB.");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("O ficheiro não contém uma folha de dados.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: true });
  if (rows.length === 0) throw new Error("O ficheiro não contém linhas de membros.");
  if (rows.length > 500) throw new Error("Pode importar no máximo 500 membros de cada vez.");

  const parsed = rows.map((row, index) => toRow(row, index + 2, groups));
  const names = new Map<string, number>();
  const emails = new Map<string, number>();
  const existingNames = new Map(existingMembers.map((member) => [normaliseName(member.name), member.id]));
  const existingEmails = new Map(existingMembers.filter((member) => member.email).map((member) => [member.email!.trim().toLocaleLowerCase("pt-PT"), member.id]));
  for (const row of parsed) {
    const name = normaliseName(row.name);
    if (name && names.has(name)) row.errors.push(`Nome duplicado neste ficheiro (linha ${names.get(name)}).`);
    else if (name && existingNames.has(name)) row.errors.push(`Nome já registado no sistema (ID ${existingNames.get(name)}).`);
    else if (name) names.set(name, row.sourceRow);
    const email = row.email?.trim().toLocaleLowerCase("pt-PT");
    if (email && emails.has(email)) row.errors.push(`Email duplicado neste ficheiro (linha ${emails.get(email)}).`);
    else if (email && existingEmails.has(email)) row.errors.push(`Email já registado no sistema (ID ${existingEmails.get(email)}).`);
    else if (email) emails.set(email, row.sourceRow);
  }
  const invalidRows = parsed.filter((row) => row.errors.length > 0);
  return { fileName: file.name, sheetName, rows: parsed, validRows: parsed.filter((row) => row.errors.length === 0), invalidRows, total: parsed.length };
}

export function createMemberImportTemplate() {
  const headers = MEMBER_IMPORT_COLUMNS.map((column) => column.label);
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Membros");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

const REJECTED_REPORT_COLUMNS = [
  { key: "sourceRow", label: "Linha de origem" },
  ...MEMBER_IMPORT_COLUMNS,
  { key: "errors", label: "Motivos da rejeição" },
] as const;

function rejectedRowToRecord(row: MemberImportRow) {
  return Object.fromEntries([
    ["Linha de origem", row.sourceRow],
    ["Nome", row.name],
    ["Sexo (M/F)", row.sex],
    ["Data de nascimento (AAAA-MM-DD)", row.birthDate ?? ""],
    ["Nome do pai", row.father ?? ""],
    ["Nome da mãe", row.mother ?? ""],
    ["Nacionalidade", row.nationality ?? ""],
    ["Região", row.region ?? ""],
    ["Residência", row.residence ?? ""],
    ["Telefone Orange", row.phoneOrange ?? ""],
    ["Telefone Telecel", row.phoneTelecel ?? ""],
    ["Email", row.email ?? ""],
    ["Cargo eclesiástico", row.position ?? ""],
    ["Função de líder", row.leaderRole ?? ""],
    ["Função no louvor", row.louvorRole ?? ""],
    ["Convidado (sim/não)", row.isGuest ? "Sim" : "Não"],
    ["Grupo ou ID do grupo", row.groupName ?? row.groupId ?? ""],
    ["Motivos da rejeição", row.errors.join(" ")],
  ]);
}

function createRejectedMembersWorkbook(rows: MemberImportRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows.map(rejectedRowToRecord), { skipHeader: false });
  worksheet["!cols"] = REJECTED_REPORT_COLUMNS.map((column) => ({ wch: Math.min(Math.max(column.label.length + 2, 14), 42) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Linhas rejeitadas");
  return workbook;
}

export function createRejectedMembersExcel(rows: MemberImportRow[]) {
  return XLSX.write(createRejectedMembersWorkbook(rows), { bookType: "xlsx", type: "array" });
}

function csvCell(value: unknown) {
  const cell = String(value ?? "");
  return /[;"\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function createRejectedMembersCsv(rows: MemberImportRow[]) {
  const headers = REJECTED_REPORT_COLUMNS.map((column) => column.label);
  const lines = rows.map((row) => {
    const record = rejectedRowToRecord(row);
    return headers.map((header) => csvCell(record[header])).join(";");
  });
  return `\ufeff${headers.map(csvCell).join(";")}\n${lines.join("\n")}`;
}
