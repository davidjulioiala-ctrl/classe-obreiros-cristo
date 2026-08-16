import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { parse as parseCookie } from "cookie";
import { randomUUID } from "node:crypto";
import { createHeartbeatJob, updateHeartbeatJob, deleteHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./routers/auth";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { positiveId, safeEmail, safeText } from "./_core/security";
import { buildIncidentDiagnosis } from "./_core/incidentDiagnostics";
import { applyActivityTypeRules } from "../shared/activityRules";
import { parsePublicOrganizationBranding } from "../shared/organizationBranding";

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

  getById: protectedProcedure.input(z.object({ id: positiveId })).query(async ({ input }) => {
    return await db.getMemberById(input.id);
  }),

  getMonthlyAttendance: protectedProcedure
    .input(z.object({ memberId: positiveId, month: z.number().optional(), year: z.number().optional() }))
    .query(async ({ input }) => {
      return await db.getMemberMonthlyAttendanceStats(input.memberId, input.month, input.year);
    }),

  search: protectedProcedure
    .input(z.object({ query: safeText(100), isGuest: z.boolean().optional() }))
    .query(async ({ input }) => {
      return await db.searchMembers(input.query, input.isGuest);
    }),

  create: oficialProcedure
    .input(
      z.object({
        name: safeText(255),
        sex: z.enum(["M", "F"]),
        birthDate: safeText(10, false),
        father: safeText(255, false),
        mother: safeText(255, false),
        nationality: safeText(100, false),
        region: safeText(100, false),
        residence: safeText(500, false),
        phoneOrange: safeText(40, false),
        phoneTelecel: safeText(40, false),
        email: safeEmail().optional(),
        position: safeText(255, false),
        leaderRole: safeText(255, false),
        louvorRole: safeText(255, false),
        isGuest: z.boolean().default(false),
        guestOf: positiveId.optional(),
        groupId: positiveId.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.ensureDefaultGroups();
      const allMembers = await db.getAllMembers(false);
      const normalizedNewName = input.name.trim().toLowerCase();
      const normalizedNewEmail = input.email ? input.email.trim().toLowerCase() : "";

      const existingByName = allMembers.find(m => m.name.trim().toLowerCase() === normalizedNewName);
      if (existingByName) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Já existe um membro registado com o nome "${existingByName.name}" (ID ${existingByName.id}).`,
        });
      }

      if (normalizedNewEmail) {
        const existingByEmail = allMembers.find(m => m.email && m.email.trim().toLowerCase() === normalizedNewEmail);
        if (existingByEmail) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um membro registado com o email "${existingByEmail.email}" (ID ${existingByEmail.id}, Nome: ${existingByEmail.name}).`,
          });
        }
      }
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

  update: oficialProcedure
    .input(
      z.object({
        id: positiveId,
        data: z.object({
          name: safeText(255).optional(),
          sex: z.enum(["M", "F"]).optional(),
          birthDate: safeText(10, false),
          father: safeText(255, false),
          mother: safeText(255, false),
          nationality: safeText(100, false),
          region: safeText(100, false),
          residence: safeText(500, false),
          phoneOrange: safeText(40, false),
          phoneTelecel: safeText(40, false),
          email: safeEmail().optional(),
          position: safeText(255, false),
          leaderRole: safeText(255, false),
          louvorRole: safeText(255, false),
          groupId: positiveId.optional(),
          isGuest: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const allMembers = await db.getAllMembers(false);
      if (input.data.name !== undefined) {
        const normalizedName = input.data.name.trim().toLowerCase();
        const conflict = allMembers.find(m => m.id !== input.id && m.name.trim().toLowerCase() === normalizedName);
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe outro membro com o nome "${conflict.name}" (ID ${conflict.id}).`,
          });
        }
      }
      if (input.data.email !== undefined && input.data.email) {
        const normalizedEmail = input.data.email.trim().toLowerCase();
        const conflictEmail = allMembers.find(m => m.id !== input.id && m.email && m.email.trim().toLowerCase() === normalizedEmail);
        if (conflictEmail) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe outro membro com o email "${conflictEmail.email}" (ID ${conflictEmail.id}, Nome: ${conflictEmail.name}).`,
          });
        }
      }

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
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteMember(input.id);
      await writeAudit(ctx, "apagar", "member", input.id);
      return result;
    }),

  getByGroup: protectedProcedure
    .input(z.object({ groupId: positiveId }))
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
    .input(z.object({ id: positiveId }))
    .query(async ({ input }) => {
      return await db.getGroupById(input.id);
    }),

  update: liderProcedure
    .input(z.object({ id: positiveId, name: safeText(255), description: safeText(1000, false) }))
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
        name: safeText(255),
        date: safeText(10),
        startTime: safeText(10, false),
        endTime: safeText(10, false),
        location: safeText(255, false),
        type: safeText(100, false),
        audience: safeText(100, false),
        hasCommission: z.boolean().default(false),
        theme: safeText(255, false),
        speakerName: safeText(255, false),
        biblicalReference: safeText(255, false),
        meetingAgenda: safeText(5000, false),
        meetingReason: safeText(2000, false),
        isReligious: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let rules;
      try {
        rules = applyActivityTypeRules(input);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Dados de actividade inválidos." });
      }
      const result = await db.createActivity({
        ...input,
        date: new Date(input.date),
        biblicalReference: rules.biblicalReference,
        meetingAgenda: rules.meetingAgenda,
        meetingReason: rules.meetingReason,
        isReligious: rules.isReligious,
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
    .input(z.object({ id: positiveId }))
    .query(async ({ input }) => {
      return await db.getActivityById(input.id);
    }),

  documentsList: protectedProcedure
    .input(z.object({ activityId: positiveId }))
    .query(async ({ input }) => db.listActivityDocuments(input.activityId)),

  update: liderProcedure
    .input(z.object({
      id: positiveId,
      name: safeText(255),
      date: safeText(10),
      startTime: safeText(10, false),
      endTime: safeText(10, false),
      location: safeText(255, false),
      type: safeText(100, false),
      audience: safeText(100, false),
      hasCommission: z.boolean(),
      editReason: safeText(1000, false).optional(),
      theme: safeText(255, false),
        speakerName: safeText(255, false),
        biblicalReference: safeText(255, false),
        meetingAgenda: safeText(5000, false),
        meetingReason: safeText(2000, false),
        isReligious: z.boolean(),
      }))

    .mutation(async ({ input, ctx }) => {
      const { id, date, editReason, ...data } = input;
      const currentActivity = await db.getActivityById(id);
      if (!currentActivity) throw new TRPCError({ code: "NOT_FOUND", message: "Actividade não encontrada." });
      if (currentActivity.status === "realizada") {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Só o administrador pode editar uma actividade concluída." });
        if (!editReason?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Indique o motivo obrigatório para editar uma actividade concluída." });
      }
      let rules;
      try {
        rules = applyActivityTypeRules(input);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Dados de actividade inválidos." });
      }
      const result = await db.updateActivity(id, {
        ...data,
        date: new Date(date),
        biblicalReference: rules.biblicalReference,
        meetingAgenda: rules.meetingAgenda,
        meetingReason: rules.meetingReason,
        isReligious: rules.isReligious,
      });
      await writeAudit(ctx, "editar", "activity", id, { name: input.name, type: input.type, ...(editReason ? { editReason } : {}) });
      return result;
    }),

  complete: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const scales = await db.listLouvorScales(input.id);
      const pending = scales.filter((scale) => scale.status === "escalado" || scale.status === "confirmado");
      if (pending.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Valide primeiro quem compareceu e quem faltou na escala do Louvor." });
      const result = await db.updateActivity(input.id, { status: "realizada" });
      await writeAudit(ctx, "concluir", "activity", input.id, { louvorScales: scales.length });
      return result;
    }),

  delete: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteActivity(input.id);
      await writeAudit(ctx, "apagar", "activity", input.id);
      return result;
    }),

  commissionList: protectedProcedure
    .input(z.object({ activityId: positiveId }))
    .query(({ input }) => db.getCommissionMembersByActivity(input.activityId)),

  commissionAdd: liderProcedure
    .input(z.object({ activityId: positiveId, memberId: positiveId, role: safeText(100), phone: safeText(40, false) }))
    .mutation(async ({ input, ctx }) => {
      await requireMainMember(input.memberId);
      const result = await db.createCommissionMember(input);
      await writeAudit(ctx, "criar", "commissionMember", undefined, input);
      return result;
    }),

  commissionDelete: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteCommissionMember(input.id);
      await writeAudit(ctx, "apagar", "commissionMember", input.id);
      return result;
    }),

  recordAttendance: oficialProcedure
    .input(
      z.object({
        activityId: positiveId,
        memberId: positiveId,
        isPresent: z.boolean(),
        justification: safeText(1000, false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireMainMember(input.memberId);
      return await db.recordAttendance({
        ...input,
        recordedBy: ctx.user.id,
      });
    }),

  getAttendance: protectedProcedure
    .input(z.object({ activityId: positiveId }))
    .query(async ({ input }) => {
      return await db.getAttendanceByActivity(input.activityId);
    }),

  updateAttendance: oficialProcedure
    .input(z.object({ id: positiveId, isPresent: z.boolean(), justification: safeText(1000, false) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.updateAttendance(input.id, { isPresent: input.isPresent, justification: input.justification ?? null });
      await writeAudit(ctx, "editar", "attendance", input.id, { isPresent: input.isPresent, justification: input.justification });
      return result;
    }),

  deleteAttendance: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteAttendance(input.id);
      await writeAudit(ctx, "apagar", "attendance", input.id);
      return result;
    }),

  getAttendanceStats: protectedProcedure
    .input(z.object({ activityId: positiveId }))
    .query(async ({ input }) => {
      return await db.getAttendanceStats(input.activityId);
    }),
});

