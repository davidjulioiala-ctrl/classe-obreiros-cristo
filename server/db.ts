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
