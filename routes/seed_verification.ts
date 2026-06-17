import { Hono } from "@hono/hono";
import { createDatabase } from "../db/client.ts";
import {
  definitions,
  spellingChallenges,
  synonyms,
  words,
} from "../db/schema.ts";

type Database = ReturnType<typeof createDatabase>["db"];

export interface SeedWordVerificationItem {
  id: number;
  value: string;
  isReal: boolean;
  difficulty: number;
}

export interface SeedSynonymVerificationItem {
  id: number;
  prompt: string;
  target: string;
  relationType: string;
  distractors: string[];
}

export interface SeedSpellingVerificationItem {
  id: number;
  contextSentence: string;
  correctWord: string;
  distractors: string[];
}

export interface SeedMeaningVerificationItem {
  id: number;
  word: string;
  definitionText: string;
  distractors: string[];
}

export interface SeedVerificationLoader {
  loadWords(): Promise<SeedWordVerificationItem[]>;
  loadSynonyms(): Promise<SeedSynonymVerificationItem[]>;
  loadSpelling(): Promise<SeedSpellingVerificationItem[]>;
  loadMeanings(): Promise<SeedMeaningVerificationItem[]>;
}

async function withDatabase<T>(
  run: (db: Database) => Promise<T>,
): Promise<T> {
  const { client, db } = createDatabase();

  try {
    return await run(db);
  } finally {
    await client.end();
  }
}

function requireWordValue(
  byId: Map<number, string>,
  wordId: number,
  source: string,
): string {
  const value = byId.get(wordId);
  if (!value) {
    throw new Error(`Missing word ${wordId} referenced by ${source}`);
  }
  return value;
}

function mapWordIdsToValues(
  byId: Map<number, string>,
  wordIds: number[],
  source: string,
): string[] {
  return wordIds.map((wordId) => requireWordValue(byId, wordId, source));
}

async function loadWordMap(db: Database): Promise<Map<number, string>> {
  const allWords = await db.select({
    id: words.id,
    value: words.value,
  }).from(words);

  return new Map(allWords.map((word) => [word.id, word.value]));
}

export const databaseSeedVerificationLoader: SeedVerificationLoader = {
  async loadWords() {
    const items = await withDatabase((db) =>
      db.select({
        id: words.id,
        value: words.value,
        isReal: words.isReal,
        difficulty: words.difficulty,
      }).from(words)
    );

    return items.sort((left, right) => left.value.localeCompare(right.value));
  },

  async loadSynonyms() {
    return await withDatabase(async (db) => {
      const [items, wordById] = await Promise.all([
        db.select({
          id: synonyms.id,
          wordId: synonyms.wordId,
          targetId: synonyms.targetId,
          relationType: synonyms.relationType,
          distractors: synonyms.distractors,
        }).from(synonyms),
        loadWordMap(db),
      ]);

      return items
        .map((item) => ({
          id: item.id,
          prompt: requireWordValue(
            wordById,
            item.wordId,
            `synonyms.${item.id}`,
          ),
          target: requireWordValue(
            wordById,
            item.targetId,
            `synonyms.${item.id}`,
          ),
          relationType: item.relationType,
          distractors: mapWordIdsToValues(
            wordById,
            item.distractors,
            `synonyms.${item.id}`,
          ),
        }))
        .sort((left, right) => left.id - right.id);
    });
  },

  async loadSpelling() {
    return await withDatabase(async (db) => {
      const [items, wordById] = await Promise.all([
        db.select({
          id: spellingChallenges.id,
          contextSentence: spellingChallenges.contextSentence,
          correctWordId: spellingChallenges.correctWordId,
          distractors: spellingChallenges.distractors,
        }).from(spellingChallenges),
        loadWordMap(db),
      ]);

      return items
        .map((item) => ({
          id: item.id,
          contextSentence: item.contextSentence,
          correctWord: requireWordValue(
            wordById,
            item.correctWordId,
            `spelling_challenges.${item.id}`,
          ),
          distractors: mapWordIdsToValues(
            wordById,
            item.distractors,
            `spelling_challenges.${item.id}`,
          ),
        }))
        .sort((left, right) => left.id - right.id);
    });
  },

  async loadMeanings() {
    return await withDatabase(async (db) => {
      const [items, wordById] = await Promise.all([
        db.select({
          id: definitions.id,
          wordId: definitions.wordId,
          definitionText: definitions.definitionText,
          distractors: definitions.distractors,
        }).from(definitions),
        loadWordMap(db),
      ]);

      return items
        .map((item) => ({
          id: item.id,
          word: requireWordValue(
            wordById,
            item.wordId,
            `definitions.${item.id}`,
          ),
          definitionText: item.definitionText,
          distractors: mapWordIdsToValues(
            wordById,
            item.distractors,
            `definitions.${item.id}`,
          ),
        }))
        .sort((left, right) => left.id - right.id);
    });
  },
};

export function createSeedVerificationRoute(
  loader: SeedVerificationLoader = databaseSeedVerificationLoader,
) {
  const route = new Hono();

  route.get("/words", async (context) => {
    const items = await loader.loadWords();
    return context.json({ category: "words", count: items.length, items });
  });

  route.get("/synonyms", async (context) => {
    const items = await loader.loadSynonyms();
    return context.json({ category: "synonyms", count: items.length, items });
  });

  route.get("/spelling", async (context) => {
    const items = await loader.loadSpelling();
    return context.json({ category: "spelling", count: items.length, items });
  });

  route.get("/meanings", async (context) => {
    const items = await loader.loadMeanings();
    return context.json({ category: "meanings", count: items.length, items });
  });

  return route;
}
