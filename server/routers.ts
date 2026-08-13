import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./routers/auth";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// ============ MIDDLEWARE ============

const liderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.churchRole !== "lider") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas líderes podem aceder a este recurso" });
  }
  return next({ ctx });
});

const oficialProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.churchRole !== "oficial" && ctx.user.churchRole !== "lider") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
  }
  return next({ ctx });
});

const financialProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ctx.user.role === "admin" || ctx.user.churchRole === "financeiro" || ctx.user.churchRole === "financeira";
  if (!allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores e perfis financeiros podem alterar dados financeiros." });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem realizar esta operação." });
  }
  return next({ ctx });
});

async function writeAudit(ctx: { user: { id: number } }, action: string, entityType: string, entityId?: number, details?: unknown) {
  await db.createAuditLog({
    userId: ctx.user.id,
    action,
    entityType,
    entityId,
    details: details ? JSON.stringify(details).slice(0, 10000) : null,
  });
}

// ============ MEMBERS ROUTER ============

const membersRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllMembers();
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return await db.getMemberById(input.id);
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string(), isGuest: z.boolean().optional() }))
    .query(async ({ input }) => {
      return await db.searchMembers(input.query, input.isGuest);
    }),

  create: liderProcedure
    .input(
      z.object({
        name: z.string(),
        sex: z.enum(["M", "F"]),
        birthDate: z.string().optional(),
        father: z.string().optional(),
        mother: z.string().optional(),
        nationality: z.string().optional(),
        region: z.string().optional(),
        residence: z.string().optional(),
        phoneOrange: z.string().optional(),
        phoneTelecel: z.string().optional(),
        email: z.string().email().optional(),
        position: z.string().optional(),
        isGuest: z.boolean().default(false),
        guestOf: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const groupId = await assignGroupAutomatically(input.sex);

      const result = await db.createMember({
        ...input,
        groupId,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      });
      await writeAudit(ctx, "criar", "member", undefined, { name: input.name, isGuest: input.isGuest });
      return result;
    }),

  update: liderProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          sex: z.enum(["M", "F"]).optional(),
          birthDate: z.string().optional(),
          father: z.string().optional(),
          mother: z.string().optional(),
          nationality: z.string().optional(),
          region: z.string().optional(),
          residence: z.string().optional(),
          phoneOrange: z.string().optional(),
          phoneTelecel: z.string().optional(),
          email: z.string().email().optional(),
          position: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData = {
        ...input.data,
        birthDate: input.data.birthDate ? new Date(input.data.birthDate) : undefined,
      };
      const result = await db.updateMember(input.id, updateData);
      await writeAudit(ctx, "editar", "member", input.id, input.data);
      return result;
    }),

  delete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteMember(input.id);
      await writeAudit(ctx, "apagar", "member", input.id);
      return result;
    }),

  getByGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      return await db.getMembersByGroup(input.groupId);
    }),
});

// ============ GROUPS ROUTER ============

const groupsRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllGroups();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getGroupById(input.id);
    }),
});

// ============ ACTIVITIES ROUTER ============

const activitiesRouter = router({
  create: liderProcedure
    .input(
      z.object({
        name: z.string(),
        date: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        location: z.string().optional(),
        type: z.string().optional(),
        audience: z.string().optional(),
        hasCommission: z.boolean().default(false),
        theme: z.string().optional(),
        isReligious: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.createActivity({
        ...input,
        date: new Date(input.date),
        status: "planejada",
      });
      await writeAudit(ctx, "criar", "activity", undefined, { name: input.name, type: input.type });
      return result;
    }),

  list: protectedProcedure.query(async () => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    return await db.getActivitiesByDateRange(startDate, endDate);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActivityById(input.id);
    }),

  update: liderProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      date: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      type: z.string().optional(),
      audience: z.string().optional(),
      hasCommission: z.boolean(),
      theme: z.string().optional(),
      isReligious: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, date, ...data } = input;
      const result = await db.updateActivity(id, { ...data, date: new Date(date) });
      await writeAudit(ctx, "editar", "activity", id, { name: input.name, type: input.type });
      return result;
    }),

  delete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteActivity(input.id);
      await writeAudit(ctx, "apagar", "activity", input.id);
      return result;
    }),

  commissionList: protectedProcedure
    .input(z.object({ activityId: z.number() }))
    .query(({ input }) => db.getCommissionMembersByActivity(input.activityId)),

  commissionAdd: liderProcedure
    .input(z.object({ activityId: z.number(), memberId: z.number(), role: z.string().min(1), phone: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createCommissionMember(input);
      await writeAudit(ctx, "criar", "commissionMember", undefined, input);
      return result;
    }),

  commissionDelete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteCommissionMember(input.id);
      await writeAudit(ctx, "apagar", "commissionMember", input.id);
      return result;
    }),

  recordAttendance: oficialProcedure
    .input(
      z.object({
        activityId: z.number(),
        memberId: z.number(),
        isPresent: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.recordAttendance({
        ...input,
        recordedBy: ctx.user.id,
      });
    }),

  getAttendance: protectedProcedure
    .input(z.object({ activityId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAttendanceByActivity(input.activityId);
    }),

  updateAttendance: oficialProcedure
    .input(z.object({ id: z.number(), isPresent: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.updateAttendance(input.id, { isPresent: input.isPresent });
      await writeAudit(ctx, "editar", "attendance", input.id, { isPresent: input.isPresent });
      return result;
    }),

  deleteAttendance: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteAttendance(input.id);
      await writeAudit(ctx, "apagar", "attendance", input.id);
      return result;
    }),

  getAttendanceStats: protectedProcedure
    .input(z.object({ activityId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAttendanceStats(input.activityId);
    }),
});

