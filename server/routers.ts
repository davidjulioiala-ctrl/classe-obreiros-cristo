import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { parse as parseCookie } from "cookie";
import { createHeartbeatJob, updateHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./routers/auth";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// ============ MIDDLEWARE ============

const liderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.churchRole !== "lider") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas líderes podem aceder a este recurso" });
  }
  return next({ ctx });
});

const oficialProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.churchRole !== "oficial" && ctx.user.churchRole !== "lider") {
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
        leaderRole: z.string().optional(),
        louvorRole: z.string().optional(),
        isGuest: z.boolean().default(false),
        guestOf: z.number().optional(),
        groupId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.ensureDefaultGroups();
      let groupId = input.groupId;
      if (!groupId) {
        groupId = await assignGroupAutomatically(input.isGuest);
      }

      const result = await db.createMember({
        ...input,
        groupId,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      });
      // Registrar no histórico de cargos
      const createdMember = (await db.getAllMembers()).find(m => m.name === input.name && m.groupId === groupId);
      if (createdMember) {
        await db.addMemberHistory({
          memberId: createdMember.id,
          position: input.position || "Membro",
          details: `Cargo inicial: ${input.position || "Membro"}${input.leaderRole ? ' (' + input.leaderRole + ')' : ''}${input.louvorRole ? ' (' + input.louvorRole + ')' : ''}`,
          isActive: true,
        });
        
        if (input.position === "Membro de Ministério de Louvor") {
          await db.syncLouvorMemberProjection(createdMember);
        }
      }

      await writeAudit(ctx, "criar", "member", undefined, { name: input.name, isGuest: input.isGuest, groupId });
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
          louvorRole: z.string().optional(),
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
      const updatedMember = await db.getMemberById(input.id);
      if (updatedMember) await db.syncLouvorMemberProjection(updatedMember);
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
    await db.ensureDefaultGroups();
    return await db.getAllGroups();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getGroupById(input.id);
    }),

  update: liderProcedure
    .input(z.object({ id: z.number(), name: z.string().trim().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateGroup(id, data);
      await writeAudit(ctx, "editar", "group", id, data);
      return result;
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
        speakerName: z.string().optional(),
        biblicalReference: z.string().optional(),
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
        speakerName: z.string().optional(),
        biblicalReference: z.string().optional(),
        isReligious: z.boolean(),
      }))

    .mutation(async ({ input, ctx }) => {
      const { id, date, ...data } = input;
      const result = await db.updateActivity(id, { ...data, date: new Date(date) });
      await writeAudit(ctx, "editar", "activity", id, { name: input.name, type: input.type });
      return result;
    }),

  complete: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const scales = await db.listLouvorScales(input.id);
      const pending = scales.filter((scale) => scale.status === "escalado" || scale.status === "confirmado");
      if (pending.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Valide primeiro quem compareceu e quem faltou na escala do Louvor." });
      const result = await db.updateActivity(input.id, { status: "realizada" });
      await writeAudit(ctx, "concluir", "activity", input.id, { louvorScales: scales.length });
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

      const responsibleName = ctx.user.name || ctx.user.username;
      if (existing) {
        return await db.updateQuota(existing.id, {
          isPaid: true,
          paidAt: new Date(),
          paidBy: ctx.user.id,
          responsibleName,
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
        responsibleName,
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
      const responsibleName = ctx.user.name || ctx.user.username;
      const result = await db.createOtherIncome({ ...input, recordedBy: ctx.user.id, responsibleName });
      await writeAudit(ctx, "criar", "otherIncome", undefined, { description: input.description, amount: input.amount, date: input.date, responsibleName });
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
      const sequence = await db.getNextExpenseSequence();
      const responsibleName = ctx.user.name || ctx.user.username;
      const result = await db.createExpense({ ...input, sequence, totalPrice, recordedBy: ctx.user.id, responsibleName });
      await writeAudit(ctx, "criar", "expense", undefined, { designation: input.designation, quantity: input.quantity, totalPrice, date: input.date, responsibleName });
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
  update: liderProcedure.input(z.object({ id: z.number(), action: z.string().optional(), entityType: z.string().optional(), details: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    await db.updateAuditLog(id, data);
    await writeAudit(ctx, "atualizar", "audit_log", id, data);
    return { success: true };
  }),
  delete: liderProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    await db.deleteAuditLog(input.id);
    await writeAudit(ctx, "eliminar", "audit_log", input.id);
    return { success: true };
  }),
});

const settingsRouter = router({
  get: protectedProcedure.input(z.object({ keyName: z.string() })).query(async ({ input }) => {
    return await db.getAppSetting(input.keyName);
  }),
  set: liderProcedure.input(z.object({ keyName: z.string(), keyValue: z.string() })).mutation(async ({ input, ctx }) => {
    await db.setAppSetting(input.keyName, input.keyValue);
    await writeAudit(ctx, "atualizar", "settings", undefined, { keyName: input.keyName });
    return { success: true };
  }),
});

// ============ TRANSFERS ROUTER ============

const transfersRouter = router({
  list: protectedProcedure.query(() => db.listTransfers()),

  eligibleForAdultTransfer: liderProcedure.query(async () => {
    const members = await db.getAllMembers(true);
    return members.filter((member) => {
      if (!member.birthDate) return false;
      const birth = new Date(`${String(member.birthDate).slice(0, 10)}T00:00:00Z`);
      const today = new Date();
      let age = today.getUTCFullYear() - birth.getUTCFullYear();
      const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
      return age >= 18;
    });
  }),

  reviewAdultTransfers: liderProcedure.query(async () => {
    const members = await db.getAllMembers(true);
    return members.map((member) => {
      const birth = member.birthDate ? new Date(`${String(member.birthDate).slice(0, 10)}T00:00:00Z`) : null;
      const today = new Date();
      let age: number | null = null;
      if (birth && !Number.isNaN(birth.getTime())) {
        age = today.getUTCFullYear() - birth.getUTCFullYear();
        const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
      }
      return { ...member, age, eligible: age !== null && age >= 18 };
    });
  }),

  processAdultTransfers: liderProcedure
    .input(z.object({ memberIds: z.array(z.number()).min(1), reason: z.string().trim().min(1), toGroupId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const candidates = await db.getAllMembers(true);
      const selected = candidates.filter((member) => {
        if (!input.memberIds.includes(member.id) || !member.birthDate) return false;
        const birth = new Date(`${String(member.birthDate).slice(0, 10)}T00:00:00Z`);
        const today = new Date();
        let age = today.getUTCFullYear() - birth.getUTCFullYear();
        const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
        return age >= 18;
      });
      if (selected.length !== input.memberIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A lista inclui membros inativos, sem data de nascimento ou com idade inferior a 18 anos." });
      }

      const now = new Date();
      for (const member of selected) {
        await db.createTransfer({
          memberId: member.id,
          fromGroupId: member.groupId ?? undefined,
          toGroupId: input.toGroupId,
          toChurch: "Jovens",
          reason: input.reason,
          status: "concluida",
          approvedBy: ctx.user.id,
          approvedAt: now,
          completedAt: now,
        });
        await db.closeMemberHistory(member.id);
        await db.addMemberHistory({
          memberId: member.id,
          position: "Jovem",
          details: `Transferência validada para Jovens. Motivo: ${input.reason}`,
          startDate: now,
          isActive: false,
          endDate: now,
        });
        await db.updateMember(member.id, { isActive: false, isTransferred: true, transferredAt: now });
      }
      await writeAudit(ctx, "processar", "adult_transfer", undefined, { memberIds: input.memberIds, reason: input.reason, toGroupId: input.toGroupId });
      return { success: true, count: selected.length, members: selected };
    }),

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

async function assignGroupAutomatically(isGuest: boolean): Promise<number | undefined> {
  await db.ensureDefaultGroups();
  const allGroups = await db.getAllGroups();

  if (isGuest) {
    const guestGroup = allGroups.find((g) => g.criteria === "special:guest" || g.name.toLowerCase().includes("convidad"));
    if (guestGroup) return guestGroup.id;
  }

  // Pick one of the 4 primary groups (criteria primary:A, primary:B, primary:C, primary:D) or balanced by member count
  const primaryGroups = allGroups.filter((g) => g.criteria?.startsWith("primary:"));
  if (primaryGroups.length === 0) return allGroups[0]?.id;

  // Balance by finding the group with fewest members
  let targetGroup = primaryGroups[0];
  let minCount = Infinity;

  for (const group of primaryGroups) {
    const membersInGroup = await db.getMembersByGroup(group.id);
    if (membersInGroup.length < minCount) {
      minCount = membersInGroup.length;
      targetGroup = group;
    }
  }

  return targetGroup?.id;
}

// ============ LOUVOR ROUTER ============

const louvorRouter = router({
  listMembers: protectedProcedure.query(() => db.listLouvorMembers()),
  listScales: protectedProcedure.input(z.object({ activityId: z.number().optional() }).optional()).query(({ input }) => db.listLouvorScales(input?.activityId)),
  createScale: oficialProcedure
    .input(z.object({ activityId: z.number(), louvorMemberId: z.number(), roleInScale: z.string().trim().min(1), songs: z.string().optional(), status: z.enum(["escalado", "confirmado", "realizado", "ausente"]).default("escalado") }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createLouvorScale(input);
      await writeAudit(ctx, "criar", "louvorScale", undefined, input);
      return result;
    }),
  updateScale: oficialProcedure
    .input(z.object({ id: z.number(), roleInScale: z.string().trim().min(1).optional(), songs: z.string().optional(), status: z.enum(["escalado", "confirmado", "realizado", "ausente"]).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateLouvorScale(id, data);
      await writeAudit(ctx, "editar", "louvorScale", id, data);
      return result;
    }),
  deleteScale: oficialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteLouvorScale(input.id);
      await writeAudit(ctx, "apagar", "louvorScale", input.id);
      return result;
    }),
});

// ============ HISTORY ROUTER ============

const historyRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllMemberHistory();
  }),
  getByMember: protectedProcedure.input(z.object({ memberId: z.number() })).query(async ({ input }) => {
    return await db.getMemberHistory(input.memberId);
  }),
});



