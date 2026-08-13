import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function derivePasswordKey(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_OPTIONS, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}
const PASSWORD_SCHEME = "scrypt:v1";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePasswordKey(password, salt, SCRYPT_KEY_LENGTH);
  return `${PASSWORD_SCHEME}:${salt.toString("base64url")}:${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith(`${PASSWORD_SCHEME}:`)) {
    const [, , saltValue, keyValue] = hash.split(":");
    if (!saltValue || !keyValue) return false;
    try {
      const salt = Buffer.from(saltValue, "base64url");
      const expected = Buffer.from(keyValue, "base64url");
      const actual = await derivePasswordKey(password, salt, expected.length);
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // One-time compatibility path for legacy SHA-256 records. A successful
  // login upgrades the record to scrypt in authenticateUser below.
  if (!/^[a-f0-9]{64}$/i.test(hash)) return false;
  const legacy = createHash("sha256").update(password, "utf8").digest("hex");
  const actual = Buffer.from(legacy, "utf8");
  const expected = Buffer.from(hash.toLowerCase(), "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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

    if (!foundUser.password.startsWith(`${PASSWORD_SCHEME}:`)) {
      const upgradedPassword = await hashPassword(password);
      await db.update(users).set({ password: upgradedPassword, sessionVersion: (foundUser.sessionVersion ?? 1) + 1, updatedAt: new Date() }).where(eq(users.id, foundUser.id));
      foundUser.password = upgradedPassword;
      foundUser.sessionVersion = (foundUser.sessionVersion ?? 1) + 1;
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
    username?: string;
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

    if (updates.username) updateData.username = updates.username.trim().toLowerCase();
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.churchRole) updateData.churchRole = updates.churchRole;
    if (updates.role) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.password) {
      updateData.password = await hashPassword(updates.password);
      const currentUser = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
      updateData.sessionVersion = (currentUser[0]?.sessionVersion ?? 1) + 1;
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