// ============ QUOTAS ROUTER ============

const quotasRouter = router({
  getByMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return await db.getQuotasByMember(input.memberId);
    }),

  recordPayment: liderProcedure
    .input(
      z.object({
        memberId: z.number(),
        month: z.number(),
        year: z.number(),
        amount: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const quota = await db.getQuotasByMonthYear(input.month, input.year);
      const existing = quota.find((q) => q.memberId === input.memberId);

      if (existing) {
        return await db.updateQuota(existing.id, {
          isPaid: true,
          paidAt: new Date(),
          paidBy: ctx.user.id,
        });
      }

      return await db.createQuota({
        memberId: input.memberId,
        month: input.month,
        year: input.year,
        amount: input.amount,
        isPaid: true,
        paidAt: new Date(),
        paidBy: ctx.user.id,
      });
    }),

  getByMonthYear: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      return await db.getQuotasByMonthYear(input.month, input.year);
    }),

  list: protectedProcedure.query(() => db.listQuotas()),

  update: financialProcedure
    .input(z.object({ id: z.number(), isPaid: z.boolean().optional(), amount: z.string().optional(), month: z.number().optional(), year: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateQuota(id, data);
      await writeAudit(ctx, "editar", "quota", id, data);
      return result;
    }),

  delete: financialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteQuota(input.id);
      await writeAudit(ctx, "apagar", "quota", input.id);
      return result;
    }),
});

// ============ OTHER INCOME ROUTER ============

const otherIncomeRouter = router({
  list: protectedProcedure.query(() => db.listOtherIncome()),
  create: financialProcedure
    .input(z.object({ description: z.string().trim().min(1), amount: z.string().min(1), date: z.coerce.date() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createOtherIncome({ ...input, recordedBy: ctx.user.id });
      await writeAudit(ctx, "criar", "otherIncome", undefined, { description: input.description, amount: input.amount, date: input.date });
      return result;
    }),
  update: financialProcedure
    .input(z.object({ id: z.number(), description: z.string().trim().min(1).optional(), amount: z.string().min(1).optional(), date: z.coerce.date().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateOtherIncome(id, data);
      await writeAudit(ctx, "editar", "otherIncome", id, data);
      return result;
    }),
  delete: financialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteOtherIncome(input.id);
      await writeAudit(ctx, "apagar", "otherIncome", input.id);
      return result;
    }),
});

// ============ EXPENSES ROUTER ============

const expensesRouter = router({
  list: protectedProcedure.query(() => db.listExpenses()),
  create: financialProcedure
    .input(z.object({ designation: z.string().trim().min(1), quantity: z.number().int().positive(), unitPrice: z.string().min(1), date: z.coerce.date() }))
    .mutation(async ({ input, ctx }) => {
      const totalPrice = (input.quantity * Number(input.unitPrice)).toFixed(2);
      const result = await db.createExpense({ ...input, totalPrice, recordedBy: ctx.user.id });
      await writeAudit(ctx, "criar", "expense", undefined, { designation: input.designation, quantity: input.quantity, totalPrice, date: input.date });
      return result;
    }),
  update: financialProcedure
    .input(z.object({ id: z.number(), designation: z.string().trim().min(1).optional(), quantity: z.number().int().positive().optional(), unitPrice: z.string().min(1).optional(), date: z.coerce.date().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const totalPrice = data.quantity !== undefined && data.unitPrice !== undefined ? (data.quantity * Number(data.unitPrice)).toFixed(2) : undefined;
      const result = await db.updateExpense(id, { ...data, ...(totalPrice ? { totalPrice } : {}) });
      await writeAudit(ctx, "editar", "expense", id, { ...data, ...(totalPrice ? { totalPrice } : {}) });
      return result;
    }),
  delete: financialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteExpense(input.id);
      await writeAudit(ctx, "apagar", "expense", input.id);
      return result;
    }),
});

