import { eq, and, or, desc, asc, like, between, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import {
  InsertUser,
  users,
  members,
  groups,
  activities,
  activityDocuments,
  attendance,
  quotas,
  otherIncome,
  expenses,
  transfers,
  reports,
  commissionMembers,
  auditLog,
  louvorMembers,
  louvorScales,
  appSettings,
  memberHistory,
  InsertMemberHistory,
  backupVersions,
  backupSchedules,
  materials,
  securityIncidents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storageGetSignedUrl, storagePut } from "./storage";
import { decryptFields, decryptJson, encryptFields, encryptJson } from "./_core/fieldEncryption";
import { filterRestorableSettings } from "./_core/backupRecovery";
import { normalizeMemberSearch } from "../shared/memberSearch";
import { ACTIVITY_TYPE_CATALOG, activityTypeLabel } from "../shared/activityTypes";

let _db: ReturnType<typeof drizzle> | null = null;

const MEMBER_PRIVATE_FIELDS = ["father", "mother", "nationality", "region", "residence", "phoneOrange", "phoneTelecel", "email"] as const;
const ACTIVITY_PRIVATE_FIELDS = ["speakerPhoneOrange", "speakerPhoneTelecel", "speakerResidence"] as const;
const COMMISSION_PRIVATE_FIELDS = ["phone"] as const;
const LOUVOR_PRIVATE_FIELDS = ["phone", "email"] as const;
const MATERIAL_PRIVATE_FIELDS = ["custodian", "location", "notes"] as const;
const QUOTA_PRIVATE_FIELDS = ["responsibleName"] as const;
const INCOME_PRIVATE_FIELDS = ["description", "responsibleName"] as const;
const EXPENSE_PRIVATE_FIELDS = ["designation", "responsibleName"] as const;
const TRANSFER_PRIVATE_FIELDS = ["toChurch", "reason"] as const;

function protect<T>(data: T, fields: readonly string[]) {
  return encryptFields(data as Record<string, unknown>, fields) as T;
}

function reveal<T>(data: T, fields: readonly string[]) {
  return decryptFields(data as Record<string, unknown>, fields) as T;
}

export async function encryptExistingSensitiveData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const counts = { members: 0, activities: 0, commissionMembers: 0, quotas: 0, otherIncome: 0, expenses: 0, transfers: 0, materials: 0, louvorMembers: 0 };

  const memberRows = await db.select().from(members);
  for (const row of memberRows) {
    await db.update(members).set(protect(row as Record<string, unknown>, MEMBER_PRIVATE_FIELDS) as typeof row).where(eq(members.id, row.id));
    counts.members++;
  }
  const activityRows = await db.select().from(activities);
  for (const row of activityRows) {
    await db.update(activities).set(protect(row as Record<string, unknown>, ACTIVITY_PRIVATE_FIELDS) as typeof row).where(eq(activities.id, row.id));
    counts.activities++;
  }
  const commissionRows = await db.select().from(commissionMembers);
  for (const row of commissionRows) {
    await db.update(commissionMembers).set(protect(row as Record<string, unknown>, COMMISSION_PRIVATE_FIELDS) as typeof row).where(eq(commissionMembers.id, row.id));
    counts.commissionMembers++;
  }
  const quotaRows = await db.select().from(quotas);
  for (const row of quotaRows) {
    await db.update(quotas).set(protect(row as Record<string, unknown>, QUOTA_PRIVATE_FIELDS) as typeof row).where(eq(quotas.id, row.id));
    counts.quotas++;
  }
  const incomeRows = await db.select().from(otherIncome);
  for (const row of incomeRows) {
    await db.update(otherIncome).set(protect(row as Record<string, unknown>, INCOME_PRIVATE_FIELDS) as typeof row).where(eq(otherIncome.id, row.id));
    counts.otherIncome++;
  }
  const expenseRows = await db.select().from(expenses);
  for (const row of expenseRows) {
    await db.update(expenses).set(protect(row as Record<string, unknown>, EXPENSE_PRIVATE_FIELDS) as typeof row).where(eq(expenses.id, row.id));
    counts.expenses++;
  }
  const transferRows = await db.select().from(transfers);
  for (const row of transferRows) {
    await db.update(transfers).set(protect(row as Record<string, unknown>, TRANSFER_PRIVATE_FIELDS) as typeof row).where(eq(transfers.id, row.id));
    counts.transfers++;
  }
  const materialRows = await db.select().from(materials);
  for (const row of materialRows) {
    await db.update(materials).set(protect(row as Record<string, unknown>, MATERIAL_PRIVATE_FIELDS) as typeof row).where(eq(materials.id, row.id));
    counts.materials++;
  }
  const louvorRows = await db.select().from(louvorMembers);
  for (const row of louvorRows) {
    await db.update(louvorMembers).set(protect(row as Record<string, unknown>, LOUVOR_PRIVATE_FIELDS) as typeof row).where(eq(louvorMembers.id, row.id));
    counts.louvorMembers++;
  }
  return counts;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (user.churchRole !== undefined) {
      values.churchRole = user.churchRole;
      updateSet.churchRole = user.churchRole;
    } else if (user.openId === ENV.ownerOpenId) {
      values.churchRole = "lider";
      updateSet.churchRole = "lider";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ MEMBERS ============

export async function createMember(data: typeof members.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(members).values(protect(data as Record<string, unknown>, MEMBER_PRIVATE_FIELDS) as typeof data);
  return result;
}

export async function getMemberById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(members)
    .where(eq(members.id, id))
    .limit(1);

  return result.length > 0 ? reveal(result[0], MEMBER_PRIVATE_FIELDS) : null;
}

export async function getMembersByGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(members).where(eq(members.groupId, groupId));
  return rows.map((row) => reveal(row, MEMBER_PRIVATE_FIELDS));
}

