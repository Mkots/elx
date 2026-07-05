#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * pipeline pseudoword generator
 *
 * Generates English-looking pseudowords using a bigram Markov model
 * trained on the real word list, matching length and CV-pattern,
 * and filtering out any real words using the rabbits dictionary.
 *
 * Example:
 *   deno run --allow-read --allow-write pipeline/pseudowords.ts \
 *     --input pipeline/out/ALL.enriched.csv \
 *     --rabbits pipeline/data/wordnet \
 *     --output pipeline/out/pseudowords.csv \
 *     --count 100 --seed 42
 */

import { parseArgs } from "@std/cli/parse-args";
import { parse as parseCsv, stringify as stringifyCsv } from "@std/csv";
import { Rabbits } from "./enrich.ts";
import { DEFAULT_SEED, seededRng } from "./rng.ts";

function getCvPattern(word: string): string {
  return word
    .toLowerCase()
    .split("")
    .map((c) => ("aeiou".includes(c) ? "V" : "C"))
    .join("");
}

function sampleNext(
  current: string,
  transitions: Record<string, Record<string, number>>,
  rng: () => number,
): string {
  const nextMap = transitions[current];
  if (!nextMap) return "$";
  const items = Object.entries(nextMap);
  const total = items.reduce((sum, [_, count]) => sum + count, 0);
  let r = rng() * total;
  for (const [char, count] of items) {
    r -= count;
    if (r <= 0) return char;
  }
  return items[items.length - 1][0];
}

function generateCandidate(
  transitions: Record<string, Record<string, number>>,
  rng: () => number,
): string {
  let current = "^";
  let word = "";
  while (true) {
    const next = sampleNext(current, transitions, rng);
    if (next === "$") break;
    word += next;
    current = next;
    if (word.length > 20) break;
  }
  return word;
}

export interface PseudowordsOptions {
  input: string;
  rabbitsDir: string;
  output?: string;
  count?: number;
  seed?: number;
}

/** Generates pseudowords from `input`'s real words, writes `output`. Used by both the CLI and the orchestrator. */
export async function runPseudowords(
  opts: PseudowordsOptions,
): Promise<{ rowCount: number }> {
  const count = opts.count ?? 100;
  const seedVal = opts.seed ?? DEFAULT_SEED;

  const rabbits = new Rabbits(opts.rabbitsDir);
  await rabbits.init(false);

  const csvText = await Deno.readTextFile(opts.input);
  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];

  const realWords: { word: string; difficulty: number }[] = [];
  for (const rec of records) {
    const word = (rec.headword ?? "").trim().toLowerCase();
    const diff = Number.parseInt(rec.difficulty ?? "1", 10);
    if (word && !Number.isNaN(diff)) {
      realWords.push({ word, difficulty: diff });
    }
  }

  if (realWords.length === 0) {
    throw new Error("No valid real words found in the input CSV");
  }

  console.error(
    `Generating ${count} unique pseudowords using seed ${seedVal}...`,
  );

  const generated = await generatePseudowordsList(
    realWords,
    rabbits,
    count,
    seedVal,
  );

  if (generated.size < count) {
    console.error(
      `Warning: Only generated ${generated.size}/${count} pseudowords after reaching limit.`,
    );
  }

  // Format output rows
  const rows = [...generated.entries()].map(([value, difficulty]) => ({
    value,
    is_real: "false",
    difficulty: String(difficulty),
    synonyms: "",
    antonyms: "",
    definition: "",
  }));

  const columns = [
    "value",
    "is_real",
    "difficulty",
    "synonyms",
    "antonyms",
    "definition",
  ];
  const outText = stringifyCsv(rows, { columns });

  if (opts.output) {
    await Deno.writeTextFile(opts.output, outText);
    console.error(`Result written to ${opts.output}`);
  } else {
    console.log(outText);
  }

  return { rowCount: rows.length };
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["input", "rabbits", "output", "count", "seed", "help"],
    alias: { i: "input", o: "output", c: "count", s: "seed", h: "help" },
  });

  if (args.help) {
    console.error(
      `pipeline pseudoword generator

Usage:
  deno run --allow-read --allow-write pipeline/pseudowords.ts [options]

Options:
  -i, --input <path>     input enriched CSV (defaults to pipeline/out/ALL.enriched.csv)
      --rabbits <dir>    data directory (defaults to data/wordnet next to the script)
  -o, --output <path>    result CSV file (defaults to stdout)
  -c, --count <number>   number of pseudowords to generate (defaults to 100)
  -s, --seed <value>     random seed for determinism (defaults to ${DEFAULT_SEED})
  -h, --help             show this help`,
    );
    Deno.exit(0);
  }

  const scriptDir = import.meta.dirname ?? ".";
  const inputPath = args.input ?? `${scriptDir}/out/ALL.enriched.csv`;
  const rabbitsDir = args.rabbits ?? `${scriptDir}/data/wordnet`;
  const count = Number.parseInt(args.count ?? "100", 10);
  const seedVal = args.seed ? Number.parseInt(args.seed, 10) : DEFAULT_SEED;

  if (Number.isNaN(count) || count <= 0) {
    console.error("Error: --count must be a positive integer");
    Deno.exit(1);
  }

  try {
    await runPseudowords({
      input: inputPath,
      rabbitsDir,
      output: args.output,
      count,
      seed: seedVal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    Deno.exit(1);
  }
}

export async function generatePseudowordsList(
  realWords: { word: string; difficulty: number }[],
  rabbits: Rabbits,
  count: number,
  seed: number,
): Promise<Map<string, number>> {
  const rng = seededRng(seed);

  // Build transition matrix
  const transitions: Record<string, Record<string, number>> = {};
  const addTransition = (from: string, to: string) => {
    if (!transitions[from]) transitions[from] = {};
    transitions[from][to] = (transitions[from][to] || 0) + 1;
  };

  for (const item of realWords) {
    const chars = ["^", ...item.word.split(""), "$"];
    for (let i = 0; i < chars.length - 1; i++) {
      addTransition(chars[i], chars[i + 1]);
    }
  }

  const generated = new Map<string, number>();
  let attemptsTotal = 0;
  const maxAttemptsTotal = count * 2000;

  while (generated.size < count && attemptsTotal < maxAttemptsTotal) {
    attemptsTotal++;

    const targetIdx = Math.floor(rng() * realWords.length);
    const target = realWords[targetIdx];
    const targetLength = target.word.length;
    const targetCv = getCvPattern(target.word);

    let candidate = "";

    // 1. Try with matching CV pattern
    let cvAttempts = 0;
    while (cvAttempts < 300) {
      cvAttempts++;
      const cand = generateCandidate(transitions, rng);
      if (
        cand.length === targetLength &&
        cand !== target.word &&
        getCvPattern(cand) === targetCv
      ) {
        candidate = cand;
        break;
      }
    }

    // 2. Fall back to just length if no CV match
    if (!candidate) {
      let lenAttempts = 0;
      while (lenAttempts < 100) {
        lenAttempts++;
        const cand = generateCandidate(transitions, rng);
        if (cand.length === targetLength && cand !== target.word) {
          candidate = cand;
          break;
        }
      }
    }

    if (candidate && !generated.has(candidate)) {
      const exists = await rabbits.hasEntry(candidate);
      if (!exists) {
        generated.set(candidate, target.difficulty);
      }
    }
  }

  return generated;
}

if (import.meta.main) {
  await main();
}