// ============ QUOTAS ROUTER ============

const quotasRouter = router({
  getByMember: protectedProcedure
    .input(z.object({ memberId: positiveId }))
    .query(async ({ input }) => {
      return await db.getQuotasByMember(input.memberId);
    }),

  previewPayment: liderProcedure
    .input(z.object({ memberId: positiveId, incomingAmount: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, "Introduza um valor recebido válido.") }))
    .query(async ({ input }) => db.buildQuotaPaymentPlan(input.memberId, input.incomingAmount)),

  recordPayment: liderProcedure
    .input(z.object({ memberId: positiveId, incomingAmount: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, "Introduza um valor recebido válido."), responsibleName: safeText(255) }))
    .mutation(async ({ input, ctx }) => {
      const plan = await db.applyQuotaPayment(input.memberId, input.incomingAmount, ctx.user.id, input.responsibleName.trim());
      await writeAudit(ctx, "criar", "quota_payment_batch", input.memberId, {
        incomingAmount: plan.incomingAmount,
        allocatedAmount: plan.allocatedAmount,
        remainingAmount: plan.remainingAmount,
        allocations: plan.allocations.map((allocation) => ({ month: allocation.month, year: allocation.year, amount: allocation.amount, resultingPaid: allocation.resultingPaid })),
      });
      return plan;
    }),

  getByMonthYear: protectedProcedure
    .input(z.object({ month: z.number().int().min(1).max(12), year: z.number().int().min(2000).max(2100) }))
    .query(async ({ input }) => {
      return await db.getQuotasByMonthYear(input.month, input.year);
    }),

  compliance: protectedProcedure
    .input(z.object({ month: z.number().int().min(1).max(12).optional(), year: z.number().int().min(2000).max(2100) }))
    .query(async ({ input }) => db.getQuotaCompliance(input)),

  list: protectedProcedure.query(() => db.listQuotas()),

  update: financialProcedure
    .input(z.object({ id: positiveId, isPaid: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateQuota(id, data);
      await writeAudit(ctx, "editar", "quota", id, data);
      return result;
    }),

  delete: financialProcedure
    .input(z.object({ id: positiveId }))
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
    .input(z.object({ description: safeText(500), amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor inválido").max(20), date: z.coerce.date(), responsibleName: safeText(255) }))
    .mutation(async ({ input, ctx }) => {
      const { responsibleName, ...rest } = input;
      const result = await db.createOtherIncome({ ...rest, recordedBy: ctx.user.id, responsibleName });
      await writeAudit(ctx, "criar", "otherIncome", undefined, { ...rest, responsibleName });
      return result;
    }),
  update: financialProcedure
    .input(z.object({ id: positiveId, description: safeText(500).optional(), amount: z.string().regex(/^\d+(\.\d{1,2})?$/).max(20).optional(), date: z.coerce.date().optional(), responsibleName: safeText(255).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateOtherIncome(id, data);
      await writeAudit(ctx, "editar", "otherIncome", id, data);
      return result;
    }),
  delete: financialProcedure
    .input(z.object({ id: positiveId }))
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
    .input(z.object({ designation: safeText(1000), quantity: z.number().int().positive().max(1000000), unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço inválido").max(20), date: z.coerce.date(), responsibleName: safeText(255) }))
    .mutation(async ({ input, ctx }) => {
      const { responsibleName, ...rest } = input;
      const totalPrice = (rest.quantity * Number(rest.unitPrice)).toFixed(2);
      const sequence = await db.getNextExpenseSequence();
      const result = await db.createExpense({ ...rest, sequence, totalPrice, recordedBy: ctx.user.id, responsibleName });
      await writeAudit(ctx, "criar", "expense", undefined, { ...rest, totalPrice, responsibleName });
      return result;
    }),
  update: financialProcedure
    .input(z.object({ id: positiveId, designation: safeText(1000).optional(), quantity: z.number().int().positive().max(1000000).optional(), unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).max(20).optional(), date: z.coerce.date().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const totalPrice = data.quantity !== undefined && data.unitPrice !== undefined ? (data.quantity * Number(data.unitPrice)).toFixed(2) : undefined;
      const result = await db.updateExpense(id, { ...data, ...(totalPrice ? { totalPrice } : {}) });
      await writeAudit(ctx, "editar", "expense", id, { ...data, ...(totalPrice ? { totalPrice } : {}) });
      return result;
    }),
  delete: financialProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteExpense(input.id);
      await writeAudit(ctx, "apagar", "expense", input.id);
      return result;
    }),
});

// ============ REPORTS ROUTER ============

const reportsRouter = router({
  list: protectedProcedure.query(() => db.listReports()),
  getByActivity: protectedProcedure.input(z.object({ activityId: positiveId })).query(({ input }) => db.getReportByActivity(input.activityId)),
  create: oficialProcedure
    .input(z.object({ activityId: positiveId, type: z.enum(["ata", "relatorio"]), content: safeText(50000) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createReport({ ...input, generatedBy: ctx.user.id });
      await writeAudit(ctx, "criar", "report", undefined, { activityId: input.activityId, type: input.type });
      return result;
    }),
  update: oficialProcedure
    .input(z.object({ id: positiveId, type: z.enum(["ata", "relatorio"]).optional(), content: safeText(50000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateReport(id, data);
      await writeAudit(ctx, "editar", "report", id, data);
      return result;
    }),
  delete: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteReport(input.id);
      await writeAudit(ctx, "apagar", "report", input.id);
      return result;
    }),
});

// ============ AUDIT ROUTER ============

const auditRouter = router({
  list: liderProcedure.input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional()).query(({ input }) => db.listAuditLogs(input?.limit)),
  update: liderProcedure.input(z.object({ id: positiveId, action: safeText(100, false), entityType: safeText(100, false), details: safeText(10000, false) })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    await db.updateAuditLog(id, data);
    await writeAudit(ctx, "atualizar", "audit_log", id, data);
    return { success: true };
  }),
  delete: liderProcedure.input(z.object({ id: positiveId })).mutation(async ({ input, ctx }) => {
    await db.deleteAuditLog(input.id);
    await writeAudit(ctx, "eliminar", "audit_log", input.id);
    return { success: true };
  }),
  deleteMany: liderProcedure.input(z.object({ ids: z.array(positiveId).min(1).max(250) })).mutation(async ({ input, ctx }) => {
    for (const id of input.ids) await db.deleteAuditLog(id);
    await writeAudit(ctx, "eliminar_em_lote", "audit_log", undefined, { count: input.ids.length });
    return { success: true, count: input.ids.length };
  }),
});

const settingsRouter = router({
  getPublicOrganization: publicProcedure.query(async () => parsePublicOrganizationBranding(await db.getAppSetting("organization"))),
  get: protectedProcedure.input(z.object({ keyName: safeText(120) })).query(async ({ input }) => {
    return await db.getAppSetting(input.keyName);
  }),
  set: liderProcedure.input(z.object({ keyName: safeText(120), keyValue: safeText(20000) })).mutation(async ({ input, ctx }) => {
    await db.setAppSetting(input.keyName, input.keyValue);
    await writeAudit(ctx, "atualizar", "settings", undefined, { keyName: input.keyName });
    return { success: true };
  }),
});

// ============ INCIDENT RESPONSE ROUTER ============

const incidentRouter = router({
  getState: adminProcedure.query(async () => ({
    maintenance: await db.getSystemMaintenanceState(),
    globalSessionRevokedAt: await db.getGlobalSessionRevokedAt(),
  })),

  list: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => db.listSecurityIncidents(input?.limit ?? 100)),

  create: adminProcedure
    .input(z.object({
      category: safeText(100),
      severity: z.enum(["low", "medium", "high", "critical"]),
      title: safeText(255),
      description: safeText(10000),
      source: safeText(255, false),
      affectedRecords: safeText(10000, false),
    }))
    .mutation(async ({ input, ctx }) => {
      const incident = await db.createSecurityIncident({
        category: input.category,
        severity: input.severity,
        title: input.title,
        description: input.description,
        source: input.source ?? null,
        affectedRecords: input.affectedRecords ?? null,
        createdBy: ctx.user.id,
      });
      await writeAudit(ctx, "criar", "security_incident", incident.id, { category: input.category, severity: input.severity, title: input.title });
      return incident;
    }),

  update: adminProcedure
    .input(z.object({
      id: positiveId,
      status: z.enum(["open", "investigating", "contained", "resolved"]).optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      containmentActions: safeText(10000, false),
      resolution: safeText(10000, false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, status, severity, containmentActions, resolution } = input;
      const now = new Date();
      const update: Partial<typeof import("../drizzle/schema").securityIncidents.$inferInsert> = {
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
        ...(containmentActions !== undefined ? { containmentActions: containmentActions ?? null } : {}),
        ...(resolution !== undefined ? { resolution: resolution ?? null } : {}),
        ...(status === "contained" ? { containedAt: now } : {}),
        ...(status === "resolved" ? { resolvedAt: now } : {}),
      };
      await db.updateSecurityIncident(id, update);
      await writeAudit(ctx, "atualizar", "security_incident", id, { status, severity });
      return db.getSecurityIncident(id);
    }),

  setMaintenance: adminProcedure
    .input(z.object({
      enabled: z.boolean(),
      reason: safeText(500, false),
      customMessage: safeText(1000, false),
      estimatedCompletionAt: z.string().datetime({ offset: true }).nullable().optional(),
      incidentId: positiveId.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const state = await db.setSystemMaintenanceState({
        enabled: input.enabled,
        reason: input.reason ?? (input.enabled ? "Manutenção de emergência activada pelo administrador." : ""),
        customMessage: input.customMessage ?? "",
        estimatedCompletionAt: input.estimatedCompletionAt ?? null,
        incidentId: input.incidentId ?? null,
        startedAt: input.enabled ? new Date().toISOString() : null,
        updatedBy: ctx.user.id,
      });
      await writeAudit(ctx, input.enabled ? "activar" : "desactivar", "system_maintenance", input.incidentId, { reason: state.reason });
      return state;
    }),

  revokeAllSessions: adminProcedure.mutation(async ({ ctx }) => {
    const revokedAt = await db.revokeAllSessions();
    await writeAudit(ctx, "revogar", "all_sessions", undefined, { revokedAt });
    return { revokedAt };
  }),

  diagnose: adminProcedure.query(async () => {
    const [maintenance, globalSessionRevokedAt, incidents, recentAudit] = await Promise.all([
      db.getSystemMaintenanceState(),
      db.getGlobalSessionRevokedAt(),
      db.listSecurityIncidents(50),
      db.listAuditLogs(250),
    ]);
    return {
      maintenance,
      globalSessionRevokedAt,
      incidents,
      recentAudit,
      diagnostics: buildIncidentDiagnosis({ maintenance, globalSessionRevokedAt, incidents, auditLogs: recentAudit }),
    };
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
    .input(z.object({ memberIds: z.array(positiveId).min(1).max(200), processName: safeText(180), reason: safeText(300), toGroupId: positiveId.optional() }))
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
          processName: input.processName,
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
      await writeAudit(ctx, "processar", "adult_transfer", undefined, { processName: input.processName, memberIds: input.memberIds, reason: input.reason, toGroupId: input.toGroupId });
      return { success: true, count: selected.length, members: selected };
    }),

  create: liderProcedure
    .input(
      z.object({
        memberId: positiveId,
        fromGroupId: positiveId.optional(),
        toGroupId: positiveId.optional(),
        toChurch: safeText(120).optional(),
        processName: safeText(180, false).optional(),
        reason: safeText(300).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireMainMember(input.memberId);
      const result = await db.createTransfer({
        ...input,
        status: "pendente",
      });
      await writeAudit(ctx, "criar", "transfer", undefined, input);
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: positiveId }))
    .query(async ({ input }) => {
      return await db.getTransferById(input.id);
    }),

  approve: liderProcedure
    .input(z.object({ id: positiveId }))
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
    .input(z.object({ id: positiveId }))
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
    .input(z.object({ memberId: positiveId }))
    .query(async ({ input }) => {
      return await db.getTransfersByMember(input.memberId);
    }),

  delete: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteTransfer(input.id);
      await writeAudit(ctx, "apagar", "transfer", input.id);
      return result;
    }),
});

// ============ HELPER FUNCTIONS ============

async function requireMainMember(memberId: number) {
  const member = await db.getMemberById(memberId);
  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "O membro indicado não existe no cadastro principal." });
  }
  return member;
}

