#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * magic-hat semantic distractor generator
 *
 * Operating on the enriched CSV, selects 3 plausible semantic distractors
 * per headword for definition and synonym questions.
 *
 * Example:
 *   deno run --allow-read --allow-write scripts/distractors.ts \
 *     --input scripts/magic-hat/ALL.enriched.csv \
 *     --output scripts/magic-hat/distractors.csv \
 *     --seed 12345
 */

import { parseArgs } from "@std/cli/parse-args";
import { parse as parseCsv, stringify as stringifyCsv } from "@std/csv";

interface WordRecord {
  headword: string;
  pos: string;
  CEFR: string;
  lexname: string;
  synonyms: string[];
  antonyms: string[];
  hypernyms: string[];
}

function seededRng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle using seeded RNG
function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export function selectDistractors(
  target: WordRecord,
  pool: WordRecord[],
  rng: () => number,
  mode: "synonym" | "definition",
): string[] {
  const targetLower = target.headword.toLowerCase();
  const excludeSet = new Set<string>([
    targetLower,
    ...target.synonyms.map((s) => s.toLowerCase()),
    ...target.antonyms.map((a) => a.toLowerCase()),
    ...target.hypernyms.map((h) => h.toLowerCase()),
  ]);

  // Step 1: Filter candidate pool by same POS + same CEFR (and exclude target lists)
  let candidates = pool.filter((r) => {
    if (r.pos.toLowerCase() !== target.pos.toLowerCase()) return false;
    if (r.CEFR.toLowerCase() !== target.CEFR.toLowerCase()) return false;
    return !excludeSet.has(r.headword.toLowerCase());
  });

  // Step 2: Fallback to same POS (ignoring CEFR) if we don't have enough candidates
  if (candidates.length < 3) {
    candidates = pool.filter((r) => {
      if (r.pos.toLowerCase() !== target.pos.toLowerCase()) return false;
      return !excludeSet.has(r.headword.toLowerCase());
    });
  }

  // Step 3: Ultimate fallback to any word excluding the target lists
  if (candidates.length < 3) {
    candidates = pool.filter((r) => {
      return !excludeSet.has(r.headword.toLowerCase());
    });
  }

  // Step 4: Perform selection based on mode
  if (mode === "definition") {
    // Prefer same lexname
    const sameLexname = candidates.filter(
      (r) =>
        r.lexname &&
        r.lexname.toLowerCase() === target.lexname.toLowerCase(),
    );
    const diffLexname = candidates.filter(
      (r) =>
        !r.lexname ||
        r.lexname.toLowerCase() !== target.lexname.toLowerCase(),
    );

    const shuffledSame = shuffle(sameLexname, rng);
    const shuffledDiff = shuffle(diffLexname, rng);

    const chosen: string[] = [];
    for (const r of shuffledSame) {
      if (chosen.length < 3) chosen.push(r.headword);
    }
    for (const r of shuffledDiff) {
      if (chosen.length < 3) chosen.push(r.headword);
    }
    return chosen;
  } else {
    // Synonym mode: standard random shuffle from candidates
    const shuffled = shuffle(candidates, rng);
    return shuffled.slice(0, 3).map((r) => r.headword);
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["input", "output", "seed", "help"],
    alias: { i: "input", o: "output", s: "seed", h: "help" },
  });

  if (args.help) {
    console.error(
      `magic-hat semantic distractor generator

Usage:
  deno run --allow-read --allow-write scripts/distractors.ts [options]

Options:
  -i, --input <path>     input enriched CSV (defaults to scripts/magic-hat/ALL.enriched.csv)
  -o, --output <path>    result CSV file (defaults to stdout)
  -s, --seed <value>     random seed for determinism (defaults to 12345)
  -h, --help             show this help`,
    );
    Deno.exit(0);
  }

  const scriptDir = import.meta.dirname ?? ".";
  const inputPath = args.input ?? `${scriptDir}/magic-hat/ALL.enriched.csv`;
  const seedVal = args.seed ? parseInt(args.seed, 10) : 12345;
  const rng = seededRng(isNaN(seedVal) ? 12345 : seedVal);

  // Read input enriched words
  let csvText: string;
  try {
    csvText = await Deno.readTextFile(inputPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to read input file ${inputPath}: ${msg}`);
    Deno.exit(1);
  }

  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];

  const pool: WordRecord[] = [];
  for (const rec of records) {
    const headword = (rec.headword ?? "").trim();
    const pos = (rec.pos ?? "").trim();
    if (!headword || !pos) continue;

    // Helper to parse semicolon separated lists
    const parseList = (val?: string) =>
      (val ?? "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);

    pool.push({
      headword,
      pos,
      CEFR: (rec.CEFR ?? "").trim(),
      lexname: (rec.lexname ?? "").trim(),
      synonyms: parseList(rec.synonyms),
      antonyms: parseList(rec.antonyms),
      hypernyms: parseList(rec.hypernyms),
    });
  }

  if (pool.length === 0) {
    console.error("Error: No valid records found in the input CSV");
    Deno.exit(1);
  }

  const rows = [];
  for (const target of pool) {
    // Generate definition distractors (prefers same lexname)
    const definitionDist = selectDistractors(target, pool, rng, "definition");
    // Generate synonym distractors (any matching POS/CEFR)
    const synonymDist = selectDistractors(target, pool, rng, "synonym");

    rows.push({
      headword: target.headword,
      pos: target.pos,
      CEFR: target.CEFR,
      definition_distractors: definitionDist.join("; "),
      synonym_distractors: synonymDist.join("; "),
    });
  }

  const columns = [
    "headword",
    "pos",
    "CEFR",
    "definition_distractors",
    "synonym_distractors",
  ];
  const outText = stringifyCsv(rows, { columns });

  if (args.output) {
    await Deno.writeTextFile(args.output, outText);
    console.error(`Result written to ${args.output}`);
  } else {
    console.log(outText);
  }
}

if (import.meta.main) {
  await main();
}
