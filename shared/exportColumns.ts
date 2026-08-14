export const MEMBER_EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "name", label: "Nome" },
  { key: "sex", label: "Sexo" },
  { key: "birthDate", label: "Data de nascimento" },
  { key: "age", label: "Idade" },
  { key: "position", label: "Cargo" },
  { key: "groupId", label: "Grupo ID" },
  { key: "isGuest", label: "Convidado" },
  { key: "isActive", label: "Estado" },
  { key: "phoneOrange", label: "Telefone Orange" },
  { key: "phoneTelecel", label: "Telefone Telecel" },
  { key: "email", label: "Email" },
] as const;

export const REPORT_EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "type", label: "Tipo" },
  { key: "activityId", label: "Actividade ID" },
  { key: "createdAt", label: "Data de criação" },
  { key: "content", label: "Conteúdo" },
] as const;

export const PERSONAL_MEMBER_EXPORT_COLUMNS = ["phoneOrange", "phoneTelecel", "email"] as const;
export type PersonalMemberExportColumn = (typeof PERSONAL_MEMBER_EXPORT_COLUMNS)[number];

export type MemberExportColumn = (typeof MEMBER_EXPORT_COLUMNS)[number]["key"];
export type ReportExportColumn = (typeof REPORT_EXPORT_COLUMNS)[number]["key"];

export const MEMBER_EXPORT_COLUMN_KEYS = MEMBER_EXPORT_COLUMNS.map((column) => column.key) as MemberExportColumn[];
export const REPORT_EXPORT_COLUMN_KEYS = REPORT_EXPORT_COLUMNS.map((column) => column.key) as ReportExportColumn[];
