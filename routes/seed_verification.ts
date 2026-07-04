import { Hono } from "@hono/hono";
import { db } from "../db/client.ts";
import { words } from "../db/schema.ts";

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

export const databaseSeedVerificationLoader: SeedVerificationLoader = {
  async loadWords() {
    const items = await db.select({
      id: words.id,
      value: words.value,
      isReal: words.isReal,
      difficulty: words.difficulty,
    }).from(words);

    return items.sort((left, right) => left.value.localeCompare(right.value));
  },

  async loadSynonyms() {
    const allWords = await db.select({
      id: words.id,
      value: words.value,
      isReal: words.isReal,
      synonyms: words.synonyms,
      antonyms: words.antonyms,
    }).from(words);

    const result: SeedSynonymVerificationItem[] = [];
    let counter = 1;
    for (const word of allWords) {
      if (!word.isReal) continue;
      for (const syn of word.synonyms) {
        result.push({
          id: counter++,
          prompt: word.value,
          target: syn,
          relationType: "synonym",
          distractors: [],
        });
      }
      for (const ant of word.antonyms) {
        result.push({
          id: counter++,
          prompt: word.value,
          target: ant,
          relationType: "antonym",
          distractors: [],
        });
      }
    }
    return result;
  },

  async loadSpelling() {
    // Legacy spelling seeds table has been retired; user-facing spelling challenge features are planned for future phases.
    await Promise.resolve();
    return [];
  },

  async loadMeanings() {
    const allWords = await db.select({
      id: words.id,
      value: words.value,
      isReal: words.isReal,
      definition: words.definition,
    }).from(words);

    const result: SeedMeaningVerificationItem[] = [];
    let counter = 1;
    for (const word of allWords) {
      if (!word.isReal || !word.definition) continue;
      result.push({
        id: counter++,
        word: word.value,
        definitionText: word.definition,
        distractors: [],
      });
    }
    return result;
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
