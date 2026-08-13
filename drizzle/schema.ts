import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for the church management system.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 100 }).unique(),
  password: varchar("password", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  churchRole: mysqlEnum("churchRole", ["lider", "oficial", "louvor", "financeiro", "financeira", "membro"]).default("membro").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Members table - core data for church members
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sex: mysqlEnum("sex", ["M", "F"]).notNull(),
  birthDate: date("birthDate"),
  father: varchar("father", { length: 255 }),
  mother: varchar("mother", { length: 255 }),
  nationality: varchar("nationality", { length: 255 }),
  region: varchar("region", { length: 255 }),
  residence: varchar("residence", { length: 255 }),
  phoneOrange: varchar("phoneOrange", { length: 20 }),
  phoneTelecel: varchar("phoneTelecel", { length: 20 }),
  email: varchar("email", { length: 320 }),
  groupId: int("groupId"),
  position: varchar("position", { length: 255 }), // Valores permitidos: Líder, Oficial, Membro de Ministério de Louvor, Convidado, Membro, Outros
  leaderRole: varchar("leaderRole", { length: 255 }), // Specific leader role when position is 'Líder'
  louvorRole: varchar("louvorRole", { length: 255 }), // Specific louvor role when position is 'Membro de Ministério de Louvor'
  isGuest: boolean("isGuest").default(false).notNull(),
  guestOf: int("guestOf"), // Reference to the member who invited this guest
  isActive: boolean("isActive").default(true).notNull(),
  isTransferred: boolean("isTransferred").default(false).notNull(),
  transferredAt: timestamp("transferredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Groups table - automatic grouping of members
 */
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  criteria: varchar("criteria", { length: 255 }), // e.g., "sex:M", "age:18-25"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

/**
 * Activities table - church events and activities
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  date: date("date").notNull(),
  startTime: varchar("startTime", { length: 10 }),
  endTime: varchar("endTime", { length: 10 }),
  location: varchar("location", { length: 255 }),
  type: varchar("type", { length: 100 }), // e.g., "culto", "estudo", "reunião"
  audience: varchar("audience", { length: 100 }), // e.g., "geral", "jovens", "mulheres"
  hasCommission: boolean("hasCommission").default(false).notNull(),
  speakerName: varchar("speakerName", { length: 255 }),
  speakerSex: mysqlEnum("speakerSex", ["M", "F"]),
  speakerPhoneOrange: varchar("speakerPhoneOrange", { length: 20 }),
  speakerPhoneTelecel: varchar("speakerPhoneTelecel", { length: 20 }),
  speakerResidence: varchar("speakerResidence", { length: 255 }),
  theme: varchar("theme", { length: 255 }),
  biblicalReference: varchar("biblicalReference", { length: 255 }), // For religious themes
  isReligious: boolean("isReligious").default(true).notNull(),
  status: mysqlEnum("status", ["planejada", "realizada", "cancelada"]).default("planejada").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Commission members - members assigned to organize an activity
 */
export const commissionMembers = mysqlTable("commissionMembers", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(),
  memberId: int("memberId").notNull(),
  role: varchar("role", { length: 100 }), // e.g., "coordenador", "secretário"
  phone: varchar("phone", { length: 30 }), // optional contact number
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionMember = typeof commissionMembers.$inferSelect;
export type InsertCommissionMember = typeof commissionMembers.$inferInsert;

/**
 * Attendance records - presence tracking for activities
 */
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(),
  memberId: int("memberId").notNull(),
  isPresent: boolean("isPresent").default(true).notNull(),
  recordedBy: int("recordedBy"), // User who recorded the attendance
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

/**
 * Quotas - monthly contribution payments
 */
export const quotas = mysqlTable("quotas", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("isPaid").default(false).notNull(),
  paidAt: timestamp("paidAt"),
  paidBy: int("paidBy"), // User who recorded the payment
  responsibleName: varchar("responsibleName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quota = typeof quotas.$inferSelect;
export type InsertQuota = typeof quotas.$inferInsert;

/**
 * Other income - non-quota financial entries
 */
export const otherIncome = mysqlTable("otherIncome", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  recordedBy: int("recordedBy").notNull(),
  responsibleName: varchar("responsibleName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtherIncome = typeof otherIncome.$inferSelect;
export type InsertOtherIncome = typeof otherIncome.$inferInsert;

/**
 * Expenses - financial outflows
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  sequence: int("sequence").notNull(),
  designation: varchar("designation", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  recordedBy: int("recordedBy").notNull(),
  responsibleName: varchar("responsibleName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Transfers - member transfers between groups or churches
 */
export const transfers = mysqlTable("transfers", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  fromGroupId: int("fromGroupId"),
  toGroupId: int("toGroupId"),
  toChurch: varchar("toChurch", { length: 255 }), // Name of destination church
  reason: text("reason"),
  status: mysqlEnum("status", ["pendente", "aprovada", "concluida", "cancelada"]).default("pendente").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;

/**
 * Reports - generated activity reports and minutes
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(),
  type: mysqlEnum("type", ["ata", "relatorio"]).notNull(),
  content: text("content"),
  generatedBy: int("generatedBy").notNull(),
  downloadedBy: varchar("downloadedBy", { length: 1000 }), // JSON array of user IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Audit log - track important actions
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * App Settings - persistent configuration for organization, notifications, and appearance
 */
export const appSettings = mysqlTable("appSettings", {
  id: int("id").autoincrement().primaryKey(),
  keyName: varchar("keyName", { length: 100 }).notNull().unique(),
  keyValue: text("keyValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

/**
 * Louvor Members - dedicated members for the music ministry
 */
export const louvorMembers = mysqlTable("louvorMembers", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId"),
  name: varchar("name", { length: 255 }).notNull(),
  instrumentOrVoice: varchar("instrumentOrVoice", { length: 255 }).notNull(), // e.g., "Vocal Principal", "Guitarra", "Teclado"
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LouvorMember = typeof louvorMembers.$inferSelect;
export type InsertLouvorMember = typeof louvorMembers.$inferInsert;

/**
 * Louvor Scales - music ministry schedule for activities
 */
export const louvorScales = mysqlTable("louvorScales", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(),
  louvorMemberId: int("louvorMemberId").notNull(),
  roleInScale: varchar("roleInScale", { length: 255 }).notNull(), // e.g., "Vocal", "Instrumentista"
  songs: text("songs"), // Optional song list or notes
  status: mysqlEnum("status", ["escalado", "confirmado", "realizado", "ausente"]).default("escalado").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LouvorScale = typeof louvorScales.$inferSelect;
export type InsertLouvorScale = typeof louvorScales.$inferInsert;

/**
 * Materials - Organization assets and inventory
 */
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  condition: mysqlEnum("condition", ["Bom", "Regular", "Precário", "Manutenção"]).default("Bom").notNull(),
  custodian: varchar("custodian", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  purchaseDate: date("purchaseDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * Member History table - tracking history of positions and status changes
 */
export const memberHistory = mysqlTable("memberHistory", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  details: text("details"),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberHistory = typeof memberHistory.$inferSelect;
export type InsertMemberHistory = typeof memberHistory.$inferInsert;

/**
 * Backup versions - metadata for downloadable and cloud snapshots.
 */
export const backupVersions = mysqlTable("backupVersions", {
  id: int("id").autoincrement().primaryKey(),
  versionLabel: varchar("versionLabel", { length: 255 }).notNull(),
  destination: mysqlEnum("destination", ["local", "drive"]).default("local").notNull(),
  cloudEmail: varchar("cloudEmail", { length: 320 }),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl"),
  fileSize: int("fileSize").default(0).notNull(),
  checksum: varchar("checksum", { length: 128 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupVersion = typeof backupVersions.$inferSelect;
export type InsertBackupVersion = typeof backupVersions.$inferInsert;

/**
 * Daily backup schedule - one configurable administrative heartbeat per project.
 */
export const backupSchedules = mysqlTable("backupSchedules", {
  id: int("id").autoincrement().primaryKey(),
  hour: int("hour").notNull(),
  minute: int("minute").default(0).notNull(),
  destination: mysqlEnum("destination", ["local", "drive"]).default("local").notNull(),
  cloudEmail: varchar("cloudEmail", { length: 320 }),
  enabled: boolean("enabled").default(false).notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastRunAt: timestamp("lastRunAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = typeof backupSchedules.$inferInsert;
