import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "../../../db/client.ts";
import { words } from "../../../db/schema.ts";

export interface AdminReviewLoader {
  getNextUnreviewed(
    afterId?: number,
  ): Promise<typeof words.$inferSelect | null>;
  skipWord(id: number): Promise<typeof words.$inferSelect | null>;
  reviewWord(
    id: number,
    data: { value: string; isReal: boolean; difficulty: number },
  ): Promise<void>;
  progress(): Promise<{ reviewed: number; total: number; remaining: number }>;
}

export const databaseAdminReviewLoader: AdminReviewLoader = {
  async getNextUnreviewed(afterId?: number) {
    if (afterId !== undefined) {
      const nextWords = await db
        .select()
        .from(words)
        .where(and(eq(words.reviewed, false), gt(words.id, afterId)))
        .orderBy(words.id)
        .limit(1);
      if (nextWords.length > 0) {
        return nextWords[0];
      }
    }
    const firstWords = await db
      .select()
      .from(words)
      .where(eq(words.reviewed, false))
      .orderBy(words.id)
      .limit(1);
    return firstWords[0] || null;
  },

  skipWord(id: number) {
    return this.getNextUnreviewed(id);
  },

  async reviewWord(id, { value, isReal, difficulty }) {
    const trimmedVal = value.trim().toLowerCase();
    if (!trimmedVal) {
      throw new Error("Word value cannot be empty");
    }
    if (difficulty < 1 || difficulty > 5) {
      throw new Error("Difficulty must be between 1 and 5");
    }

    const existing = await db
      .select()
      .from(words)
      .where(and(eq(words.value, trimmedVal), ne(words.id, id)))
      .limit(1);
    if (existing.length > 0) {
      throw new Error(`Word '${trimmedVal}' already exists`);
    }

    await db
      .update(words)
      .set({
        value: trimmedVal,
        isReal,
        difficulty,
        reviewed: true,
        reviewedAt: new Date(),
      })
      .where(eq(words.id, id));
  },

  async progress() {
    const allWords = await db
      .select()
      .from(words);
    const total = allWords.length;
    const reviewed = allWords.filter((w) => w.reviewed).length;
    const remaining = total - reviewed;
    return { reviewed, total, remaining };
  },
};