async function requireLouvorMember(louvorMemberId: number) {
  const louvorMember = await db.getLouvorMemberById(louvorMemberId);
  if (!louvorMember?.memberId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "O membro de Louvor indicado não está ligado ao cadastro principal." });
  }
  await requireMainMember(louvorMember.memberId);
  return louvorMember;
}

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
  listMembers: liderProcedure.query(() => db.listLouvorMembers()),
  listScales: liderProcedure.input(z.object({ activityId: positiveId.optional() }).optional()).query(({ input }) => db.listLouvorScales(input?.activityId)),
  createScale: liderProcedure
    .input(z.object({ activityId: positiveId, louvorMemberId: positiveId, roleInScale: safeText(120), songs: safeText(4000, false), status: z.enum(["escalado", "confirmado", "realizado", "ausente"]).default("escalado") }))
    .mutation(async ({ input, ctx }) => {
      await requireLouvorMember(input.louvorMemberId);
      const result = await db.createLouvorScale(input);
      await writeAudit(ctx, "criar", "louvorScale", undefined, input);
      return result;
    }),
  updateScale: liderProcedure
    .input(z.object({ id: positiveId, roleInScale: safeText(120).optional(), songs: safeText(4000, false), status: z.enum(["escalado", "confirmado", "realizado", "ausente"]).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateLouvorScale(id, data);
      await writeAudit(ctx, "editar", "louvorScale", id, data);
      return result;
    }),
  deleteScale: liderProcedure
    .input(z.object({ id: positiveId }))
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
  getByMember: protectedProcedure.input(z.object({ memberId: positiveId })).query(async ({ input }) => {
    return await db.getMemberHistory(input.memberId);
  }),
});



