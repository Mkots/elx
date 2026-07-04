import { and, eq, gt, ilike, inArray, ne, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { words } from "../schema.ts";
import { executeImport, validateConfig } from "../../scripts/importer_core.ts";

export type Word = typeof words.$inferSelect;

export interface WordFilter {
  search?: string;
  difficulty?: number;
  isReal?: boolean;
  reviewed?: boolean;
}

function buildWordFilter(filter: WordFilter) {
  // deno-lint-ignore no-explicit-any
  const conditions: any[] = [];
  const { search, difficulty, isReal, reviewed } = filter;

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

function findWordReference(
  _id: number,
): Promise<string | null> {
  return Promise.resolve(null);
}

export async function listWords(
  params: WordFilter & { page: number; limit: number },
): Promise<{ words: Word[]; totalCount: number }> {
  const { search, difficulty, isReal, reviewed, page, limit } = params;
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
}

export async function findWordIds(filter: WordFilter): Promise<number[]> {
  const rows = await db
    .select({ id: words.id })
    .from(words)
    .where(buildWordFilter(filter))
    .orderBy(words.id);
  return rows.map((r) => r.id);
}

export async function getWord(id: number): Promise<Word | null> {
  const result = await db
    .select()
    .from(words)
    .where(eq(words.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createWord(data: {
  value: string;
  isReal: boolean;
  difficulty: number;
  synonyms?: string[];
  antonyms?: string[];
  definition?: string | null;
}): Promise<void> {
  await db.insert(words).values({
    value: data.value,
    isReal: data.isReal,
    difficulty: data.difficulty,
    synonyms: data.synonyms ?? [],
    antonyms: data.antonyms ?? [],
    definition: data.definition ?? null,
  });
}

export async function updateWord(
  id: number,
  data: {
    value: string;
    isReal: boolean;
    difficulty: number;
    synonyms?: string[];
    antonyms?: string[];
    definition?: string | null;
  },
): Promise<void> {
  await db
    .update(words)
    .set({
      value: data.value,
      isReal: data.isReal,
      difficulty: data.difficulty,
      synonyms: data.synonyms ?? [],
      antonyms: data.antonyms ?? [],
      definition: data.definition ?? null,
    })
    .where(eq(words.id, id));
}

export async function deleteWord(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const reason = await findWordReference(id);
  if (reason) {
    return { success: false, error: reason };
  }
  await db.delete(words).where(eq(words.id, id));
  return { success: true };
}

export async function bulkSetReviewed(
  ids: number[],
  reviewed: boolean,
): Promise<number> {
  if (ids.length === 0) return 0;
  const updated = await db
    .update(words)
    .set({ reviewed, reviewedAt: reviewed ? new Date() : null })
    .where(inArray(words.id, ids))
    .returning({ id: words.id });
  return updated.length;
}

export async function bulkSetIsReal(
  ids: number[],
  isReal: boolean,
): Promise<number> {
  if (ids.length === 0) return 0;
  const updated = await db
    .update(words)
    .set({ isReal })
    .where(inArray(words.id, ids))
    .returning({ id: words.id });
  return updated.length;
}

export async function bulkDelete(
  ids: number[],
): Promise<{ deleted: number; skipped: { id: number; reason: string }[] }> {
  const skipped: { id: number; reason: string }[] = [];
  let deleted = 0;
  for (const id of ids) {
    const reason = await findWordReference(id);
    if (reason) {
      skipped.push({ id, reason });
      continue;
    }
    await db.delete(words).where(eq(words.id, id));
    deleted++;
  }
  return { deleted, skipped };
}

export async function importWords(
  fileContent: string,
  configJson: string,
  dryRun: boolean,
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { line: number; reason: string }[];
}> {
  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(configJson);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error("Invalid configuration JSON: " + errMsg);
  }
  const config = validateConfig(rawConfig);
  return await executeImport(db, fileContent, config, dryRun);
}

// Review Methods
export async function getNextUnreviewed(
  afterId?: number,
): Promise<Word | null> {
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
}

export async function skipWord(id: number): Promise<Word | null> {
  return await getNextUnreviewed(id);
}

export async function reviewWord(
  id: number,
  data: { value: string; isReal: boolean; difficulty: number },
): Promise<void> {
  const { value, isReal, difficulty } = data;
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
}

export async function progress(): Promise<
  { reviewed: number; total: number; remaining: number }
> {
  const allWords = await db
    .select()
    .from(words);
  const total = allWords.length;
  const reviewed = allWords.filter((w) => w.reviewed).length;
  const remaining = total - reviewed;
  return { reviewed, total, remaining };
}

// Seed Verification methods
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

export async function loadWords(): Promise<SeedWordVerificationItem[]> {
  const items = await db.select({
    id: words.id,
    value: words.value,
    isReal: words.isReal,
    difficulty: words.difficulty,
  }).from(words);

  return items.sort((left, right) => left.value.localeCompare(right.value));
}

export async function loadSynonyms(): Promise<SeedSynonymVerificationItem[]> {
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
}

export async function loadSpelling(): Promise<SeedSpellingVerificationItem[]> {
  await Promise.resolve();
  return [];
}

export async function loadMeanings(): Promise<SeedMeaningVerificationItem[]> {
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
}
