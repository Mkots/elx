import { eq, lt } from "drizzle-orm";
import { db } from "../client.ts";
import { adminSessions } from "../schema.ts";

export type AdminSession = typeof adminSessions.$inferSelect;

export async function purgeExpired(now = new Date()): Promise<void> {
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
}

export async function getAdminSession(
  sessionId: string,
): Promise<AdminSession | null> {
  await purgeExpired();
  const rows = await db.select()
    .from(adminSessions)
    .where(eq(adminSessions.id, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminSession(
  sessionId: string,
  username: string,
  expiresAt: Date,
): Promise<void> {
  await purgeExpired();
  await db.insert(adminSessions).values({
    id: sessionId,
    username,
    expiresAt,
  });
}

export async function deleteAdminSession(sessionId: string): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
}