// ============ MATERIALS ROUTER ============

const materialsRouter = router({
  list: protectedProcedure.query(async () => db.listMaterials()),
  create: liderProcedure
    .input(
      z.object({
        name: safeText(255),
        category: safeText(120),
        quantity: z.number().int().min(1).max(1000000).default(1),
        condition: z.enum(["Bom", "Regular", "Precário", "Manutenção"]).default("Bom"),
        custodian: safeText(255),
        location: safeText(255, false),
        purchaseDate: z.coerce.date().optional(),
        notes: safeText(5000, false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const material = await db.createMaterial({
        code: `LEGACY-${randomUUID()}`,
        ...input,
        location: input.location ?? null,
        purchaseDate: input.purchaseDate ?? null,
        notes: input.notes ?? null,
      });
      await writeAudit(ctx, "criar", "material", material.id, { name: input.name, custodian: input.custodian });
      return material;
    }),
  update: liderProcedure
    .input(
      z.object({
        id: positiveId,
        name: safeText(255).optional(),
        category: safeText(120).optional(),
        quantity: z.number().int().min(1).max(1000000).optional(),
        condition: z.enum(["Bom", "Regular", "Precário", "Manutenção"]).optional(),
        custodian: safeText(255).optional(),
        location: safeText(255, false),
        purchaseDate: z.coerce.date().optional(),
        notes: safeText(5000, false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const material = await db.updateMaterial(id, data);
      await writeAudit(ctx, "editar", "material", id, data);
      return material;
    }),
  delete: liderProcedure
    .input(z.object({ id: positiveId }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMaterial(input.id);
      await writeAudit(ctx, "apagar", "material", input.id);
      return { success: true };
    }),
});

// ============ BACKUP ROUTER ============

const backupRouter = router({
  listVersions: adminProcedure.query(async () => db.listBackupVersions()),

  export: adminProcedure
    .input(z.object({ destination: z.enum(["local", "drive"]).default("local"), cloudEmail: safeEmail().optional(), versionLabel: safeText(255, false) }))
    .mutation(async ({ input, ctx }) => {
      if (input.cloudEmail !== undefined) {
        if (input.cloudEmail.trim()) {
          await db.setAppSetting("notification_recipient_email", input.cloudEmail.trim());
        } else {
          await db.setAppSetting("notification_recipient_email", "");
        }
      }
      const version = await db.createBackupVersion({ createdBy: ctx.user.id, destination: input.destination, cloudEmail: input.cloudEmail, versionLabel: input.versionLabel });
      await writeAudit(ctx, "exportar", `backup_${input.destination}`, version.id, { version: version.versionLabel, destination: input.destination, cloudEmail: input.cloudEmail ?? null });
      return { id: version.id, versionLabel: version.versionLabel, destination: version.destination, cloudEmail: version.cloudEmail, fileUrl: version.fileUrl, fileSize: version.fileSize, checksum: version.checksum, message: input.destination === "drive" ? "Backup guardado no armazenamento cloud do sistema. O email foi associado à versão para identificação administrativa." : "Backup preparado para descarregamento local." };
    }),

  restore: adminProcedure
    .input(z.object({ id: positiveId, confirmation: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.restoreBackupVersion(input.id);
      await writeAudit(ctx, "restaurar", "backup", input.id, result);
      return result;
    }),

  schedule: adminProcedure.query(async () => db.getBackupSchedule()),

  saveSchedule: adminProcedure
    .input(z.object({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59).default(0), destination: z.enum(["local", "drive"]).default("local"), cloudEmail: safeEmail().optional(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const current = await db.getBackupSchedule();
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const cron = `0 ${input.minute} ${input.hour} * * *`;
      let taskUid = current?.scheduleCronTaskUid ?? undefined;
      if (input.enabled) {
        const jobs = await listHeartbeatJobs(sessionToken);
        const currentJob = taskUid ? jobs.jobs.find((job) => job.taskUid === taskUid) : undefined;
        if (currentJob) {
          await updateHeartbeatJob(currentJob.taskUid, {
            cron,
            enable: true,
            path: "/api/scheduled/daily-backup",
            description: "Backup diário administrativo da Classe Obreiros de Cristo",
          }, sessionToken);
        } else {
          const job = await createHeartbeatJob({
            name: `daily-backup-${ctx.user.id}`,
            cron,
            path: "/api/scheduled/daily-backup",
            description: "Backup diário administrativo da Classe Obreiros de Cristo",
          }, sessionToken);
          taskUid = job.taskUid;
        }
      } else if (taskUid) {
        const jobs = await listHeartbeatJobs(sessionToken);
        const currentJob = jobs.jobs.find((job) => job.taskUid === taskUid);
        if (currentJob) await updateHeartbeatJob(currentJob.taskUid, { enable: false }, sessionToken);
        else taskUid = undefined;
      }
      // O email de cloud identifica o destino do backup; nunca deve ser reutilizado como destinatário de alertas.
      await db.setAppSetting("notification_recipient_email", "");
      const schedule = await db.createBackupSchedule({ id: current?.id, hour: input.hour, minute: input.minute, destination: input.destination, cloudEmail: input.cloudEmail ?? null, enabled: input.enabled, scheduleCronTaskUid: taskUid ?? null, createdBy: current?.createdBy ?? ctx.user.id });
      await writeAudit(ctx, "configurar", "backup_schedule", schedule.id, { hour: input.hour, minute: input.minute, enabled: input.enabled, destination: input.destination, notificationRecipientConfigured: Boolean(input.cloudEmail) });
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

// ============ DASHBOARD ROUTER ============

const dashboardDateRangeFields = {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida.").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final inválida.").optional(),
};

function validateDashboardDateRange(input: { startDate?: string; endDate?: string }, ctx: z.RefinementCtx) {
  const start = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
  const end = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
  if (start && Number.isNaN(start.getTime())) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Data inicial inválida." });
  if (end && Number.isNaN(end.getTime())) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "Data final inválida." });
  if (start && end && start > end) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "A data final não pode ser anterior à data inicial." });
}

const dashboardDateRangeInput = z.object(dashboardDateRangeFields).superRefine(validateDashboardDateRange);
const dashboardHighlightsInput = z.object({
  ...dashboardDateRangeFields,
  threshold: z.number().min(0).max(100).default(60),
  recentLimit: z.number().int().min(1).max(20).default(7),
}).superRefine(validateDashboardDateRange);

const dashboardRouter = router({
  participationByType: protectedProcedure
    .input(dashboardDateRangeInput)
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
      const endDate = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
      return await db.getParticipationByActivityType({ startDate, endDate });
    }),
  memberParticipationHighlights: protectedProcedure
    .input(dashboardHighlightsInput)
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
      const endDate = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
      return await db.getMemberParticipationHighlights({ threshold: input.threshold, recentLimit: input.recentLimit, startDate, endDate });
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
  materials: materialsRouter,
  louvor: louvorRouter,
  settings: settingsRouter,
  history: historyRouter,
  incident: incidentRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