export async function searchMembers(query: string, isGuest?: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { normalized: normalizedQuery, numericId } = normalizeMemberSearch(query);
  const memberSearch = numericId !== null
    ? or(like(members.name, `%${normalizedQuery}%`), eq(members.id, numericId))
    : like(members.name, `%${normalizedQuery}%`);
  let conditions: any[] = [memberSearch];

  if (isGuest !== undefined) {
    conditions.push(eq(members.isGuest, isGuest));
  }

  const rows = await db
    .select()
    .from(members)
    .where(and(...conditions))
    .orderBy(asc(members.id));
  return rows.map((row) => reveal(row, MEMBER_PRIVATE_FIELDS));
}

export async function updateMember(id: number, data: Partial<typeof members.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(members).set(protect(data as Record<string, unknown>, MEMBER_PRIVATE_FIELDS) as Partial<typeof members.$inferInsert>).where(eq(members.id, id));
}

export async function getAllMembers(activeOnly = true) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = activeOnly ? [eq(members.isActive, true)] : [];
  const rows = await db.select().from(members).where(and(...conditions)).orderBy(asc(members.id));
  return rows.map((row) => reveal(row, MEMBER_PRIVATE_FIELDS));
}

// ============ GROUPS ============

export async function createGroup(data: typeof groups.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(groups).values(data);
  return result;
}

export async function getAllGroups() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(groups).orderBy(asc(groups.name));
}

export async function getGroupById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateGroup(id: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(groups).set(data).where(eq(groups.id, id));
}

export async function ensureDefaultGroups() {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(groups);
  const required = [
    { name: "Grupo A", criteria: "primary:A", description: "Grupo principal A" },
    { name: "Grupo B", criteria: "primary:B", description: "Grupo principal B" },
    { name: "Grupo C", criteria: "primary:C", description: "Grupo principal C" },
    { name: "Grupo D", criteria: "primary:D", description: "Grupo principal D" },
    { name: "Convidados", criteria: "special:guest", description: "Grupo para visitantes e convidados de atividades" },
  ];

  for (const req of required) {
    const found = existing.find((g) => g.criteria === req.criteria || g.name.toLowerCase() === req.name.toLowerCase());
    if (!found) {
      await db.insert(groups).values(req);
    }
  }
}

// ============ ACTIVITIES ============

export async function createActivity(data: typeof activities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(activities).values(protect(data as Record<string, unknown>, ACTIVITY_PRIVATE_FIELDS) as typeof data);
  return result;
}

export async function getActivityById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  return result.length > 0 ? reveal(result[0], ACTIVITY_PRIVATE_FIELDS) : null;
}

export async function getActivitiesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(activities)
    .where(between(activities.date, startDate, endDate))
    .orderBy(desc(activities.date));
  return rows.map((row) => reveal(row, ACTIVITY_PRIVATE_FIELDS));
}

export async function updateActivity(id: number, data: Partial<typeof activities.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(activities).set(protect(data as Record<string, unknown>, ACTIVITY_PRIVATE_FIELDS) as Partial<typeof activities.$inferInsert>).where(eq(activities.id, id));
}

export async function createActivityDocument(data: typeof activityDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(activityDocuments).values(data);
}

export async function listActivityDocuments(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(activityDocuments).where(eq(activityDocuments.activityId, activityId)).orderBy(desc(activityDocuments.createdAt));
}

export async function getActivityDocumentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(activityDocuments).where(eq(activityDocuments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteActivityDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const document = await getActivityDocumentById(id);
  if (!document) return null;
  await db.delete(activityDocuments).where(eq(activityDocuments.id, id));
  return document;
}

// ============ ATTENDANCE ============

export async function recordAttendance(data: typeof attendance.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.activityId, data.activityId!), eq(attendance.memberId, data.memberId!)))
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(attendance)
      .set({ isPresent: data.isPresent, recordedBy: data.recordedBy })
      .where(eq(attendance.id, existing[0].id));
  }

  return await db.insert(attendance).values(data);
}

export async function getAttendanceByActivity(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(attendance)
    .where(eq(attendance.activityId, activityId));
}



