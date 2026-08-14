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
  deleteUser,
} from "../auth";
import { createAuditLog } from "../db";
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
        password: z.string().min(8).max(200),
        name: safeText(255),
        email: safeEmail(),
        churchRole: z.enum(["lider", "oficial", "louvor", "financeiro", "financeira", "membro"]),
        role: z.enum(["user", "admin"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await createUser(
        input.username,
        input.password,
        input.name,
        input.email ?? "",
        input.churchRole,
        input.role,
      );
      if (!user) {
        throw new TRPCError({ code: "CONFLICT", message: "Não foi possível criar o utilizador. Verifique se o nome de utilizador já existe." });
      }
      await createAuditLog({ userId: ctx.user.id, action: "criar", entityType: "user", entityId: user.id, details: JSON.stringify({ username: user.username, churchRole: user.churchRole, role: user.role }) });
      return { success: true, user: safeUser(user) };
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
        password: z.string().min(8).max(200).optional(),
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
      await createAuditLog({ userId: ctx.user.id, action: "editar", entityType: "user", entityId: user.id, details: JSON.stringify({ ...rest, churchRole, ...(password ? { passwordAlterada: true } : {}) }) });
      return { success: true, user: safeUser(user) };
    }),

  getUserById: adminProcedure
    .input(z.object({ userId: positiveId }))
    .query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      return safeUser(user);
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
      await createAuditLog({ userId: ctx.user.id, action: "apagar", entityType: "user", entityId: input.userId });
      return { success: true } as const;
    }),
});
