import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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
    .mutation(async ({ input }) => {
      const groupId = await assignGroupAutomatically(input.sex);

      return await db.createMember({
        ...input,
        groupId,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      });
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
    .mutation(async ({ input }) => {
      const updateData = {
        ...input.data,
        birthDate: input.data.birthDate ? new Date(input.data.birthDate) : undefined,
      };
      return await db.updateMember(input.id, updateData);
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
    .mutation(async ({ input }) => {
      return await db.createActivity({
        ...input,
        date: new Date(input.date),
        status: "planejada",
      });
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

  getByMonthYear: liderProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      return await db.getQuotasByMonthYear(input.month, input.year);
    }),
});

// ============ TRANSFERS ROUTER ============

const transfersRouter = router({
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
    .mutation(async ({ input }) => {
      return await db.createTransfer({
        ...input,
        status: "pendente",
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getTransferById(input.id);
    }),

  approve: liderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await db.updateTransfer(input.id, {
        status: "aprovada" as const,
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
      });
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

      return await db.updateTransfer(input.id, {
        status: "concluida" as const,
        completedAt: new Date(),
      });
    }),

  getByMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTransfersByMember(input.memberId);
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

// ============ MAIN ROUTER ============

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  members: membersRouter,
  groups: groupsRouter,
  activities: activitiesRouter,
  quotas: quotasRouter,
  transfers: transfersRouter,
});

export type AppRouter = typeof appRouter;