export async function getAttendanceStats(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const records = await db
    .select()
    .from(attendance)
    .where(eq(attendance.activityId, activityId));

  const total = records.length;
  const present = records.filter((r) => r.isPresent).length;
  const absent = total - present;

  return { total, present, absent };
}

export type ParticipationByActivityTypeRow = {
  type: string | null | undefined;
  activityCount: unknown;
  presentCount: unknown;
  recordedCount: unknown;
};

export function normalizeParticipationByActivityType(rows: ParticipationByActivityTypeRow[]) {
  return rows.map((row) => ({
    type: row.type?.trim() || "Sem tipo",
    activityCount: Math.max(0, Number(row.activityCount) || 0),
    presentCount: Math.max(0, Number(row.presentCount) || 0),
    recordedCount: Math.max(0, Number(row.recordedCount) || 0),
  }));
}

export function completeParticipationByActivityType(rows: ParticipationByActivityTypeRow[]) {
  const normalized = normalizeParticipationByActivityType(rows);
  const byType = new Map(normalized.map((row) => [row.type.toLowerCase(), row]));
  const catalogRows = ACTIVITY_TYPE_CATALOG.map(({ value, label }) => {
    const existing = byType.get(value.toLowerCase());
    return existing ? { ...existing, type: label } : { type: label, activityCount: 0, presentCount: 0, recordedCount: 0 };
  });
  const catalogValues = new Set(ACTIVITY_TYPE_CATALOG.map(({ value }) => value.toLowerCase()));
  const extraRows = normalized
    .filter((row) => !catalogValues.has(row.type.toLowerCase()))
    .map((row) => ({ ...row, type: activityTypeLabel(row.type) }));
  return [...catalogRows, ...extraRows];
}

export async function getParticipationByActivityType(options?: { startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dateFilter = options?.startDate && options?.endDate
    ? between(activities.date, options.startDate, options.endDate)
    : options?.startDate
      ? sql`${activities.date} >= ${options.startDate}`
      : options?.endDate
        ? sql`${activities.date} <= ${options.endDate}`
        : undefined;

  const rows = await db
    .select({
      type: activities.type,
      activityCount: sql<number>`COUNT(DISTINCT ${activities.id})`,
      presentCount: sql<number>`COALESCE(SUM(CASE WHEN ${attendance.isPresent} = 1 THEN 1 ELSE 0 END), 0)`,
      recordedCount: sql<number>`COUNT(${attendance.id})`,
    })
    .from(activities)
    .leftJoin(attendance, eq(attendance.activityId, activities.id))
    .where(dateFilter)
    .groupBy(activities.type)
    .orderBy(desc(sql`presentCount`), asc(activities.type));

  return completeParticipationByActivityType(rows);
}

// ============ QUOTAS ============

export async function createQuota(data: typeof quotas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(quotas).values(protect(data as Record<string, unknown>, QUOTA_PRIVATE_FIELDS) as typeof data);
}

export async function getQuotasByMember(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(quotas).where(eq(quotas.memberId, memberId));
  return rows.map((row) => reveal(row, QUOTA_PRIVATE_FIELDS));
}

export async function updateQuota(id: number, data: Partial<typeof quotas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(quotas).set(protect(data as Record<string, unknown>, QUOTA_PRIVATE_FIELDS) as Partial<typeof quotas.$inferInsert>).where(eq(quotas.id, id));
}

export async function getQuotasByMonthYear(month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(quotas)
    .where(and(eq(quotas.month, month), eq(quotas.year, year)));
  return rows.map((row) => reveal(row, QUOTA_PRIVATE_FIELDS));
}

// ============ OTHER INCOME ============

export async function createOtherIncome(data: typeof otherIncome.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(otherIncome).values(protect(data as Record<string, unknown>, INCOME_PRIVATE_FIELDS) as typeof data);
}

export async function getOtherIncomeByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(otherIncome)
    .where(between(otherIncome.date, startDate, endDate));
  return rows.map((row) => reveal(row, INCOME_PRIVATE_FIELDS));
}

// ============ EXPENSES ============

export async function getNextExpenseSequence() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const latest = await db
    .select({ sequence: expenses.sequence })
    .from(expenses)
    .orderBy(desc(expenses.sequence))
    .limit(1);
  return (latest[0]?.sequence ?? 0) + 1;
}

export async function createExpense(data: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(expenses).values(protect(data as Record<string, unknown>, EXPENSE_PRIVATE_FIELDS) as typeof data);
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(expenses)
    .where(between(expenses.date, startDate, endDate))
    .orderBy(desc(expenses.sequence));
  return rows.map((row) => reveal(row, EXPENSE_PRIVATE_FIELDS));
}

// ============ TRANSFERS ============

export async function createTransfer(data: typeof transfers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(transfers).values(protect(data as Record<string, unknown>, TRANSFER_PRIVATE_FIELDS) as typeof data);
}

export async function getTransferById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, id))
    .limit(1);

  return result.length > 0 ? reveal(result[0], TRANSFER_PRIVATE_FIELDS) : null;
}

