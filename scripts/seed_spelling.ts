import { createDatabase } from "../db/client.ts";
import { spellingChallenges, words } from "../db/schema.ts";
import {
  difficultyFromFrequency,
  type Fetch,
  frequencyFromTags,
  isUsableWord,
  MIN_DISTRACTORS,
} from "./seed_synonyms.ts";

const DATAMUSE_URL = "https://api.datamuse.com/words";
const MAX_RESULTS = 20;

/** Placeholder marking the gap a spelling option must fill. */
export const GAP = "___";

export interface SpellingSeed {
  /** The single correct spelling for the gap. */
  word: string;
  /** 1 (everyday) … 5 (rare); used only when the word is new to the bank. */
  difficulty: number;
  /** Context sentence containing exactly one {@link GAP} placeholder. */
  sentence: string;
}

/**
 * Curated context sentences whose target word has phonetically similar
 * neighbours (homophones or near-homophones). Each sentence reads naturally
 * with the target word and awkwardly with the distractors, satisfying the
 * "exactly one unambiguous correct answer" criterion of [[REQ-SPELLING]].
 */
export const spellingSeeds: SpellingSeed[] = [
  {
    word: "flower",
    difficulty: 1,
    sentence: "She planted a single red ___ in the garden.",
  },
  {
    word: "weather",
    difficulty: 2,
    sentence: "We checked the ___ before leaving for the hike.",
  },
  {
    word: "peace",
    difficulty: 2,
    sentence: "After years of war, the nation finally found ___.",
  },
  {
    word: "break",
    difficulty: 1,
    sentence: "Let us take a short ___ before the next meeting.",
  },
  {
    word: "plain",
    difficulty: 2,
    sentence: "The bread was ___, without any butter or jam.",
  },
  {
    word: "knight",
    difficulty: 3,
    sentence: "The brave ___ wore shining armour into battle.",
  },
  {
    word: "berry",
    difficulty: 2,
    sentence: "She picked a ripe ___ from the bush.",
  },
  {
    word: "scene",
    difficulty: 2,
    sentence: "The final ___ of the play moved the audience to tears.",
  },
  {
    word: "week",
    difficulty: 1,
    sentence: "We will meet again next ___ at noon.",
  },
  {
    word: "desert",
    difficulty: 3,
    sentence: "Camels can travel for days across the dry ___.",
  },
];

/** A sentence is usable only when it contains exactly one gap placeholder. */
export function hasSingleGap(sentence: string): boolean {
  return sentence.split(GAP).length === 2;
}

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
}

/**
 * Fetches words that sound like `word`, ordered by descending phonetic
 * similarity, so the leading results make the most convincing distractors.
 */
async function fetchSoundsLike(
  word: string,
  fetchImpl: Fetch,
): Promise<DatamuseWord[]> {
  const url = `${DATAMUSE_URL}?sl=${
    encodeURIComponent(word)
  }&max=${MAX_RESULTS}&md=f`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Datamuse sounds-like request failed for "${word}": ${response.status}`,
    );
  }
  return await response.json() as DatamuseWord[];
}

type Database = ReturnType<typeof createDatabase>["db"];

export interface SeedSpellingResult {
  challenges: number;
  newWords: number;
  skipped: number;
}

interface ChallengePlan {
  correctValue: string;
  sentence: string;
  /** Exactly {@link MIN_DISTRACTORS} phonetically similar wrong answers. */
  distractorValues: string[];
}

/**
 * Builds contextual spelling challenges for the curated {@link spellingSeeds}
 * using the Datamuse sounds-like API. The correct word and its phonetic
 * distractors are inserted into `words` so the foreign keys resolve. Challenges
 * are rebuilt from scratch on each run, so re-seeding is idempotent.
 */
export async function seedSpelling(
  db: Database,
  fetchImpl: Fetch = fetch,
): Promise<SeedSpellingResult> {
  const allWords = await db.select({ id: words.id, value: words.value })
    .from(words);
  const idByValue = new Map(allWords.map((w) => [w.value, w.id]));

  const plans: ChallengePlan[] = [];
  const newWords = new Map<string, number>();
  let skipped = 0;

  for (const seed of spellingSeeds) {
    if (!hasSingleGap(seed.sentence)) {
      skipped++;
      continue;
    }

    const candidates = await fetchSoundsLike(seed.word, fetchImpl);

    const distractorValues: string[] = [];
    const seen = new Set<string>([seed.word]);
    const distractorDifficulty = new Map<string, number>();
    for (const candidate of candidates) {
      if (distractorValues.length >= MIN_DISTRACTORS) break;
      if (!isUsableWord(candidate.word) || seen.has(candidate.word)) continue;
      seen.add(candidate.word);
      distractorValues.push(candidate.word);
      distractorDifficulty.set(
        candidate.word,
        difficultyFromFrequency(frequencyFromTags(candidate.tags)),
      );
    }

    if (distractorValues.length < MIN_DISTRACTORS) {
      skipped++;
      continue;
    }

    if (!idByValue.has(seed.word) && !newWords.has(seed.word)) {
      newWords.set(seed.word, seed.difficulty);
    }
    for (const value of distractorValues) {
      if (!idByValue.has(value) && !newWords.has(value)) {
        newWords.set(value, distractorDifficulty.get(value)!);
      }
    }

    plans.push({
      correctValue: seed.word,
      sentence: seed.sentence,
      distractorValues,
    });
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

  const challenges: {
    contextSentence: string;
    correctWordId: number;
    distractors: number[];
  }[] = [];

  for (const plan of plans) {
    const correctWordId = idByValue.get(plan.correctValue);
    const distractors = plan.distractorValues.map((v) => idByValue.get(v));
    if (
      correctWordId === undefined || distractors.some((id) => id === undefined)
    ) {
      skipped++;
      continue;
    }

    challenges.push({
      contextSentence: plan.sentence,
      correctWordId,
      distractors: distractors as number[],
    });
  }

  await db.transaction(async (tx) => {
    await tx.delete(spellingChallenges);
    if (challenges.length > 0) {
      await tx.insert(spellingChallenges).values(challenges);
    }
  });

  return { challenges: challenges.length, newWords: newWords.size, skipped };
}

if (import.meta.main) {
  const { client, db } = createDatabase();
  try {
    const result = await seedSpelling(db);
    console.log(
      `Seeded ${result.challenges} spelling challenges ` +
        `(+${result.newWords} words, ${result.skipped} skipped).`,
    );
  } finally {
    await client.end();
  }
}
