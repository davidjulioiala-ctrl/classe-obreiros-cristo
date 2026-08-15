import { getDb } from '../server/db';
import { users } from '../drizzle/schema';
import { not, eq } from 'drizzle-orm';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function run() {
  const db = await getDb();
  if (!db) {
    console.error('No database connection');
    process.exit(1);
  }
  
  await db.delete(users).where(not(eq(users.username, 'admin')));
  
  const existing = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  const passwordHash = hashPassword('admin123');
  
  if (existing.length > 0) {
    await db.update(users)
      .set({
        passwordHash,
        role: 'admin',
        name: 'Administrador',
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: null,
        twoFactorPending: false
      })
      .where(eq(users.username, 'admin'));
    console.log('Admin user updated with admin123');
  } else {
    await db.insert(users).values({
      username: 'admin',
      passwordHash,
      role: 'admin',
      name: 'Administrador',
      twoFactorEnabled: false
    });
    console.log('Admin user created with admin123');
  }
}

run().catch(console.error);
