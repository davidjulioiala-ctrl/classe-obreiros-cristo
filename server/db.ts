import { eq, and, or, desc, asc, like, between, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  members,
  groups,
  activities,
  attendance,
  quotas,
  otherIncome,
  expenses,
  transfers,
  reports,
  commissionMembers,
  auditLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

  const result = await db.insert(members).values(data);
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

  return result.length > 0 ? result[0] : null;
}

export async function getMembersByGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(members).where(eq(members.groupId, groupId));
}

export async function searchMembers(query: string, isGuest?: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions: any[] = [like(members.name, `%${query}%`)];

  if (isGuest !== undefined) {
    conditions.push(eq(members.isGuest, isGuest));
  }

  return await db
    .select()
    .from(members)
    .where(and(...conditions))
    .orderBy(asc(members.name));
}

export async function updateMember(id: number, data: Partial<typeof members.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(members).set(data).where(eq(members.id, id));
}

export async function getAllMembers(activeOnly = true) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = activeOnly ? [eq(members.isActive, true)] : [];
  return await db.select().from(members).where(and(...conditions));
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

// ============ ACTIVITIES ============

export async function createActivity(data: typeof activities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(activities).values(data);
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

  return result.length > 0 ? result[0] : null;
}

export async function getActivitiesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(activities)
    .where(between(activities.date, startDate, endDate))
    .orderBy(desc(activities.date));
}

export async function updateActivity(id: number, data: Partial<typeof activities.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(activities).set(data).where(eq(activities.id, id));
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

// ============ QUOTAS ============

export async function createQuota(data: typeof quotas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(quotas).values(data);
}

export async function getQuotasByMember(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(quotas).where(eq(quotas.memberId, memberId));
}

export async function updateQuota(id: number, data: Partial<typeof quotas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(quotas).set(data).where(eq(quotas.id, id));
}

export async function getQuotasByMonthYear(month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(quotas)
    .where(and(eq(quotas.month, month), eq(quotas.year, year)));
}

// ============ OTHER INCOME ============

export async function createOtherIncome(data: typeof otherIncome.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(otherIncome).values(data);
}

export async function getOtherIncomeByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(otherIncome)
    .where(between(otherIncome.date, startDate, endDate));
}

// ============ EXPENSES ============

export async function createExpense(data: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(expenses).values(data);
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(expenses)
    .where(between(expenses.date, startDate, endDate))
    .orderBy(desc(expenses.sequence));
}

// ============ TRANSFERS ============

export async function createTransfer(data: typeof transfers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(transfers).values(data);
}

export async function getTransferById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTransfer(id: number, data: Partial<typeof transfers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(transfers).set(data).where(eq(transfers.id, id));
}

export async function getTransfersByMember(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(transfers)
    .where(eq(transfers.memberId, memberId))
    .orderBy(desc(transfers.createdAt));
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

  return await db.insert(commissionMembers).values(data);
}

export async function getCommissionByActivity(activityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(commissionMembers)
    .where(eq(commissionMembers.activityId, activityId));
}


// ============ FINANCIAL CRUD EXTENSIONS ============

export async function listQuotas() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(quotas).orderBy(desc(quotas.createdAt));
}

export async function deleteQuota(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(quotas).where(eq(quotas.id, id));
}

export async function listOtherIncome() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(otherIncome).orderBy(desc(otherIncome.date), desc(otherIncome.createdAt));
}

export async function updateOtherIncome(id: number, data: Partial<typeof otherIncome.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(otherIncome).set(data).where(eq(otherIncome.id, id));
}

export async function deleteOtherIncome(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(otherIncome).where(eq(otherIncome.id, id));
}

export async function listExpenses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(expenses).orderBy(desc(expenses.date), desc(expenses.sequence));
}

export async function updateExpense(id: number, data: Partial<typeof expenses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(expenses).set(data).where(eq(expenses.id, id));
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

export async function createAuditLog(data: typeof auditLog.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(auditLog).values({
    ...data,
    details: data.details ? String(data.details).slice(0, 10000) : null,
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
  return db.select().from(transfers).orderBy(desc(transfers.createdAt));
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
  const [userRows, memberRows, groupRows, activityRows, attendanceRows, quotaRows, incomeRows, expenseRows, transferRows, reportRows, commissionRows, auditRows] = await Promise.all([
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
  ]);
  return { exportedAt: new Date(), version: 1, users: userRows, members: memberRows, groups: groupRows, activities: activityRows, attendance: attendanceRows, quotas: quotaRows, otherIncome: incomeRows, expenses: expenseRows, transfers: transferRows, reports: reportRows, commissionMembers: commissionRows, auditLog: auditRows };
}


export async function deleteMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
