import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { type Database, withDb } from "../../../db/client.ts";
import {
  definitions,
  spellingChallenges,
  synonyms,
  words,
} from "../../../db/schema.ts";
import {
  executeImport,
  validateConfig,
} from "../../../scripts/importer_core.ts";

/** Filter criteria shared by the words list, count, and bulk selection. */
export interface WordFilter {
  search?: string;
  difficulty?: number;
  isReal?: boolean;
  reviewed?: boolean;
}

function buildWordFilter({ search, difficulty, isReal, reviewed }: WordFilter) {
  // deno-lint-ignore no-explicit-any
  const conditions: any[] = [];
  if (search) {
    conditions.push(ilike(words.value, `%${search}%`));
  }
  if (difficulty !== undefined) {
    conditions.push(eq(words.difficulty, difficulty));
  }
  if (isReal !== undefined) {
    conditions.push(eq(words.isReal, isReal));
  }
  if (reviewed !== undefined) {
    conditions.push(eq(words.reviewed, reviewed));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Returns a user-facing reason if the word is referenced elsewhere (and thus
 * cannot be safely deleted), or null when deletion is safe. Shared by
 * `deleteWord` and `bulkDelete`.
 */
async function findWordReference(
  db: Database,
  id: number,
): Promise<string | null> {
  const synCount = await db
    .select({ count: sql<number>`count(${synonyms.id})::integer` })
    .from(synonyms)
    .where(or(eq(synonyms.wordId, id), eq(synonyms.targetId, id)));
  if ((synCount[0]?.count ?? 0) > 0) {
    return "Word is referenced in synonyms.";
  }

  const spellCount = await db
    .select({ count: sql<number>`count(${spellingChallenges.id})::integer` })
    .from(spellingChallenges)
    .where(eq(spellingChallenges.correctWordId, id));
  if ((spellCount[0]?.count ?? 0) > 0) {
    return "Word is referenced in spelling challenges.";
  }

  const defCount = await db
    .select({ count: sql<number>`count(${definitions.id})::integer` })
    .from(definitions)
    .where(eq(definitions.wordId, id));
  if ((defCount[0]?.count ?? 0) > 0) {
    return "Word is referenced in definitions.";
  }

  // Distractor checking (integer arrays):
  const synDistractors = await db
    .select({ count: sql<number>`count(${synonyms.id})::integer` })
    .from(synonyms)
    .where(sql`${id} = any(${synonyms.distractors})`);
  if ((synDistractors[0]?.count ?? 0) > 0) {
    return "Word is referenced as a distractor in synonyms.";
  }

  const spellDistractors = await db
    .select({ count: sql<number>`count(${spellingChallenges.id})::integer` })
    .from(spellingChallenges)
    .where(sql`${id} = any(${spellingChallenges.distractors})`);
  if ((spellDistractors[0]?.count ?? 0) > 0) {
    return "Word is referenced as a distractor in spelling challenges.";
  }

  const defDistractors = await db
    .select({ count: sql<number>`count(${definitions.id})::integer` })
    .from(definitions)
    .where(sql`${id} = any(${definitions.distractors})`);
  if ((defDistractors[0]?.count ?? 0) > 0) {
    return "Word is referenced as a distractor in definitions.";
  }

  return null;
}

export interface AdminWordsLoader {
  listWords(
    params: WordFilter & { page: number; limit: number },
  ): Promise<{ words: (typeof words.$inferSelect)[]; totalCount: number }>;

  /** Returns the ids of every word matching the filter (no pagination). */
  findWordIds(filter: WordFilter): Promise<number[]>;

  getWord(id: number): Promise<typeof words.$inferSelect | null>;
  createWord(data: {
    value: string;
    isReal: boolean;
    difficulty: number;
  }): Promise<void>;
  updateWord(
    id: number,
    data: { value: string; isReal: boolean; difficulty: number },
  ): Promise<void>;
  deleteWord(id: number): Promise<{ success: boolean; error?: string }>;
  bulkSetReviewed(ids: number[], reviewed: boolean): Promise<number>;
  bulkSetIsReal(ids: number[], isReal: boolean): Promise<number>;
  bulkDelete(
    ids: number[],
  ): Promise<{ deleted: number; skipped: { id: number; reason: string }[] }>;
  importWords(
    fileContent: string,
    configJson: string,
    dryRun: boolean,
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: { line: number; reason: string }[];
  }>;
}

export const databaseAdminWordsLoader: AdminWordsLoader = {
  listWords({ search, difficulty, isReal, reviewed, page, limit }) {
    return withDb(async (db) => {
      const whereClause = buildWordFilter({
        search,
        difficulty,
        isReal,
        reviewed,
      });
      const offset = (page - 1) * limit;

      const totalCountResult = await db
        .select({ count: sql<number>`count(${words.id})::integer` })
        .from(words)
        .where(whereClause);
      const totalCount = totalCountResult[0]?.count ?? 0;

      const result = await db
        .select()
        .from(words)
        .where(whereClause)
        .orderBy(words.id)
        .limit(limit)
        .offset(offset);

      return { words: result, totalCount };
    });
  },

  findWordIds(filter) {
    return withDb(async (db) => {
      const rows = await db
        .select({ id: words.id })
        .from(words)
        .where(buildWordFilter(filter))
        .orderBy(words.id);
      return rows.map((r) => r.id);
    });
  },

  getWord(id) {
    return withDb(async (db) => {
      const result = await db
        .select()
        .from(words)
        .where(eq(words.id, id))
        .limit(1);
      return result[0] ?? null;
    });
  },

  createWord({ value, isReal, difficulty }) {
    return withDb(async (db) => {
      await db.insert(words).values({ value, isReal, difficulty });
    });
  },

  updateWord(id, { value, isReal, difficulty }) {
    return withDb(async (db) => {
      await db
        .update(words)
        .set({ value, isReal, difficulty })
        .where(eq(words.id, id));
    });
  },

  deleteWord(id) {
    return withDb(async (db) => {
      const reason = await findWordReference(db, id);
      if (reason) {
        return { success: false, error: reason };
      }
      await db.delete(words).where(eq(words.id, id));
      return { success: true };
    });
  },

  bulkSetReviewed(ids, reviewed) {
    return withDb(async (db) => {
      if (ids.length === 0) return 0;
      const updated = await db
        .update(words)
        .set({ reviewed, reviewedAt: reviewed ? new Date() : null })
        .where(inArray(words.id, ids))
        .returning({ id: words.id });
      return updated.length;
    });
  },

  bulkSetIsReal(ids, isReal) {
    return withDb(async (db) => {
      if (ids.length === 0) return 0;
      const updated = await db
        .update(words)
        .set({ isReal })
        .where(inArray(words.id, ids))
        .returning({ id: words.id });
      return updated.length;
    });
  },

  bulkDelete(ids) {
    return withDb(async (db) => {
      const skipped: { id: number; reason: string }[] = [];
      let deleted = 0;
      for (const id of ids) {
        const reason = await findWordReference(db, id);
        if (reason) {
          skipped.push({ id, reason });
          continue;
        }
        await db.delete(words).where(eq(words.id, id));
        deleted++;
      }
      return { deleted, skipped };
    });
  },

  importWords(fileContent, configJson, dryRun) {
    return withDb(async (db) => {
      let rawConfig: unknown;
      try {
        rawConfig = JSON.parse(configJson);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new Error("Invalid configuration JSON: " + errMsg);
      }
      const config = validateConfig(rawConfig);
      return await executeImport(db, fileContent, config, dryRun);
    });
  },
};