export async function updateTransfer(id: number, data: Partial<typeof transfers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(transfers).set(protect(data as Record<string, unknown>, TRANSFER_PRIVATE_FIELDS) as Partial<typeof transfers.$inferInsert>).where(eq(transfers.id, id));
}

export async function getTransfersByMember(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(transfers)
    .where(eq(transfers.memberId, memberId))
    .orderBy(desc(transfers.createdAt));
  return rows.map((row) => reveal(row, TRANSFER_PRIVATE_FIELDS));
}

// ============ REPORTS ============

export async function createReport(data: typeof reports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(reports).values(data);
}

export async function getReportByActivity(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(reports)
    .where(eq(reports.activityId, activityId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ COMMISSION MEMBERS ============

export async function addCommissionMember(data: typeof commissionMembers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(commissionMembers).values(protect(data as Record<string, unknown>, COMMISSION_PRIVATE_FIELDS) as typeof data);
}

export async function getCommissionByActivity(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(commissionMembers)
    .where(eq(commissionMembers.activityId, activityId));
  return rows.map((row) => reveal(row, COMMISSION_PRIVATE_FIELDS));
}


// ============ FINANCIAL CRUD EXTENSIONS ============

export async function listQuotas() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(quotas).orderBy(desc(quotas.createdAt));
  return rows.map((row) => reveal(row, QUOTA_PRIVATE_FIELDS));
}

export async function deleteQuota(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(quotas).where(eq(quotas.id, id));
}

export async function listOtherIncome() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(otherIncome).orderBy(desc(otherIncome.date), desc(otherIncome.createdAt));
  return rows.map((row) => reveal(row, INCOME_PRIVATE_FIELDS));
}

export async function updateOtherIncome(id: number, data: Partial<typeof otherIncome.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(otherIncome).set(protect(data as Record<string, unknown>, INCOME_PRIVATE_FIELDS) as Partial<typeof otherIncome.$inferInsert>).where(eq(otherIncome.id, id));
}

export async function deleteOtherIncome(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(otherIncome).where(eq(otherIncome.id, id));
}

export async function listExpenses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(expenses).orderBy(desc(expenses.date), desc(expenses.sequence));
  return rows.map((row) => reveal(row, EXPENSE_PRIVATE_FIELDS));
}

export async function updateExpense(id: number, data: Partial<typeof expenses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(expenses).set(protect(data as Record<string, unknown>, EXPENSE_PRIVATE_FIELDS) as Partial<typeof expenses.$inferInsert>).where(eq(expenses.id, id));
}

function dateOnly(value: Date | string | null | undefined) {
  return value ? String(value).slice(0, 10) : "";
}

export async function getFinancialReportData(startDate: Date, endDate: Date) {
  const [allQuotas, allIncome, allExpenses] = await Promise.all([listQuotas(), listOtherIncome(), listExpenses()]);
  const start = dateOnly(startDate);
  const end = dateOnly(endDate);
  const inRange = (value: Date | string | null | undefined) => {
    const date = dateOnly(value);
    return date >= start && date <= end;
  };
  const quotasInRange = allQuotas.filter((quota) => {
    const monthDate = `${quota.year}-${String(quota.month).padStart(2, "0")}-01`;
    return monthDate >= start.slice(0, 7) + "-01" && monthDate <= end.slice(0, 7) + "-01";
  });
  return {
    quotas: quotasInRange,
    otherIncome: allIncome.filter((income) => inRange(income.date)),
    expenses: allExpenses.filter((expense) => inRange(expense.date)),
  };
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(expenses).where(eq(expenses.id, id));
}

// ============ REPORT CRUD ============

export async function listReports() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(reports).orderBy(desc(reports.createdAt));
}

export async function updateReport(id: number, data: Partial<typeof reports.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(reports).set(data).where(eq(reports.id, id));
}

export async function deleteReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(reports).where(eq(reports.id, id));
}

// ============ AUDIT LOG ============

const SENSITIVE_AUDIT_KEY = /password|passwordHash|token|secret|apiKey|accessKey|refreshToken|authorization/i;

function redactAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((entry) => redactAuditValue(entry, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_AUDIT_KEY.test(key) ? "[REDACTED]" : redactAuditValue(entry, depth + 1),
      ]),
    );
  }
  return value;
}

export function sanitizeAuditDetails(details: unknown): string | null {
  if (details === null || details === undefined) return null;
  const raw = String(details);
  try {
    return JSON.stringify(redactAuditValue(JSON.parse(raw))).slice(0, 10000);
  } catch {
    return raw.replace(/((?:password|passwordHash|token|secret|apiKey|accessKey|refreshToken|authorization)\s*[=:]\s*)[^,;\s]+/gi, '$1[REDACTED]').slice(0, 10000);
  }
}

export async function createAuditLog(data: typeof auditLog.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(auditLog).values({
    ...data,
    details: sanitizeAuditDetails(data.details),
  });
}

export async function listAuditLogs(limit = 250) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(Math.min(Math.max(limit, 1), 500));
}


export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result[0] ?? null;
}


