import { createDatabase } from "../db/client.ts";
import { synonyms, words } from "../db/schema.ts";
import { wordSeeds } from "./seed_words.ts";

/** Minimum number of wrong-answer distractors stored per challenge. */
export const MIN_DISTRACTORS = 3;

const DATAMUSE_URL = "https://api.datamuse.com/words";
const MAX_RESULTS = 10;

export type RelationType = "synonym" | "antonym";

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
}

/** A single fetch implementation, injectable so the seeder can be tested. */
export type Fetch = typeof fetch;

/**
 * Accepts only lowercase single-token alphabetic words. Datamuse happily
 * returns multi-word phrases and hyphenated forms, which make poor quiz items.
 */
export function isUsableWord(value: string): boolean {
  return /^[a-z]+$/.test(value) && value.length >= 3 && value.length <= 20;
}

/** Reads the per-million word frequency from Datamuse `md=f` metadata tags. */
export function frequencyFromTags(tags: string[] | undefined): number {
  const tag = tags?.find((t) => t.startsWith("f:"));
  const value = tag ? Number(tag.slice(2)) : NaN;
  return Number.isFinite(value) ? value : 0;
}

/** Maps a frequency (per million) onto the 1 (common) … 5 (rare) scale. */
export function difficultyFromFrequency(frequency: number): number {
  if (frequency >= 50) return 1;
  if (frequency >= 10) return 2;
  if (frequency >= 2) return 3;
  if (frequency >= 0.5) return 4;
  return 5;
}

/**
 * Returns `count` ids drawn from `candidateIds` in random order. If the pool is
 * smaller than `count` it returns the whole (shuffled) pool. The `rng` seam
 * keeps the selection deterministic under test.
 */
export function pickDistractors(
  candidateIds: number[],
  count: number,
  rng: () => number = Math.random,
): number[] {
  const pool = [...candidateIds];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

async function fetchRelated(
  word: string,
  rel: "syn" | "ant",
  fetchImpl: Fetch,
): Promise<DatamuseWord[]> {
  const url = `${DATAMUSE_URL}?rel_${rel}=${
    encodeURIComponent(word)
  }&max=${MAX_RESULTS}&md=f`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Datamuse ${rel} request failed for "${word}": ${response.status}`,
    );
  }
  return await response.json() as DatamuseWord[];
}

type Database = ReturnType<typeof createDatabase>["db"];

export interface SeedSynonymsResult {
  challenges: number;
  newWords: number;
  skipped: number;
}

interface ChallengePlan {
  promptId: number;
  relationType: RelationType;
  targetValue: string;
  /** Values that must not be used as distractors (real answers for the prompt). */
  relatedValues: Set<string>;
}

/**
 * Builds synonym/antonym challenges for the canonical LexTALE words using the
 * Datamuse API. Target words returned by Datamuse are inserted into `words` so
 * the foreign keys resolve, but they are never used as prompts themselves.
 * Challenges are rebuilt from scratch on each run, so re-seeding is idempotent.
 */
export async function seedSynonyms(
  db: Database,
  fetchImpl: Fetch = fetch,
): Promise<SeedSynonymsResult> {
  const allWords = await db.select({
    id: words.id,
    value: words.value,
    isReal: words.isReal,
  }).from(words);

  const idByValue = new Map(allWords.map((w) => [w.value, w.id]));

  // Prompts are the canonical LexTALE words only. The synonyms/antonyms fetched
  // below are stored as real words too (so the foreign keys resolve), but they
  // must never become prompts themselves — otherwise each run would snowball the
  // imported words into new challenges.
  const promptValues = new Set(
    wordSeeds.filter((w) => w.isReal).map((w) => w.value),
  );
  const prompts = allWords.filter((w) => promptValues.has(w.value));

  const plans: ChallengePlan[] = [];
  const newWords = new Map<string, number>();

  for (const prompt of prompts) {
    const [syn, ant] = await Promise.all([
      fetchRelated(prompt.value, "syn", fetchImpl),
      fetchRelated(prompt.value, "ant", fetchImpl),
    ]);

    const relatedValues = new Set<string>();
    for (const candidate of [...syn, ...ant]) {
      if (isUsableWord(candidate.word) && candidate.word !== prompt.value) {
        relatedValues.add(candidate.word);
      }
    }

    for (
      const [relationType, results] of [["synonym", syn], [
        "antonym",
        ant,
      ]] as const
    ) {
      const target = results.find(
        (r) => isUsableWord(r.word) && r.word !== prompt.value,
      );
      if (!target) continue;

      if (!idByValue.has(target.word) && !newWords.has(target.word)) {
        newWords.set(
          target.word,
          difficultyFromFrequency(frequencyFromTags(target.tags)),
        );
      }

      plans.push({
        promptId: prompt.id,
        relationType,
        targetValue: target.word,
        relatedValues,
      });
    }
  }

  if (newWords.size > 0) {
    await db.insert(words).values(
      [...newWords].map(([value, difficulty]) => ({
        value,
        isReal: true,
        difficulty,
      })),
    ).onConflictDoNothing({ target: words.value });

    const refreshed = await db.select({ id: words.id, value: words.value })
      .from(words);
    for (const w of refreshed) idByValue.set(w.value, w.id);
  }

  // Distractors are drawn from real words only, so a synonym/antonym challenge
  // never offers a pseudoword as an obviously-wrong option.
  const realValues = new Set(
    allWords.filter((w) => w.isReal).map((w) => w.value),
  );
  for (const value of newWords.keys()) realValues.add(value);
  const distractorPool = [...idByValue]
    .filter(([value]) => realValues.has(value))
    .map(([, id]) => id);

  const challenges: {
    wordId: number;
    targetId: number;
    relationType: RelationType;
    distractors: number[];
  }[] = [];
  let skipped = 0;

  for (const plan of plans) {
    const targetId = idByValue.get(plan.targetValue);
    if (targetId === undefined) {
      skipped++;
      continue;
    }

    const excludeIds = new Set<number>([plan.promptId, targetId]);
    for (const value of plan.relatedValues) {
      const id = idByValue.get(value);
      if (id !== undefined) excludeIds.add(id);
    }

    const pool = distractorPool.filter((id) => !excludeIds.has(id));
    if (pool.length < MIN_DISTRACTORS) {
      skipped++;
      continue;
    }

    challenges.push({
      wordId: plan.promptId,
      targetId,
      relationType: plan.relationType,
      distractors: pickDistractors(pool, MIN_DISTRACTORS),
    });
  }

  await db.transaction(async (tx) => {
    await tx.delete(synonyms);
    if (challenges.length > 0) {
      await tx.insert(synonyms).values(challenges);
    }
  });

  return { challenges: challenges.length, newWords: newWords.size, skipped };
}

if (import.meta.main) {
  const { client, db } = createDatabase();
  try {
    const result = await seedSynonyms(db);
    console.log(
      `Seeded ${result.challenges} synonym/antonym challenges ` +
        `(+${result.newWords} target words, ${result.skipped} skipped).`,
    );
  } finally {
    await client.end();
  }
}
