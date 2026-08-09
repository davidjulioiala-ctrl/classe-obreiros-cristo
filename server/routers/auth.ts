import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  authenticateUser,
  createUser,
  updateUser,
  getUserById,
  getAllUsers,
  deleteUser,
} from "../auth";

export const authRouter = router({
  // Login with username and password
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await authenticateUser(input.username, input.password);
      if (!user) {
        throw new Error("Invalid credentials");
      }
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          churchRole: user.churchRole,
        },
      };
    }),

  // Create new user
  createUser: publicProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
        email: z.string().email(),
        churchRole: z.enum(["lider", "oficial", "louvor", "membro"]),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      const user = await createUser(
        input.username,
        input.password,
        input.name,
        input.email,
        input.churchRole,
        input.role
      );

      if (!user) {
        throw new Error("Failed to create user");
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          churchRole: user.churchRole,
        },
      };
    }),

  // Update user
  updateUser: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        churchRole: z.enum(["lider", "oficial", "louvor", "membro"]).optional(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, ...updates } = input;
      const user = await updateUser(userId, updates);

      if (!user) {
        throw new Error("Failed to update user");
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          churchRole: user.churchRole,
          isActive: user.isActive,
        },
      };
    }),

  // Get user by ID
  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        churchRole: user.churchRole,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
    }),

  // Get all users
  getAllUsers: publicProcedure.query(async () => {
    const allUsers = await getAllUsers();
    return allUsers.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      churchRole: user.churchRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }),

  // Delete user
  deleteUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const success = await deleteUser(input.userId);
      if (!success) {
        throw new Error("Failed to delete user");
      }
      return { success: true };
    }),
});