export async function listTransfers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(transfers).orderBy(desc(transfers.createdAt));
  return rows.map((row) => reveal(row, TRANSFER_PRIVATE_FIELDS));
}

export async function deleteTransfer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(transfers).where(eq(transfers.id, id));
}


export async function deleteActivity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(commissionMembers).where(eq(commissionMembers.activityId, id));
  await db.delete(attendance).where(eq(attendance.activityId, id));
  await db.delete(activityDocuments).where(eq(activityDocuments.activityId, id));
  return await db.delete(activities).where(eq(activities.id, id));
}

export async function createCommissionMember(data: typeof commissionMembers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(commissionMembers).values(data);
}

export async function getCommissionMembersByActivity(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(commissionMembers).where(eq(commissionMembers.activityId, activityId));
}

export async function deleteCommissionMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(commissionMembers).where(eq(commissionMembers.id, id));
}



export async function getBackupSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [userRows, memberRows, groupRows, activityRows, attendanceRows, quotaRows, incomeRows, expenseRows, transferRows, reportRows, commissionRows, auditRows, louvorMemberRows, louvorScaleRows, historyRows, settingRows, securityIncidentRows] = await Promise.all([
    db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, loginMethod: users.loginMethod, role: users.role, churchRole: users.churchRole, isActive: users.isActive, createdAt: users.createdAt, updatedAt: users.updatedAt, lastSignedIn: users.lastSignedIn }).from(users),
    db.select().from(members),
    db.select().from(groups),
    db.select().from(activities),
    db.select().from(attendance),
    db.select().from(quotas),
    db.select().from(otherIncome),
    db.select().from(expenses),
    db.select().from(transfers),
    db.select().from(reports),
    db.select().from(commissionMembers),
    db.select().from(auditLog),
    db.select().from(louvorMembers),
    db.select().from(louvorScales),
    db.select().from(memberHistory),
    db.select().from(appSettings),
    db.select().from(securityIncidents),
  ]);
  return { exportedAt: new Date(), version: 3, users: userRows, members: memberRows, groups: groupRows, activities: activityRows, attendance: attendanceRows, quotas: quotaRows, otherIncome: incomeRows, expenses: expenseRows, transfers: transferRows, reports: reportRows, commissionMembers: commissionRows, auditLog: auditRows.map((row) => ({ ...row, details: sanitizeAuditDetails(row.details) })), louvorMembers: louvorMemberRows, louvorScales: louvorScaleRows, memberHistory: historyRows, appSettings: settingRows, securityIncidents: securityIncidentRows };
}

export async function createBackupVersion(input: { createdBy: number; destination: "local" | "drive"; cloudEmail?: string; versionLabel?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const snapshot = await getBackupSnapshot();
  const payload = encryptJson(snapshot);
  const checksum = createHash("sha256").update(payload).digest("hex");
  const key = `backups/${input.createdBy}/${Date.now()}.json.enc`;
  const stored = await storagePut(key, payload, "application/octet-stream");
  const versionLabel = input.versionLabel?.trim() || `Backup ${new Date().toLocaleString("pt-PT")}`;
  const result = await db.insert(backupVersions).values({ versionLabel, destination: input.destination, cloudEmail: input.cloudEmail?.trim() || null, storageKey: stored.key, fileUrl: null, fileSize: Buffer.byteLength(payload), checksum, createdBy: input.createdBy });
  const id = Number((result as { insertId?: number }).insertId ?? 0);
  if (id) await db.update(backupVersions).set({ fileUrl: `/api/backups/${id}/download` }).where(eq(backupVersions.id, id));
  return { id, versionLabel, destination: input.destination, cloudEmail: input.cloudEmail?.trim() || null, storageKey: stored.key, fileUrl: id ? `/api/backups/${id}/download` : stored.url, fileSize: Buffer.byteLength(payload), checksum, snapshot };
}

export async function listBackupVersions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(backupVersions).orderBy(desc(backupVersions.createdAt));
}

