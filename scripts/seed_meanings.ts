import { createDatabase } from "../db/client.ts";
import { definitions, words } from "../db/schema.ts";
import {
  type Fetch,
  MIN_DISTRACTORS,
  pickDistractors,
} from "./seed_synonyms.ts";

const DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

/** Definitions outside this range are too terse or too unwieldy for a prompt. */
const MIN_DEFINITION_LENGTH = 10;
const MAX_DEFINITION_LENGTH = 240;

/** Politeness delay between requests, plus retry/backoff for HTTP 429. */
const REQUEST_DELAY_MS = 250;
const MAX_RETRIES = 5;
const BASE_RETRY_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface DictionaryDefinition {
  definition?: string;
}

export interface DictionaryMeaning {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  meanings?: DictionaryMeaning[];
}

/** Collapses internal whitespace and trims a raw definition string. */
export function cleanDefinition(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * A definition is usable when it is a reasonable length and does not contain
 * the word itself, which would give the answer away in the meaning challenge.
 */
export function isUsableDefinition(text: string, word: string): boolean {
  if (
    text.length < MIN_DEFINITION_LENGTH || text.length > MAX_DEFINITION_LENGTH
  ) {
    return false;
  }
  return !new RegExp(`\\b${word}\\b`, "i").test(text);
}

/**
 * Returns the first usable definition for `word` from a Free Dictionary API
 * response, scanning every part of speech in order, or `null` when none fit.
 */
export function extractDefinition(
  entries: DictionaryEntry[],
  word: string,
): string | null {
  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        const cleaned = cleanDefinition(def.definition ?? "");
        if (isUsableDefinition(cleaned, word)) return cleaned;
      }
    }
  }
  return null;
}

/**
 * Fetches dictionary entries for `word`; a 404 means the word has no entry.
 * Retries with exponential backoff when the API rate-limits us (HTTP 429),
 * honouring a `Retry-After` header when present.
 */
async function fetchEntries(
  word: string,
  fetchImpl: Fetch,
): Promise<DictionaryEntry[]> {
  for (let attempt = 0;; attempt++) {
    const response = await fetchImpl(
      `${DICTIONARY_URL}/${encodeURIComponent(word)}`,
    );
    if (response.status === 404) {
      await response.body?.cancel();
      return [];
    }
    if (response.status === 429 && attempt < MAX_RETRIES) {
      await response.body?.cancel();
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : BASE_RETRY_MS * 2 ** attempt;
      await sleep(waitMs);
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Dictionary request failed for "${word}": ${response.status}`,
      );
    }
    return await response.json() as DictionaryEntry[];
  }
}

type Database = ReturnType<typeof createDatabase>["db"];

export interface SeedMeaningsResult {
  challenges: number;
  skipped: number;
}

interface ChallengePlan {
  wordId: number;
  definitionText: string;
  difficulty: number;
}

/**
 * Builds meaning challenges for the real words in the bank using the Free
 * Dictionary API. Each challenge stores one definition prompt plus
 * `MIN_DISTRACTORS` wrong words, drawn from the same difficulty tier where
 * possible so the four options stay consistent with the detected vocabulary
 * level. Challenges are rebuilt from scratch on each run, so re-seeding is
 * idempotent.
 */
export async function seedMeanings(
  db: Database,
  fetchImpl: Fetch = fetch,
): Promise<SeedMeaningsResult> {
  const allWords = await db.select({
    id: words.id,
    value: words.value,
    isReal: words.isReal,
    difficulty: words.difficulty,
  }).from(words);

  // Only real words can be the answer to a definition; pseudowords have none.
  const realWords = allWords.filter((w) => w.isReal);

  const plans: ChallengePlan[] = [];
  let skipped = 0;

  for (const [index, word] of realWords.entries()) {
    if (index > 0) await sleep(REQUEST_DELAY_MS);
    const entries = await fetchEntries(word.value, fetchImpl);
    const definitionText = extractDefinition(entries, word.value);
    if (!definitionText) {
      skipped++;
      continue;
    }
    plans.push({
      wordId: word.id,
      definitionText,
      difficulty: word.difficulty,
    });
  }

  const realIds = realWords.map((w) => w.id);
  const idsByDifficulty = new Map<number, number[]>();
  for (const w of realWords) {
    const tier = idsByDifficulty.get(w.difficulty) ?? [];
    tier.push(w.id);
    idsByDifficulty.set(w.difficulty, tier);
  }

  const challenges: {
    wordId: number;
    definitionText: string;
    distractors: number[];
  }[] = [];

  for (const plan of plans) {
    // Prefer same-tier distractors so the whole question matches the user's
    // detected level; fall back to the full real-word pool when a tier is thin.
    let pool = (idsByDifficulty.get(plan.difficulty) ?? [])
      .filter((id) => id !== plan.wordId);
    if (pool.length < MIN_DISTRACTORS) {
      pool = realIds.filter((id) => id !== plan.wordId);
    }
    if (pool.length < MIN_DISTRACTORS) {
      skipped++;
      continue;
    }

    challenges.push({
      wordId: plan.wordId,
      definitionText: plan.definitionText,
      distractors: pickDistractors(pool, MIN_DISTRACTORS),
    });
  }

  await db.transaction(async (tx) => {
    await tx.delete(definitions);
    if (challenges.length > 0) {
      await tx.insert(definitions).values(challenges);
    }
  });

  return { challenges: challenges.length, skipped };
}

if (import.meta.main) {
  const { client, db } = createDatabase();
  try {
    const result = await seedMeanings(db);
    console.log(
      `Seeded ${result.challenges} meaning challenges ` +
        `(${result.skipped} skipped).`,
    );
  } finally {
    await client.end();
  }
}
