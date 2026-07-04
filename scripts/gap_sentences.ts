#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * magic-hat gap sentence generator
 *
 * Generates a gap sentence per headword. Converts WordNet examples first,
 * and backfills from Tatoeba for words lacking a usable WordNet example.
 * Replaces the headword (and its inflections) with a single '___'.
 *
 * Example:
 *   deno run --allow-read --allow-write scripts/gap_sentences.ts \
 *     --input scripts/magic-hat/ALL.enriched.csv \
 *     --tatoeba scripts/magic-hat/tatoeba/eng_sentences_filtered.tsv \
 *     --output scripts/magic-hat/gap_sentences.csv
 */

import { parseArgs } from "@std/cli/parse-args";
import { parse as parseCsv, stringify as stringifyCsv } from "@std/csv";

interface WordRecord {
  headword: string;
  pos: string;
  CEFR: string;
  examples: string[];
}

export function replaceHeadwordWithGap(
  sentence: string,
  headword: string,
): string | null {
  const hw = headword.trim().toLowerCase();
  if (!hw) return null;

  // Patterns for inflected forms (s, es, ed, d, ing)
  let patternStr = `\\b${hw}(s|es|ed|d|ing)?\\b`;
  if (hw.endsWith("y")) {
    const base = hw.slice(0, -1);
    patternStr = `\\b(${hw}(s|ed|d|ing)?|${base}ies|${base}ied)\\b`;
  }

  const regex = new RegExp(patternStr, "gi");

  // Check matches
  const matches = sentence.match(regex);
  if (!matches || matches.length !== 1) {
    return null;
  }

  // Replace the match
  const result = sentence.replace(regex, "___");

  // Ensure exactly one "___"
  const gapCount = (result.match(/___/g) || []).length;
  if (gapCount !== 1) {
    return null;
  }

  // Ensure the headword itself doesn't leak (case-insensitively)
  if (result.toLowerCase().includes(hw)) {
    return null;
  }

  return result;
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["input", "tatoeba", "output", "help"],
    alias: { i: "input", t: "tatoeba", o: "output", h: "help" },
  });

  if (args.help) {
    console.error(
      `magic-hat gap sentence generator

Usage:
  deno run --allow-read --allow-write scripts/gap_sentences.ts [options]

Options:
  -i, --input <path>     input enriched CSV (defaults to scripts/magic-hat/ALL.enriched.csv)
  -t, --tatoeba <path>   pre-filtered Tatoeba TSV file (defaults to scripts/magic-hat/tatoeba/eng_sentences_filtered.tsv)
  -o, --output <path>    result CSV file (defaults to stdout)
  -h, --help             show this help`,
    );
    Deno.exit(0);
  }

  const scriptDir = import.meta.dirname ?? ".";
  const inputPath = args.input ?? `${scriptDir}/magic-hat/ALL.enriched.csv`;
  const tatoebaPath = args.tatoeba ??
    `${scriptDir}/magic-hat/tatoeba/eng_sentences_filtered.tsv`;

  // 1. Read the input enriched words
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

    const examples = (rec.examples ?? "")
      .split(" | ")
      .map((s) => s.trim())
      .filter(Boolean);

    pool.push({
      headword,
      pos,
      CEFR: (rec.CEFR ?? "").trim(),
      examples,
    });
  }

  if (pool.length === 0) {
    console.error("Error: No valid records found in the input CSV");
    Deno.exit(1);
  }

  // 2. Load and index Tatoeba sentences
  console.error(`Loading Tatoeba sentences from ${tatoebaPath}...`);
  const tatoebaIndex = new Map<string, string[]>();

  try {
    const tatoebaText = await Deno.readTextFile(tatoebaPath);
    const lines = tatoebaText.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      const text = parts[1].trim();

      // Tokenize the sentence to index it by its words
      const tokens = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
      for (const token of tokens) {
        if (!tatoebaIndex.has(token)) {
          tatoebaIndex.set(token, []);
        }
        tatoebaIndex.get(token)!.push(text);
      }
    }
    console.error(`Loaded index with ${tatoebaIndex.size} indexed words.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Warning: Failed to load Tatoeba index: ${msg}`);
  }

  // 3. Process each word to find exactly one gap sentence
  let fromWordNet = 0;
  let fromTatoeba = 0;
  let missing = 0;

  const rows = [];

  for (const target of pool) {
    let gapSentence: string | null = null;

    // Try WordNet first
    for (const ex of target.examples) {
      const res = replaceHeadwordWithGap(ex, target.headword);
      if (res) {
        gapSentence = res;
        fromWordNet++;
        break;
      }
    }

    // Try Tatoeba if WordNet failed
    if (!gapSentence) {
      const candidates = tatoebaIndex.get(target.headword.toLowerCase()) ?? [];
      for (const cand of candidates) {
        const res = replaceHeadwordWithGap(cand, target.headword);
        if (res) {
          gapSentence = res;
          fromTatoeba++;
          break;
        }
      }
    }

    if (!gapSentence) {
      console.error(
        `Warning: Coverage gap! No usable example for '${target.headword}' (${target.pos})`,
      );
      missing++;
      gapSentence = "";
    }

    rows.push({
      headword: target.headword,
      pos: target.pos,
      CEFR: target.CEFR,
      gap_sentence: gapSentence,
    });
  }

  console.error(`\n=== Gap Sentences Generation Summary ===`);
  console.error(`Total Words Processed: ${pool.length}`);
  console.error(`WordNet examples converted: ${fromWordNet}`);
  console.error(`Tatoeba examples backfilled: ${fromTatoeba}`);
  console.error(`Coverage gaps (missing): ${missing}`);
  console.error(`========================================\n`);

  const columns = ["headword", "pos", "CEFR", "gap_sentence"];
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
