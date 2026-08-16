import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  authenticateUser,
  createUser,
  updateUser,
  getUserById,
  getAllUsers,
  UserCreationError,
  deleteUser,
} from "../auth";
import * as db from "../db";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure, positiveId, safeEmail, safeText } from "../_core/security";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem gerir utilizadores",
    });
  }
  return next({ ctx });
});

const safeUser = (user: any) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  churchRole: user.churchRole,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastSignedIn: user.lastSignedIn,
  twoFactorEnabled: !!user.twoFactorEnabled,
});

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? safeUser(ctx.user) : null)),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  login: publicProcedure
    .input(z.object({ username: safeText(100), password: z.string().min(1).max(200) }))
    .mutation(async ({ input, ctx }) => {
      const rate = checkLoginRateLimit(ctx.req, input.username);
      if (!rate.allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas tentativas. Tente novamente mais tarde." });
      }
      const user = await authenticateUser(input.username, input.password);
      if (!user) {
        recordLoginFailure(ctx.req, input.username);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      }
      clearLoginFailures(ctx.req, input.username);
      return { success: true, user: safeUser(user) };
    }),

  createUser: adminProcedure
    .input(
      z.object({
        username: safeText(100),
        password: z.string().min(6).max(200),
        name: safeText(255),
        email: safeEmail(),
        churchRole: z.enum(["lider", "oficial", "louvor", "financeiro", "financeira", "membro"]).optional(),
        role: z.enum(["user", "admin"]),
        isActive: z.boolean().optional(),
        suspendReason: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await createUser(
          input.username,
          input.password,
          input.name,
          input.email ?? "",
          input.churchRole ?? "membro",
          input.role,
          input.isActive ?? true,
          input.suspendReason ?? null,
        );
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o utilizador. Tente novamente." });
        }
        await db.createAuditLog({ userId: ctx.user.id, action: "criar", entityType: "user", entityId: user.id, details: JSON.stringify({ username: user.username, churchRole: user.churchRole, role: user.role }) });
        return { success: true, user: safeUser(user) };
      } catch (error) {
        if (error instanceof UserCreationError) {
          throw new TRPCError({
            code: error.reason === "database" ? "INTERNAL_SERVER_ERROR" : "CONFLICT",
            message: error.message,
          });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o utilizador. Tente novamente." });
      }
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: positiveId,
        username: safeText(100).optional(),
        name: safeText(255).optional(),
        email: safeEmail().optional(),
        churchRole: z.enum(["lider", "oficial", "louvor", "financeiro", "financeira", "membro"]).optional(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
        suspendReason: z.string().max(500).nullable().optional(),
        password: z.string().min(6).max(200).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id && input.isActive === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode desativar a própria conta." });
      }
      if (input.userId === ctx.user.id && input.role === "user") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode remover a própria função de administrador." });
      }
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      if (target.role === "admin" && input.role === "user") {
        const admins = (await getAllUsers()).filter((candidate) => candidate.role === "admin" && candidate.isActive);
        if (admins.length <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode remover o último administrador activo." });
      }
      const { userId, churchRole, password, ...rest } = input;
      const user = await updateUser(userId, {
        ...rest,
        ...(password ? { password } : {}),
        churchRole,
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      await db.createAuditLog({ userId: ctx.user.id, action: "editar", entityType: "user", entityId: user.id, details: JSON.stringify({ ...rest, churchRole, ...(password ? { passwordAlterada: true } : {}) }) });
      return { success: true, user: safeUser(user) };
    }),

  getUserById: adminProcedure
    .input(z.object({ userId: positiveId }))
    .query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      return safeUser(user);
    }),

  getUserAuditHistory: adminProcedure
    .input(z.object({ userId: positiveId }))
    .query(async ({ input }) => {
      return await db.getUserAuditHistory(input.userId);
    }),

  getAllUsers: adminProcedure.query(async () => {
    const allUsers = await getAllUsers();
    return allUsers.map(safeUser);
  }),

  deleteUser: adminProcedure
    .input(z.object({ userId: positiveId }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode eliminar a própria conta." });
      }
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      if (target.role === "admin") {
        const admins = (await getAllUsers()).filter((candidate) => candidate.role === "admin" && candidate.isActive);
        if (admins.length <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode eliminar o último administrador activo." });
      }
      const success = await deleteUser(input.userId);
      if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      await db.createAuditLog({ userId: ctx.user.id, action: "apagar", entityType: "user", entityId: input.userId });
      return { success: true } as const;
    }),

  adminResetTwoFactor: adminProcedure
    .input(z.object({ userId: positiveId }))
    .mutation(async ({ input, ctx }) => {
      const { disableTwoFactor } = await import("../auth");
      const success = await disableTwoFactor(input.userId);
      if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      await db.createAuditLog({ userId: ctx.user.id, action: "reset_2fa", entityType: "user", entityId: input.userId });
      return { success: true } as const;
    }),

  getTwoFactorPolicy: protectedProcedure.query(async () => {
    const raw = await db.getAppSetting("global_two_factor_required");
    try {
      if (raw) {
        const parsed = JSON.parse(raw);
        return { required: Boolean(parsed.required) };
      }
    } catch {}
    return { required: false };
  }),

  setTwoFactorPolicy: adminProcedure
    .input(z.object({ required: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await db.setAppSetting("global_two_factor_required", JSON.stringify({ required: input.required }));
      await db.createAuditLog({ userId: ctx.user.id, action: input.required ? "ativar_2fa_global" : "desativar_2fa_global", entityType: "setting", details: JSON.stringify({ required: input.required }) });
      return { success: true, required: input.required };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: safeText(255).optional(),
        email: safeEmail().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await updateUser(ctx.user.id, input);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      await db.createAuditLog({ userId: ctx.user.id, action: "editar", entityType: "user", entityId: user.id, details: JSON.stringify({ selfUpdate: true, ...input }) });
      return { success: true, user: safeUser(user) };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1).max(200),
        newPassword: z.string().min(8).max(200),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentFullUser = await getUserById(ctx.user.id);
      if (!currentFullUser) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      const { authenticateUser } = await import("../auth");
      const verified = await authenticateUser(currentFullUser.username ?? "", input.currentPassword);
      if (!verified) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "A senha atual está incorreta." });
      }
      const user = await updateUser(ctx.user.id, { password: input.newPassword });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      await db.createAuditLog({ userId: ctx.user.id, action: "editar", entityType: "user", entityId: user.id, details: JSON.stringify({ passwordChanged: true }) });
      return { success: true } as const;
    }),
});
