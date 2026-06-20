import { and, eq, ilike, or, sql } from "drizzle-orm";
import { withDb } from "../../../db/client.ts";
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

export interface AdminWordsLoader {
  listWords(params: {
    search?: string;
    difficulty?: number;
    isReal?: boolean;
    page: number;
    limit: number;
  }): Promise<{ words: (typeof words.$inferSelect)[]; totalCount: number }>;

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
  listWords({ search, difficulty, isReal, page, limit }) {
    return withDb(async (db) => {
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

      const whereClause = conditions.length > 0
        ? and(...conditions)
        : undefined;
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
      // Reference checks to prevent foreign key errors:
      const synCount = await db
        .select({ count: sql<number>`count(${synonyms.id})::integer` })
        .from(synonyms)
        .where(or(eq(synonyms.wordId, id), eq(synonyms.targetId, id)));
      if ((synCount[0]?.count ?? 0) > 0) {
        return { success: false, error: "Word is referenced in synonyms." };
      }

      const spellCount = await db
        .select({
          count: sql<number>`count(${spellingChallenges.id})::integer`,
        })
        .from(spellingChallenges)
        .where(eq(spellingChallenges.correctWordId, id));
      if ((spellCount[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced in spelling challenges.",
        };
      }

      const defCount = await db
        .select({ count: sql<number>`count(${definitions.id})::integer` })
        .from(definitions)
        .where(eq(definitions.wordId, id));
      if ((defCount[0]?.count ?? 0) > 0) {
        return { success: false, error: "Word is referenced in definitions." };
      }

      // Distractor checking (integer arrays):
      const synDistractors = await db
        .select({ count: sql<number>`count(${synonyms.id})::integer` })
        .from(synonyms)
        .where(sql`${id} = any(${synonyms.distractors})`);
      if ((synDistractors[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced as a distractor in synonyms.",
        };
      }

      const spellDistractors = await db
        .select({
          count: sql<number>`count(${spellingChallenges.id})::integer`,
        })
        .from(spellingChallenges)
        .where(sql`${id} = any(${spellingChallenges.distractors})`);
      if ((spellDistractors[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced as a distractor in spelling challenges.",
        };
      }

      const defDistractors = await db
        .select({ count: sql<number>`count(${definitions.id})::integer` })
        .from(definitions)
        .where(sql`${id} = any(${definitions.distractors})`);
      if ((defDistractors[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced as a distractor in definitions.",
        };
      }

      await db.delete(words).where(eq(words.id, id));
      return { success: true };
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
