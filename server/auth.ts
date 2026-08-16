import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { decryptSensitive, encryptSensitive } from "./_core/fieldEncryption";
import { serializeRecoveryCodes } from "./_core/twoFactor";

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

export type UserCreationFailure = "duplicate_username" | "duplicate_email" | "database";

export class UserCreationError extends Error {
  constructor(public readonly reason: UserCreationFailure) {
    super(reason === "duplicate_username"
      ? "O nome de utilizador já existe."
      : reason === "duplicate_email"
        ? "O email já está associado a outro utilizador."
        : "Não foi possível guardar o utilizador na base de dados.");
    this.name = "UserCreationError";
  }
}

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
    const normalizedUsername = username.trim().toLowerCase();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
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

export async function getUserCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const rows = await db.select({ id: users.id }).from(users).limit(1);
    return rows.length;
  } catch (error) {
    console.error("[Auth] User count failed:", error);
    return 0;
  }
}

export async function createUser(
  username: string,
  password: string,
  name: string,
  email: string,
  churchRole: "lider" | "oficial" | "louvor" | "financeiro" | "financeira" | "membro" = "membro",
  role: "user" | "admin" = "user",
  isActive: boolean = true,
  suspendReason: string | null = null
): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Auth] Database not available");
    return null;
  }

  try {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase() || null;
    const existingUsername = await db.select({ id: users.id }).from(users).where(eq(users.username, normalizedUsername)).limit(1);
    if (existingUsername.length > 0) throw new UserCreationError("duplicate_username");
    if (normalizedEmail) {
      const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existingEmail.length > 0) throw new UserCreationError("duplicate_email");
    }

    const hashedPassword = await hashPassword(password);
    await db.insert(users).values({
      username: normalizedUsername,
      password: hashedPassword,
      name: name.trim(),
      email: normalizedEmail,
      loginMethod: "local",
      role,
      churchRole,
      isActive,
      suspendReason: isActive ? null : suspendReason,
    });

    const createdUser = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (createdUser.length === 0) throw new UserCreationError("database");
    return createdUser[0];
  } catch (error) {
    if (error instanceof UserCreationError) throw error;
    console.error("[Auth] User creation failed:", error);
    throw new UserCreationError("database");
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
      suspendReason?: string | null;
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
    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
      if (updates.isActive) {
        updateData.suspendReason = null;
      }
    }
    if (updates.suspendReason !== undefined) updateData.suspendReason = updates.suspendReason;
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

export async function getTwoFactorSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select({
      id: users.id,
      role: users.role,
      username: users.username,
      twoFactorEnabled: users.twoFactorEnabled,
      twoFactorSecret: users.twoFactorSecret,
      twoFactorRecoveryCodes: users.twoFactorRecoveryCodes,
    }).from(users).where(eq(users.id, userId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      role: row.role,
      username: row.username,
      enabled: row.twoFactorEnabled,
      secret: decryptSensitive(row.twoFactorSecret),
      recoveryCodes: decryptSensitive(row.twoFactorRecoveryCodes),
    };
  } catch (error) {
    console.error("[Auth] Get 2FA settings failed:", error);
    return null;
  }
}

export async function saveTwoFactorSetup(userId: number, secret: string, recoveryCodes: string[]) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: encryptSensitive(secret),
      twoFactorRecoveryCodes: encryptSensitive(serializeRecoveryCodes(recoveryCodes)),
      twoFactorConfiguredAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Auth] Save 2FA setup failed:", error);
    return false;
  }
}

export async function enableTwoFactor(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ twoFactorEnabled: true, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Auth] Enable 2FA failed:", error);
    return false;
  }
}

export async function disableTwoFactor(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const current = await getUserById(userId);
    if (!current) return false;
    await db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
      twoFactorConfiguredAt: null,
      sessionVersion: (current.sessionVersion ?? 1) + 1,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Auth] Disable 2FA failed:", error);
    return false;
  }
}

export async function updateTwoFactorRecoveryCodes(userId: number, serializedCodes: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ twoFactorRecoveryCodes: encryptSensitive(serializedCodes), updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Auth] Update 2FA recovery codes failed:", error);
    return false;
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