// ============ BACKUP ROUTER ============

const backupRouter = router({
  listVersions: adminProcedure.query(async () => db.listBackupVersions()),

  export: adminProcedure
    .input(z.object({ destination: z.enum(["local", "drive"]).default("local"), cloudEmail: z.string().email().optional(), versionLabel: z.string().max(255).optional() }))
    .mutation(async ({ input, ctx }) => {
      const version = await db.createBackupVersion({ createdBy: ctx.user.id, destination: input.destination, cloudEmail: input.cloudEmail, versionLabel: input.versionLabel });
      await writeAudit(ctx, "exportar", `backup_${input.destination}`, version.id, { version: version.versionLabel, destination: input.destination, cloudEmail: input.cloudEmail ?? null });
      return { id: version.id, versionLabel: version.versionLabel, destination: version.destination, cloudEmail: version.cloudEmail, fileUrl: version.fileUrl, fileSize: version.fileSize, checksum: version.checksum, message: input.destination === "drive" ? "Backup guardado no armazenamento cloud do sistema. O email foi associado à versão para identificação administrativa." : "Backup preparado para descarregamento local." };
    }),

  restore: adminProcedure
    .input(z.object({ id: z.number().int().positive(), confirmation: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.restoreBackupVersion(input.id);
      await writeAudit(ctx, "restaurar", "backup", input.id, result);
      return result;
    }),

  schedule: adminProcedure.query(async () => db.getBackupSchedule()),

  saveSchedule: adminProcedure
    .input(z.object({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59).default(0), destination: z.enum(["local", "drive"]).default("local"), cloudEmail: z.string().email().optional(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const current = await db.getBackupSchedule();
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const cron = `0 ${input.minute} ${input.hour} * * *`;
      let taskUid = current?.scheduleCronTaskUid ?? undefined;
      if (input.enabled) {
        if (taskUid) {
          await updateHeartbeatJob(taskUid, { cron, enable: true, path: "/api/scheduled/daily-backup", description: "Backup diário administrativo da Classe Obreiros de Cristo" }, sessionToken);
        } else {
          const job = await createHeartbeatJob({ name: `daily-backup-${ctx.user.id}`, cron, path: "/api/scheduled/daily-backup", description: "Backup diário administrativo da Classe Obreiros de Cristo" }, sessionToken);
          taskUid = job.taskUid;
        }
      } else if (taskUid) {
        await updateHeartbeatJob(taskUid, { enable: false }, sessionToken);
      }
      const schedule = await db.createBackupSchedule({ id: current?.id, hour: input.hour, minute: input.minute, destination: input.destination, cloudEmail: input.cloudEmail ?? null, enabled: input.enabled, scheduleCronTaskUid: taskUid ?? null, createdBy: current?.createdBy ?? ctx.user.id });
      await writeAudit(ctx, "configurar", "backup_schedule", schedule.id, { hour: input.hour, minute: input.minute, enabled: input.enabled, destination: input.destination });
      return schedule;
    }),

  disableSchedule: adminProcedure.mutation(async ({ ctx }) => {
    const current = await db.getBackupSchedule();
    if (!current) return null;
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    if (current.scheduleCronTaskUid) await updateHeartbeatJob(current.scheduleCronTaskUid, { enable: false }, sessionToken);
    const result = await db.updateBackupSchedule(current.id, { enabled: false });
    await writeAudit(ctx, "desactivar", "backup_schedule", current.id);
    return result;
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
  louvor: louvorRouter,
  settings: settingsRouter,
  history: historyRouter,
});

export type AppRouter = typeof appRouter;