export async function getBackupVersion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(backupVersions).where(eq(backupVersions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getBackupPayload(id: number) {
  const version = await getBackupVersion(id);
  if (!version) return null;
  const signedUrl = await storageGetSignedUrl(version.storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`Não foi possível ler o backup (${response.status})`);
  const raw = await response.text();
  const checksum = createHash("sha256").update(raw).digest("hex");
  if (version.checksum && checksum !== version.checksum) throw new Error("A integridade do backup não pôde ser confirmada.");
  return { version, payload: decryptJson<Record<string, unknown>>(raw) };
}

function restoreDates(rows: unknown, dateFields: string[]) {
  if (!Array.isArray(rows)) return [];
  return rows.map((value) => {
    const row = { ...(value as Record<string, unknown>) };
    for (const field of dateFields) if (row[field]) row[field] = new Date(String(row[field]));
    return row;
  });
}

export async function restoreBackupVersion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const backup = await getBackupPayload(id);
  if (!backup) throw new Error("Versão de backup não encontrada");
  const data = backup.payload;
  const currentSettings = await db.select().from(appSettings);
  const protectedSettings = currentSettings.filter((setting) => setting.keyName === "system_maintenance" || setting.keyName === "global_session_revoked_at");
  await db.transaction(async (tx) => {
    await tx.delete(attendance);
    await tx.delete(commissionMembers);
    await tx.delete(louvorScales);
    await tx.delete(memberHistory);
    await tx.delete(transfers);
    await tx.delete(reports);
    await tx.delete(quotas);
    await tx.delete(otherIncome);
    await tx.delete(expenses);
    await tx.delete(activities);
    await tx.delete(louvorMembers);
    await tx.delete(members);
    await tx.delete(groups);
    await tx.delete(appSettings);
    await tx.delete(securityIncidents);
    await tx.delete(auditLog);

    if (Array.isArray(data.groups) && data.groups.length) await tx.insert(groups).values(data.groups as any);
    if (Array.isArray(data.members) && data.members.length) await tx.insert(members).values(restoreDates(data.members, ["createdAt", "updatedAt", "transferredAt"]) as any);
    if (Array.isArray(data.activities) && data.activities.length) await tx.insert(activities).values(restoreDates(data.activities, ["date", "createdAt", "updatedAt"]) as any);
    if (Array.isArray(data.attendance) && data.attendance.length) await tx.insert(attendance).values(restoreDates(data.attendance, ["recordedAt", "createdAt"]) as any);
    if (Array.isArray(data.quotas) && data.quotas.length) await tx.insert(quotas).values(restoreDates(data.quotas, ["paidAt", "createdAt", "updatedAt"]) as any);
    if (Array.isArray(data.otherIncome) && data.otherIncome.length) await tx.insert(otherIncome).values(restoreDates(data.otherIncome, ["date", "createdAt"]) as any);
    if (Array.isArray(data.expenses) && data.expenses.length) await tx.insert(expenses).values(restoreDates(data.expenses, ["date", "createdAt"]) as any);
    if (Array.isArray(data.transfers) && data.transfers.length) await tx.insert(transfers).values(restoreDates(data.transfers, ["approvedAt", "completedAt", "createdAt", "updatedAt"]) as any);
    if (Array.isArray(data.reports) && data.reports.length) await tx.insert(reports).values(restoreDates(data.reports, ["createdAt"]) as any);
    if (Array.isArray(data.commissionMembers) && data.commissionMembers.length) await tx.insert(commissionMembers).values(restoreDates(data.commissionMembers, ["createdAt"]) as any);
    if (Array.isArray(data.louvorMembers) && data.louvorMembers.length) await tx.insert(louvorMembers).values(restoreDates(data.louvorMembers, ["createdAt", "updatedAt"]) as any);
    if (Array.isArray(data.louvorScales) && data.louvorScales.length) await tx.insert(louvorScales).values(restoreDates(data.louvorScales, ["createdAt", "updatedAt"]) as any);
    if (Array.isArray(data.memberHistory) && data.memberHistory.length) await tx.insert(memberHistory).values(restoreDates(data.memberHistory, ["startDate", "endDate", "createdAt"]) as any);
    if (Array.isArray(data.appSettings) && data.appSettings.length) {
      const safeSettings = filterRestorableSettings(data.appSettings as Array<{ keyName?: string | null }>);
      if (safeSettings.length) await tx.insert(appSettings).values(restoreDates(safeSettings, ["updatedAt"]) as any);
    }
    if (protectedSettings.length) await tx.insert(appSettings).values(protectedSettings as any);
    if (Array.isArray(data.securityIncidents) && data.securityIncidents.length) await tx.insert(securityIncidents).values(restoreDates(data.securityIncidents, ["detectedAt", "containedAt", "resolvedAt", "updatedAt", "createdAt"]) as any);
    if (Array.isArray(data.auditLog) && data.auditLog.length) await tx.insert(auditLog).values(restoreDates(data.auditLog, ["createdAt", "updatedAt"]) as any);
  });
  return { restoredVersionId: id, restoredAt: new Date() };
}

export async function getBackupSchedule() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(backupSchedules).orderBy(desc(backupSchedules.updatedAt)).limit(1);
  return rows[0] ?? null;
}

export async function createBackupSchedule(data: typeof backupSchedules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getBackupSchedule();
  if (existing) {
    await db.update(backupSchedules).set(data).where(eq(backupSchedules.id, existing.id));
    return { ...existing, ...data };
  }
  const result = await db.insert(backupSchedules).values(data);
  return { ...data, id: Number((result as { insertId?: number }).insertId ?? 0) };
}

export async function updateBackupSchedule(id: number, data: Partial<typeof backupSchedules.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(backupSchedules).set(data).where(eq(backupSchedules.id, id));
  return getBackupSchedule();
}

// ============ MATERIALS HELPERS ============

/** O identificador legado continua persistido apenas para compatibilidade da tabela,
 * mas nunca é exposto à interface nem aos payloads do CRUD. */
