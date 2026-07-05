#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * pipeline CSV cleaner
 *
 * Cleans a word-list CSV before it goes into enrich.ts: trims slash-variant
 * headwords to their first form (`adviser/advisor` -> `adviser`), drops rows
 * whose POS is a function-word tag enrich.ts has no rabbits data for, drops
 * multi-word/hyphenated/abbreviation headwords, and lowercases the rest.
 *
 * Example:
 *   deno run --allow-read --allow-write pipeline/clean.ts \
 *     pipeline/data/wordlists/ALL.csv -o ALL.clean.csv [--report removed.csv]
 */

import { parseArgs } from "@std/cli/parse-args";
import { parse as parseCsv, stringify as stringifyCsv } from "@std/csv";

// POS tags enrich.ts resolves against rabbits/*.json (see POS_CODES there).
const KEPT_POS = new Set(["noun", "verb", "adjective", "adverb"]);

// Function-word POS tags with no lexical entries in rabbits: dropped.
const DROPPED_POS = new Set([
  "pronoun",
  "preposition",
  "determiner",
  "conjunction",
  "number",
  "modal auxiliary",
  "be-verb",
  "do-verb",
  "have-verb",
  "interjection",
  "infinitive-to",
]);

/** Cuts a slash-variant headword to its first form, e.g. `adviser/advisor` -> `adviser`. */
export function cutSlashVariant(raw: string): string {
  return raw.split("/")[0].trim();
}

export function isMultiWord(headword: string): boolean {
  return /\s/.test(headword);
}

export function isHyphenated(headword: string): boolean {
  return headword.includes("-");
}

/** Dotted shorthand (`a.m.`, `Mr.`) or an all-caps acronym (`CD`, `DVD`). */
export function isAbbreviation(headword: string): boolean {
  if (headword.includes(".")) return true;
  const letters = headword.replaceAll(/[^A-Za-z]/g, "");
  return letters.length >= 2 && letters === letters.toUpperCase();
}

/** Lowercases and normalizes whitespace/unicode of an already-vetted headword. */
export function normalizeHeadword(headword: string): string {
  return headword.trim().toLowerCase().replaceAll(/\s+/g, " ").normalize("NFC");
}

export interface CleanStats {
  headwordChanged: number;
  removedByPos: Record<string, number>;
  removedByShape: Record<string, number>;
}

export interface CleanResult {
  rows: Record<string, string>[];
  removed: Record<string, string>[];
  stats: CleanStats;
}

export function cleanRecords(records: Record<string, string>[]): CleanResult {
  const rows: Record<string, string>[] = [];
  const removed: Record<string, string>[] = [];
  const removedByPos: Record<string, number> = {};
  const removedByShape: Record<string, number> = {};
  let headwordChanged = 0;

  const dropShape = (rec: Record<string, string>, reason: string) => {
    removedByShape[reason] = (removedByShape[reason] ?? 0) + 1;
    removed.push({ ...rec, reason });
  };

  for (const rec of records) {
    const pos = (rec.pos ?? "").trim();
    const originalHeadword = (rec.headword ?? "").trim();

    if (!originalHeadword) {
      throw new Error(`empty headword for row: ${JSON.stringify(rec)}`);
    }
    if (!KEPT_POS.has(pos) && !DROPPED_POS.has(pos)) {
      throw new Error(
        `unknown POS "${pos}" for headword "${originalHeadword}"`,
      );
    }

    if (DROPPED_POS.has(pos)) {
      removedByPos[pos] = (removedByPos[pos] ?? 0) + 1;
      removed.push({ ...rec, reason: `function POS: ${pos}` });
      continue;
    }

    const cut = cutSlashVariant(originalHeadword);
    if (isMultiWord(cut)) {
      dropShape(rec, "multi-word headword");
      continue;
    }
    if (isHyphenated(cut)) {
      dropShape(rec, "hyphenated headword");
      continue;
    }
    if (isAbbreviation(cut)) {
      dropShape(rec, "abbreviation/acronym");
      continue;
    }

    const headword = normalizeHeadword(cut);
    if (headword !== originalHeadword) headwordChanged++;
    rows.push({ ...rec, headword });
  }

  return {
    rows,
    removed,
    stats: { headwordChanged, removedByPos, removedByShape },
  };
}

/** Reads `input`, cleans it, writes `output` (and `report`, if given). Used by both the CLI and the orchestrator. */
export async function cleanFile(
  input: string,
  opts: { output?: string; report?: string } = {},
): Promise<{ rowCount: number } & CleanResult> {
  const csvText = await Deno.readTextFile(input);
  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];
  const columns = Object.keys(records[0] ?? {});

  const result = cleanRecords(records);
  const { rows, removed, stats } = result;

  console.error(`Cleaned ${records.length} rows -> ${rows.length} kept.`);
  console.error(`  headwords normalized: ${stats.headwordChanged}`);
  console.error(`  rows removed: ${removed.length}`);
  for (const [pos, count] of Object.entries(stats.removedByPos)) {
    console.error(`    ${pos}: ${count}`);
  }
  for (const [reason, count] of Object.entries(stats.removedByShape)) {
    console.error(`    ${reason}: ${count}`);
  }

  const outText = stringifyCsv(rows, { columns });
  if (opts.output) {
    await Deno.writeTextFile(opts.output, outText);
    console.error(`Result written to ${opts.output}`);
  } else {
    console.log(outText);
  }

  if (opts.report) {
    const reportText = stringifyCsv(removed, {
      columns: [...columns, "reason"],
    });
    await Deno.writeTextFile(opts.report, reportText);
    console.error(`Removed rows written to ${opts.report}`);
  }

  return { rowCount: rows.length, ...result };
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["output", "report"],
    boolean: ["help"],
    alias: { o: "output", h: "help" },
  });

  const input = args._[0]?.toString();

  if (args.help || !input) {
    console.error(
      `pipeline CSV cleaner

Usage:
  deno run --allow-read --allow-write pipeline/clean.ts <input.csv> [options]

Options:
  -o, --output <path>    result file (defaults to stdout)
      --report <path>    write removed rows (with a reason column) to this CSV
  -h, --help             show this help`,
    );
    Deno.exit(args.help ? 0 : 1);
  }

  await cleanFile(input, { output: args.output, report: args.report });
}

if (import.meta.main) {
  await main();
}
