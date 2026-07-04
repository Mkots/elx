#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * pipeline orchestrator
 *
 * Runs every enrichment stage in order — clean -> enrich -> {pseudowords,
 * distractors, phonetic_distractors, gap_sentences} — and writes a
 * manifest.json (stage versions, input hashes, row counts, date) next to the
 * generated artifacts. Every stage that samples/shuffles uses a seeded RNG
 * (see rng.ts), so two runs with the same inputs and seed produce
 * byte-identical artifacts.
 *
 * Example:
 *   deno run --allow-read --allow-write pipeline/run.ts \
 *     [--data-dir pipeline/data] [--out-dir pipeline/out] \
 *     [--wordlist ALL.csv] [--seed 12345]
 */

import { parseArgs } from "@std/cli/parse-args";
import { cleanFile } from "./clean.ts";
import { runEnrich } from "./enrich.ts";
import { runPseudowords } from "./pseudowords.ts";
import { runDistractors } from "./distractors.ts";
import { runPhoneticDistractors } from "./phonetic_distractors.ts";
import { runGapSentences } from "./gap_sentences.ts";
import { DEFAULT_SEED } from "./rng.ts";

// Bump a stage's version when its output format or generation logic changes,
// so the manifest can be used to tell whether artifacts came from the
// current code.
export const STAGE_VERSIONS = {
  clean: 1,
  enrich: 1,
  pseudowords: 1,
  distractors: 1,
  phoneticDistractors: 1,
  gapSentences: 1,
} as const;

export interface PipelineOptions {
  dataDir: string;
  outDir: string;
  wordlist?: string;
  seed?: number;
  pseudowordCount?: number;
}

interface StageManifestEntry {
  name: string;
  version: number;
  input: string;
  inputHash: string;
  output: string;
  rowCount: number;
}

export interface Manifest {
  generatedAt: string;
  seed: number;
  stages: StageManifestEntry[];
}

async function sha256File(path: string): Promise<string> {
  const data = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Runs every stage in order against `opts.dataDir`, writes artifacts + manifest.json to `opts.outDir`. */
export async function runPipeline(opts: PipelineOptions): Promise<Manifest> {
  const { dataDir, outDir } = opts;
  const seed = opts.seed ?? DEFAULT_SEED;
  await Deno.mkdir(outDir, { recursive: true });

  const wordlistPath = `${dataDir}/wordlists/${opts.wordlist ?? "ALL.csv"}`;
  const rabbitsDir = `${dataDir}/wordnet`;
  const subtlexPath = `${dataDir}/subtlex/SUBTLEXus74286wordstextversion.txt`;
  const tatoebaPath = `${dataDir}/tatoeba/eng_sentences_filtered.tsv`;

  const cleanOut = `${outDir}/ALL.clean.csv`;
  const enrichedOut = `${outDir}/ALL.enriched.csv`;
  const pseudowordsOut = `${outDir}/pseudowords.csv`;
  const distractorsOut = `${outDir}/distractors.csv`;
  const phoneticOut = `${outDir}/phonetic_distractors.csv`;
  const gapOut = `${outDir}/gap_sentences.csv`;

  const stages: StageManifestEntry[] = [];

  const clean = await cleanFile(wordlistPath, { output: cleanOut });
  stages.push({
    name: "clean",
    version: STAGE_VERSIONS.clean,
    input: wordlistPath,
    inputHash: await sha256File(wordlistPath),
    output: cleanOut,
    rowCount: clean.rowCount,
  });

  const enrich = await runEnrich({
    input: cleanOut,
    rabbitsDir,
    subtlexPath,
    output: enrichedOut,
    format: "csv",
  });
  stages.push({
    name: "enrich",
    version: STAGE_VERSIONS.enrich,
    input: cleanOut,
    inputHash: await sha256File(cleanOut),
    output: enrichedOut,
    rowCount: enrich.rowCount,
  });

  const pseudowords = await runPseudowords({
    input: enrichedOut,
    rabbitsDir,
    output: pseudowordsOut,
    count: opts.pseudowordCount ?? 100,
    seed,
  });
  stages.push({
    name: "pseudowords",
    version: STAGE_VERSIONS.pseudowords,
    input: enrichedOut,
    inputHash: await sha256File(enrichedOut),
    output: pseudowordsOut,
    rowCount: pseudowords.rowCount,
  });

  const distractors = await runDistractors({
    input: enrichedOut,
    output: distractorsOut,
    seed,
  });
  stages.push({
    name: "distractors",
    version: STAGE_VERSIONS.distractors,
    input: enrichedOut,
    inputHash: await sha256File(enrichedOut),
    output: distractorsOut,
    rowCount: distractors.rowCount,
  });

  const phonetic = await runPhoneticDistractors({
    input: enrichedOut,
    output: phoneticOut,
  });
  stages.push({
    name: "phonetic_distractors",
    version: STAGE_VERSIONS.phoneticDistractors,
    input: enrichedOut,
    inputHash: await sha256File(enrichedOut),
    output: phoneticOut,
    rowCount: phonetic.rowCount,
  });

  const gapSentences = await runGapSentences({
    input: enrichedOut,
    tatoebaPath,
    output: gapOut,
  });
  stages.push({
    name: "gap_sentences",
    version: STAGE_VERSIONS.gapSentences,
    input: enrichedOut,
    inputHash: await sha256File(enrichedOut),
    output: gapOut,
    rowCount: gapSentences.rowCount,
  });

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    seed,
    stages,
  };
  await Deno.writeTextFile(
    `${outDir}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );

  return manifest;
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["data-dir", "out-dir", "wordlist", "seed", "count"],
    boolean: ["help"],
    alias: { h: "help" },
  });

  if (args.help) {
    console.error(
      `pipeline orchestrator

Usage:
  deno run --allow-read --allow-write pipeline/run.ts [options]

Options:
      --data-dir <dir>   raw source directory (defaults to pipeline/data next to the script)
      --out-dir <dir>    artifact output directory (defaults to pipeline/out next to the script)
      --wordlist <name>  wordlist CSV file name within data-dir/wordlists (defaults to ALL.csv)
      --seed <value>     random seed for determinism (defaults to ${DEFAULT_SEED})
      --count <number>   number of pseudowords to generate (defaults to 100)
  -h, --help             show this help`,
    );
    Deno.exit(0);
  }

  const scriptDir = import.meta.dirname ?? ".";
  const dataDir = args["data-dir"] ?? `${scriptDir}/data`;
  const outDir = args["out-dir"] ?? `${scriptDir}/out`;
  const seed = args.seed ? parseInt(args.seed, 10) : DEFAULT_SEED;
  const pseudowordCount = args.count ? parseInt(args.count, 10) : 100;

  const manifest = await runPipeline({
    dataDir,
    outDir,
    wordlist: args.wordlist,
    seed: isNaN(seed) ? DEFAULT_SEED : seed,
    pseudowordCount: isNaN(pseudowordCount) ? 100 : pseudowordCount,
  });

  console.error(
    `\nPipeline complete. Manifest written to ${outDir}/manifest.json`,
  );
  for (const stage of manifest.stages) {
    console.error(`  ${stage.name}: ${stage.rowCount} rows`);
  }
}

if (import.meta.main) {
  await main();
}