function sanitizeMaterial<T extends { code?: unknown }>(material: T) {
  const { code: _legacyCode, ...publicMaterial } = material;
  return publicMaterial;
}

export async function listMaterials() {

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(materials).orderBy(desc(materials.createdAt));
    return rows.map((row) => sanitizeMaterial(reveal(row, MATERIAL_PRIVATE_FIELDS)));
}
export async function createMaterial(data: typeof materials.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materials).values(protect(data as Record<string, unknown>, MATERIAL_PRIVATE_FIELDS) as typeof data);
  const id = Number((result as { insertId?: number }).insertId ?? 0);
  const rows = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
    return rows[0] ? sanitizeMaterial(reveal(rows[0], MATERIAL_PRIVATE_FIELDS)) : sanitizeMaterial({ id, ...data });
}
export async function updateMaterial(id: number, data: Partial<typeof materials.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set(protect(data as Record<string, unknown>, MATERIAL_PRIVATE_FIELDS) as Partial<typeof materials.$inferInsert>).where(eq(materials.id, id));
  const rows = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
    return rows[0] ? sanitizeMaterial(reveal(rows[0], MATERIAL_PRIVATE_FIELDS)) : null;
}
export async function deleteMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(materials).where(eq(materials.id, id));
  return { success: true };
}

export async function getBackupScheduleByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(backupSchedules).where(eq(backupSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return rows[0] ?? null;
}

export async function markBackupScheduleRun(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(backupSchedules).set({ lastRunAt: new Date() }).where(eq(backupSchedules.id, id));
}

export async function deleteBackupSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(backupSchedules).where(eq(backupSchedules.id, id));
}


export async function deleteMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const louvorProjection = await db.select({ id: louvorMembers.id }).from(louvorMembers).where(eq(louvorMembers.memberId, id)).limit(1);
  if (louvorProjection[0]) {
    await db.delete(louvorScales).where(eq(louvorScales.louvorMemberId, louvorProjection[0].id));
    await db.delete(louvorMembers).where(eq(louvorMembers.id, louvorProjection[0].id));
  }
  await db.delete(attendance).where(eq(attendance.memberId, id));
  await db.delete(commissionMembers).where(eq(commissionMembers.memberId, id));
  await db.delete(quotas).where(eq(quotas.memberId, id));
  await db.delete(transfers).where(eq(transfers.memberId, id));
  return db.delete(members).where(eq(members.id, id));
}

export async function deleteAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(attendance).where(eq(attendance.id, id));
}

export async function updateAttendance(id: number, data: Partial<typeof attendance.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(attendance).set(data).where(eq(attendance.id, id));
}

// ============ LOUVOR MODULE ============

const LOUVOR_POSITION = "Membro de Ministério de Louvor";

export async function syncLouvorMemberProjection(member: typeof members.$inferSelect) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existingByMember = await db.select().from(louvorMembers).where(eq(louvorMembers.memberId, member.id)).limit(1);
  const existingByName = existingByMember[0] ? [] : await db.select().from(louvorMembers).where(eq(louvorMembers.name, member.name)).limit(1);
  const existing = existingByMember[0] ?? existingByName[0];
  const isLouvor = member.position === LOUVOR_POSITION;
  const values = protect({
    memberId: member.id,
    name: member.name,
    instrumentOrVoice: member.louvorRole?.trim() || existing?.instrumentOrVoice || "Vocal/Instrumento",
    phone: member.phoneOrange || member.phoneTelecel || existing?.phone || null,
    email: member.email || existing?.email || null,
    isActive: Boolean(member.isActive && isLouvor),
  }, LOUVOR_PRIVATE_FIELDS);

  if (existing) {
    await db.update(louvorMembers).set(values).where(eq(louvorMembers.id, existing.id));
    return reveal({ ...existing, ...values }, LOUVOR_PRIVATE_FIELDS);
  }
  if (!isLouvor) return null;
  const inserted = await db.insert(louvorMembers).values(values);
  return { id: Number(inserted[0].insertId), ...values };
}

export async function getLouvorMemberById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(louvorMembers).where(eq(louvorMembers.id, id)).limit(1);
  return rows[0] ? reveal(rows[0], LOUVOR_PRIVATE_FIELDS) : null;
}

export async function listLouvorMembers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const mainMembers = await db.select().from(members).where(eq(members.position, LOUVOR_POSITION));
  for (const member of mainMembers) await syncLouvorMemberProjection(member);
  const rows = await db.select().from(louvorMembers).where(eq(louvorMembers.isActive, true)).orderBy(desc(louvorMembers.createdAt));
  return rows.map((row) => reveal(row, LOUVOR_PRIVATE_FIELDS));
}

export async function createLouvorMember(data: typeof louvorMembers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(louvorMembers).values(protect(data as Record<string, unknown>, LOUVOR_PRIVATE_FIELDS) as typeof data);
}

export async function updateLouvorMember(id: number, data: Partial<typeof louvorMembers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(louvorMembers).set(protect(data as Record<string, unknown>, LOUVOR_PRIVATE_FIELDS) as Partial<typeof louvorMembers.$inferInsert>).where(eq(louvorMembers.id, id));
}

