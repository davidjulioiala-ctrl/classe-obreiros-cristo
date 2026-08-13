import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";

// Simple hash function (in production, use bcrypt)
export async function hashPassword(password: string): Promise<string> {
  // For demo purposes, we'll use a simple approach
  // In production, use bcrypt: import bcrypt from 'bcrypt'
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return null;
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (user.length === 0) {
      return null;
    }

    const foundUser = user[0];
    if (!foundUser.password || !foundUser.isActive) {
      return null;
    }

    const isValid = await verifyPassword(password, foundUser.password);
    if (!isValid) {
      return null;
    }

    return foundUser;
  } catch (error) {
    console.error("[Auth] Authentication failed:", error);
    return null;
  }
}

export async function createUser(
  username: string,
  password: string,
  name: string,
  email: string,
  churchRole: "lider" | "oficial" | "louvor" | "financeiro" | "financeira" | "membro" = "membro",
  role: "user" | "admin" = "user"
): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return null;
  }

  try {
    const hashedPassword = await hashPassword(password);

    await db.insert(users).values({
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      loginMethod: "local",
      role,
      churchRole,
      isActive: true,
    });

    // Fetch and return the created user
    const createdUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);

    return createdUser.length > 0 ? createdUser[0] : null;
  } catch (error) {
    console.error("[Auth] User creation failed:", error);
    return null;
  }
}

export async function updateUser(
  userId: number,
  updates: {
    name?: string;
    email?: string;
    churchRole?: "lider" | "oficial" | "louvor" | "financeiro" | "financeira" | "membro";
    role?: "user" | "admin";
    isActive?: boolean;
    password?: string;
  }
): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return null;
  }

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.churchRole) updateData.churchRole = updates.churchRole;
    if (updates.role) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.password) {
      updateData.password = await hashPassword(updates.password);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    // Fetch and return the updated user
    const updatedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return updatedUser.length > 0 ? updatedUser[0] : null;
  } catch (error) {
    console.error("[Auth] User update failed:", error);
    return null;
  }
}

export async function getUserById(
  userId: number
): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return null;
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user.length > 0 ? user[0] : null;
  } catch (error) {
    console.error("[Auth] Get user failed:", error);
    return null;
  }
}

export async function getAllUsers(): Promise<(typeof users.$inferSelect)[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return [];
  }

  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("[Auth] Get all users failed:", error);
    return [];
  }
}

export async function deleteUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return false;
  }

  try {
    await db.delete(users).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Auth] User deletion failed:", error);
    return false;
  }
}
