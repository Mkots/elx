import { eq } from "drizzle-orm";
import { withDb } from "../../../db/client.ts";
import {
  definitions,
  spellingChallenges,
  synonyms,
  words,
} from "../../../db/schema.ts";

export interface AdminChallengesLoader {
  listSynonyms(): Promise<(typeof synonyms.$inferSelect)[]>;
  listSpelling(): Promise<(typeof spellingChallenges.$inferSelect)[]>;
  listDefinitions(): Promise<(typeof definitions.$inferSelect)[]>;

  getSynonym(id: number): Promise<typeof synonyms.$inferSelect | null>;
  getSpelling(
    id: number,
  ): Promise<typeof spellingChallenges.$inferSelect | null>;
  getDefinition(id: number): Promise<typeof definitions.$inferSelect | null>;

  createSynonym(data: {
    wordId: number;
    targetId: number;
    relationType: string;
    distractors: number[];
  }): Promise<void>;
  createSpelling(data: {
    contextSentence: string;
    correctWordId: number;
    distractors: number[];
  }): Promise<void>;
  createDefinition(data: {
    wordId: number;
    definitionText: string;
    distractors: number[];
  }): Promise<void>;

  updateSynonym(
    id: number,
    data: {
      wordId: number;
      targetId: number;
      relationType: string;
      distractors: number[];
    },
  ): Promise<void>;
  updateSpelling(
    id: number,
    data: {
      contextSentence: string;
      correctWordId: number;
      distractors: number[];
    },
  ): Promise<void>;
  updateDefinition(
    id: number,
    data: {
      wordId: number;
      definitionText: string;
      distractors: number[];
    },
  ): Promise<void>;

  deleteSynonym(id: number): Promise<void>;
  deleteSpelling(id: number): Promise<void>;
  deleteDefinition(id: number): Promise<void>;

  getAllWords(): Promise<{ id: number; value: string }[]>;
}

export const databaseAdminChallengesLoader: AdminChallengesLoader = {
  listSynonyms() {
    return withDb((db) => db.select().from(synonyms).orderBy(synonyms.id));
  },
  listSpelling() {
    return withDb((db) =>
      db.select().from(spellingChallenges).orderBy(spellingChallenges.id)
    );
  },
  listDefinitions() {
    return withDb((db) =>
      db.select().from(definitions).orderBy(definitions.id)
    );
  },

  getSynonym(id) {
    return withDb(async (db) => {
      const result = await db.select().from(synonyms).where(eq(synonyms.id, id))
        .limit(1);
      return result[0] ?? null;
    });
  },
  getSpelling(id) {
    return withDb(async (db) => {
      const result = await db.select().from(spellingChallenges).where(
        eq(spellingChallenges.id, id),
      ).limit(1);
      return result[0] ?? null;
    });
  },
  getDefinition(id) {
    return withDb(async (db) => {
      const result = await db.select().from(definitions).where(
        eq(definitions.id, id),
      ).limit(1);
      return result[0] ?? null;
    });
  },

  createSynonym(data) {
    return withDb(async (db) => {
      await db.insert(synonyms).values(data);
    });
  },
  createSpelling(data) {
    return withDb(async (db) => {
      await db.insert(spellingChallenges).values(data);
    });
  },
  createDefinition(data) {
    return withDb(async (db) => {
      await db.insert(definitions).values(data);
    });
  },

  updateSynonym(id, data) {
    return withDb(async (db) => {
      await db.update(synonyms).set(data).where(eq(synonyms.id, id));
    });
  },
  updateSpelling(id, data) {
    return withDb(async (db) => {
      await db.update(spellingChallenges).set(data).where(
        eq(spellingChallenges.id, id),
      );
    });
  },
  updateDefinition(id, data) {
    return withDb(async (db) => {
      await db.update(definitions).set(data).where(eq(definitions.id, id));
    });
  },

  deleteSynonym(id) {
    return withDb(async (db) => {
      await db.delete(synonyms).where(eq(synonyms.id, id));
    });
  },
  deleteSpelling(id) {
    return withDb(async (db) => {
      await db.delete(spellingChallenges).where(eq(spellingChallenges.id, id));
    });
  },
  deleteDefinition(id) {
    return withDb(async (db) => {
      await db.delete(definitions).where(eq(definitions.id, id));
    });
  },

  getAllWords() {
    return withDb((db) =>
      db.select({ id: words.id, value: words.value }).from(words)
        .orderBy(words.value)
    );
  },
};