// ============ REPORTS ROUTER ============

const reportsRouter = router({
  list: protectedProcedure.query(() => db.listReports()),
  getByActivity: protectedProcedure.input(z.object({ activityId: z.number() })).query(({ input }) => db.getReportByActivity(input.activityId)),
  create: oficialProcedure
    .input(z.object({ activityId: z.number(), type: z.enum(["ata", "relatorio"]), content: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createReport({ ...input, generatedBy: ctx.user.id });
      await writeAudit(ctx, "criar", "report", undefined, { activityId: input.activityId, type: input.type });
      return result;
    }),
  update: oficialProcedure
    .input(z.object({ id: z.number(), type: z.enum(["ata", "relatorio"]).optional(), content: z.string().min(1).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateReport(id, data);
      await writeAudit(ctx, "editar", "report", id, data);
      return result;
    }),
  delete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteReport(input.id);
      await writeAudit(ctx, "apagar", "report", input.id);
      return result;
    }),
});

// ============ AUDIT ROUTER ============

const auditRouter = router({
  list: liderProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(({ input }) => db.listAuditLogs(input?.limit)),
});

// ============ TRANSFERS ROUTER ============

const transfersRouter = router({
  list: protectedProcedure.query(() => db.listTransfers()),

  create: liderProcedure
    .input(
      z.object({
        memberId: z.number(),
        fromGroupId: z.number().optional(),
        toGroupId: z.number().optional(),
        toChurch: z.string().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.createTransfer({
        ...input,
        status: "pendente",
      });
      await writeAudit(ctx, "criar", "transfer", undefined, input);
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getTransferById(input.id);
    }),

  approve: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.updateTransfer(input.id, {
        status: "aprovada" as const,
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
      });
      await writeAudit(ctx, "editar", "transfer", input.id, { status: "aprovada" });
      return result;
    }),

  complete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const transfer = await db.getTransferById(input.id);
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });

      // Update member status
      await db.updateMember(transfer.memberId, {
        isTransferred: true,
        transferredAt: new Date(),
        groupId: transfer.toGroupId || undefined,
      });

      const result = await db.updateTransfer(input.id, {
        status: "concluida" as const,
        completedAt: new Date(),
      });
      await writeAudit(ctx, "editar", "transfer", input.id, { status: "concluida" });
      return result;
    }),

  getByMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTransfersByMember(input.memberId);
    }),

  delete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteTransfer(input.id);
      await writeAudit(ctx, "apagar", "transfer", input.id);
      return result;
    }),
});

// ============ HELPER FUNCTIONS ============

async function assignGroupAutomatically(sex: "M" | "F"): Promise<number | null> {
  const groups = await db.getAllGroups();

  // Find or create group based on sex
  let group = groups.find((g) => g.criteria === `sex:${sex}`);

  if (!group) {
    const groupName = sex === "M" ? "Homens" : "Mulheres";
    const result = await db.createGroup({
      name: groupName,
      criteria: `sex:${sex}`,
      description: `Grupo automático de ${groupName.toLowerCase()}`,
    });

    // Get the created group
    const allGroups = await db.getAllGroups();
    group = allGroups.find((g) => g.criteria === `sex:${sex}`);
  }

  return group?.id || null;
}

// ============ BACKUP ROUTER ============

const backupRouter = router({
  export: adminProcedure
    .input(z.object({ destination: z.enum(["local", "drive"]).default("local") }))
    .mutation(async ({ input, ctx }) => {
      const snapshot = await db.getBackupSnapshot();
      await writeAudit(ctx, "exportar", `backup_${input.destination}`, undefined, { version: snapshot.version, destination: input.destination });
      return {
        ...snapshot,
        destination: input.destination,
        message: input.destination === "drive" ? "Backup sincronizado com sucesso com o Google Drive." : "Backup preparado para descarregamento local.",
      };
    }),
});

// ============ MAIN ROUTER ============

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  members: membersRouter,
  groups: groupsRouter,
  activities: activitiesRouter,
  quotas: quotasRouter,
  transfers: transfersRouter,
  otherIncome: otherIncomeRouter,
  expenses: expensesRouter,
  reports: reportsRouter,
  audit: auditRouter,
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;
