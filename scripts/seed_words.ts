import { sql } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { words } from "../db/schema.ts";

export interface WordSeed {
  value: string;
  isReal: boolean;
  difficulty: number;
}

/**
 * Real English words spanning five difficulty tiers, modeled on the LexTALE
 * vocabulary test (1 = everyday, 5 = erudite/rare).
 */
const realWords: WordSeed[] = [
  // Tier 1 — everyday vocabulary.
  { value: "window", isReal: true, difficulty: 1 },
  { value: "garden", isReal: true, difficulty: 1 },
  { value: "kitten", isReal: true, difficulty: 1 },
  { value: "spider", isReal: true, difficulty: 1 },
  { value: "harvest", isReal: true, difficulty: 1 },
  { value: "breeding", isReal: true, difficulty: 1 },
  { value: "festival", isReal: true, difficulty: 1 },
  { value: "morning", isReal: true, difficulty: 1 },
  { value: "bottle", isReal: true, difficulty: 1 },
  { value: "candle", isReal: true, difficulty: 1 },
  // Tier 2 — common but less frequent.
  { value: "denial", isReal: true, difficulty: 2 },
  { value: "generic", isReal: true, difficulty: 2 },
  { value: "hasty", isReal: true, difficulty: 2 },
  { value: "lengthy", isReal: true, difficulty: 2 },
  { value: "fluid", isReal: true, difficulty: 2 },
  { value: "allied", isReal: true, difficulty: 2 },
  { value: "dispatch", isReal: true, difficulty: 2 },
  { value: "slain", isReal: true, difficulty: 2 },
  { value: "platform", isReal: true, difficulty: 2 },
  { value: "gravy", isReal: true, difficulty: 2 },
  // Tier 3 — intermediate.
  { value: "scornful", isReal: true, difficulty: 3 },
  { value: "ablaze", isReal: true, difficulty: 3 },
  { value: "stoutly", isReal: true, difficulty: 3 },
  { value: "recipient", isReal: true, difficulty: 3 },
  { value: "bewitch", isReal: true, difficulty: 3 },
  { value: "evasive", isReal: true, difficulty: 3 },
  { value: "quaint", isReal: true, difficulty: 3 },
  { value: "shabby", isReal: true, difficulty: 3 },
  { value: "screech", isReal: true, difficulty: 3 },
  { value: "savoury", isReal: true, difficulty: 3 },
  // Tier 4 — advanced.
  { value: "eloquence", isReal: true, difficulty: 4 },
  { value: "cleanliness", isReal: true, difficulty: 4 },
  { value: "ingenious", isReal: true, difficulty: 4 },
  { value: "eradicate", isReal: true, difficulty: 4 },
  { value: "kindergarten", isReal: true, difficulty: 4 },
  { value: "plaintive", isReal: true, difficulty: 4 },
  { value: "mortgage", isReal: true, difficulty: 4 },
  { value: "censorship", isReal: true, difficulty: 4 },
  { value: "conjuror", isReal: true, difficulty: 4 },
  { value: "mucilage", isReal: true, difficulty: 4 },
  // Tier 5 — erudite / rare.
  { value: "caudal", isReal: true, difficulty: 5 },
  { value: "fealty", isReal: true, difficulty: 5 },
  { value: "obsequious", isReal: true, difficulty: 5 },
  { value: "perspicacious", isReal: true, difficulty: 5 },
  { value: "lugubrious", isReal: true, difficulty: 5 },
  { value: "sycophant", isReal: true, difficulty: 5 },
  { value: "ineffable", isReal: true, difficulty: 5 },
  { value: "parsimony", isReal: true, difficulty: 5 },
  { value: "quixotic", isReal: true, difficulty: 5 },
  { value: "mellifluous", isReal: true, difficulty: 5 },
];

/**
 * English-looking pseudowords that obey English phonotactics but carry no
 * meaning. Difficulty reflects how convincingly word-like each one is.
 */
const pseudoWords: WordSeed[] = [
  { value: "plimber", isReal: false, difficulty: 2 },
  { value: "snerdle", isReal: false, difficulty: 2 },
  { value: "prabble", isReal: false, difficulty: 2 },
  { value: "sprockle", isReal: false, difficulty: 2 },
  { value: "flonker", isReal: false, difficulty: 2 },
  { value: "chindle", isReal: false, difficulty: 2 },
  { value: "plound", isReal: false, difficulty: 2 },
  { value: "gondle", isReal: false, difficulty: 2 },
  { value: "brastle", isReal: false, difficulty: 2 },
  { value: "florant", isReal: false, difficulty: 3 },
  { value: "crastic", isReal: false, difficulty: 3 },
  { value: "thurpid", isReal: false, difficulty: 3 },
  { value: "korvent", isReal: false, difficulty: 3 },
  { value: "slimper", isReal: false, difficulty: 3 },
  { value: "frabant", isReal: false, difficulty: 3 },
  { value: "zibrant", isReal: false, difficulty: 3 },
  { value: "twindle", isReal: false, difficulty: 3 },
  { value: "morfent", isReal: false, difficulty: 3 },
  { value: "quolent", isReal: false, difficulty: 4 },
  { value: "glimber", isReal: false, difficulty: 4 },
  { value: "vantric", isReal: false, difficulty: 4 },
  { value: "perlnack", isReal: false, difficulty: 4 },
  { value: "drantive", isReal: false, difficulty: 4 },
  { value: "harnel", isReal: false, difficulty: 4 },
  { value: "glunth", isReal: false, difficulty: 4 },
];

export const wordSeeds: WordSeed[] = [...realWords, ...pseudoWords];

type Database = ReturnType<typeof createDatabase>["db"];

/**
 * Idempotently upserts every seed word. On a value conflict the reality flag
 * and difficulty are refreshed, so re-running the seeder keeps the table in
 * sync with this file without creating duplicates.
 */
export async function seedWords(db: Database): Promise<number> {
  await db
    .insert(words)
    .values(wordSeeds)
    .onConflictDoUpdate({
      target: words.value,
      set: {
        isReal: sql`excluded.is_real`,
        difficulty: sql`excluded.difficulty`,
      },
    });

  return wordSeeds.length;
}

if (import.meta.main) {
  const { client, db } = createDatabase();
  try {
    const count = await seedWords(db);
    console.log(`Seeded ${count} words (real + pseudowords).`);
  } finally {
    await client.end();
  }
}