export async function deleteLouvorMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(louvorScales).where(eq(louvorScales.louvorMemberId, id));
  return await db.delete(louvorMembers).where(eq(louvorMembers.id, id));
}

export async function listLouvorScales(activityId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (activityId) {
    return db.select().from(louvorScales).where(eq(louvorScales.activityId, activityId));
  }
  return db.select().from(louvorScales).orderBy(desc(louvorScales.createdAt));
}

export async function createLouvorScale(data: typeof louvorScales.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(louvorScales).values(data);
}

export async function updateLouvorScale(id: number, data: Partial<typeof louvorScales.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(louvorScales).set(data).where(eq(louvorScales.id, id));
}

export async function deleteLouvorScale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(louvorScales).where(eq(louvorScales.id, id));
}

// ============ APP SETTINGS & EDITABLE AUDIT ============

export async function getAppSetting(keyName: string) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.select().from(appSettings).where(eq(appSettings.keyName, keyName)).limit(1);
  return res[0]?.keyValue ?? null;
}

export async function setAppSetting(keyName: string, keyValue: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getAppSetting(keyName);
  if (existing !== null) {
    return await db.update(appSettings).set({ keyValue }).where(eq(appSettings.keyName, keyName));
  } else {
    return await db.insert(appSettings).values({ keyName, keyValue });
  }
}

export type SystemMaintenanceState = {
  enabled: boolean;
  reason: string;
  incidentId: number | null;
  startedAt: string | null;
  updatedBy: number | null;
};

const DEFAULT_MAINTENANCE_STATE: SystemMaintenanceState = {
  enabled: false,
  reason: "",
  incidentId: null,
  startedAt: null,
  updatedBy: null,
};

function parseMaintenanceState(value: string | null): SystemMaintenanceState {
  if (!value) return DEFAULT_MAINTENANCE_STATE;
  try {
    const parsed = JSON.parse(value) as Partial<SystemMaintenanceState>;
    return {
      enabled: parsed.enabled === true,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      incidentId: Number.isInteger(parsed.incidentId) ? (parsed.incidentId ?? null) : null,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
      updatedBy: Number.isInteger(parsed.updatedBy) ? (parsed.updatedBy ?? null) : null,
    };
  } catch {
    return DEFAULT_MAINTENANCE_STATE;
  }
}

export async function getSystemMaintenanceState(): Promise<SystemMaintenanceState> {
  return parseMaintenanceState(await getAppSetting("system_maintenance"));
}

export async function setSystemMaintenanceState(state: SystemMaintenanceState) {
  await setAppSetting("system_maintenance", JSON.stringify(state));
  return state;
}

export async function getGlobalSessionRevokedAt() {
  return await getAppSetting("global_session_revoked_at");
}

export async function revokeAllSessions() {
  const revokedAt = new Date().toISOString();
  await setAppSetting("global_session_revoked_at", revokedAt);
  return revokedAt;
}

export async function createSecurityIncident(data: Omit<typeof securityIncidents.$inferInsert, "id" | "incidentCode" | "createdAt" | "updatedAt" | "detectedAt"> & { detectedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const incidentCode = `INC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const result = await db.insert(securityIncidents).values({ ...data, incidentCode });
  return { id: Number(result[0].insertId), incidentCode };
}

export async function listSecurityIncidents(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(securityIncidents).orderBy(desc(securityIncidents.createdAt)).limit(Math.min(Math.max(limit, 1), 500));
}

export async function getSecurityIncident(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(securityIncidents).where(eq(securityIncidents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateSecurityIncident(id: number, data: Partial<typeof securityIncidents.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(securityIncidents).set(data).where(eq(securityIncidents.id, id));
}

export async function updateAuditLog(id: number, data: { action?: string; entityType?: string; details?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(auditLog).set({ ...data, details: data.details === undefined ? undefined : sanitizeAuditDetails(data.details) }).where(eq(auditLog.id, id));
}

export async function deleteAuditLog(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(auditLog).where(eq(auditLog.id, id));
}

// Member History Helpers
export async function getMemberHistory(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(memberHistory).where(eq(memberHistory.memberId, memberId)).orderBy(desc(memberHistory.startDate));
}

export async function addMemberHistory(data: InsertMemberHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(memberHistory).values(data);
}

export async function closeMemberHistory(memberId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(memberHistory).set({ isActive: false, endDate: new Date() }).where(and(eq(memberHistory.memberId, memberId), eq(memberHistory.isActive, true)));
}

export async function getAllMemberHistory() {
  const db = await getDb();
  if (!db) return [];
  const histories = await db.select().from(memberHistory).orderBy(desc(memberHistory.startDate));
  const allMembers = await db.select().from(members);
  const memberMap = new Map(allMembers.map(m => [m.id, m]));
  return histories.map(h => ({
    ...h,
    member: memberMap.get(h.memberId) || null,
  }));
}
