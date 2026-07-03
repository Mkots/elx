#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * magic-hat CSV cleaner
 *
 * Cleans a word-list CSV before it goes into enrich.ts: trims slash-variant
 * headwords to their first form (`adviser/advisor` -> `adviser`), drops rows
 * whose POS is a function-word tag enrich.ts has no rabbits data for, and
 * normalizes whitespace/unicode.
 *
 * Example:
 *   deno run --allow-read --allow-write scripts/clean.ts \
 *     scripts/magic-hat/magicians/ALL.csv -o ALL.clean.csv [--report removed.csv]
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

/** Cuts a slash-variant headword to its first form and normalizes it. */
export function cleanHeadword(raw: string): string {
  return raw.split("/")[0].trim().replace(/\s+/g, " ").normalize("NFC");
}

export interface CleanStats {
  headwordChanged: number;
  removedByPos: Record<string, number>;
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
  let headwordChanged = 0;

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

    const headword = cleanHeadword(originalHeadword);
    if (headword !== originalHeadword) headwordChanged++;
    rows.push({ ...rec, headword });
  }

  return { rows, removed, stats: { headwordChanged, removedByPos } };
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
      `magic-hat CSV cleaner

Usage:
  deno run --allow-read --allow-write scripts/clean.ts <input.csv> [options]

Options:
  -o, --output <path>    result file (defaults to stdout)
      --report <path>    write removed rows (with a reason column) to this CSV
  -h, --help             show this help`,
    );
    Deno.exit(args.help ? 0 : 1);
  }

  const csvText = await Deno.readTextFile(input);
  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];
  const columns = Object.keys(records[0] ?? {});

  const { rows, removed, stats } = cleanRecords(records);

  console.error(`Cleaned ${records.length} rows -> ${rows.length} kept.`);
  console.error(`  headwords normalized: ${stats.headwordChanged}`);
  console.error(`  rows removed: ${removed.length}`);
  for (const [pos, count] of Object.entries(stats.removedByPos)) {
    console.error(`    ${pos}: ${count}`);
  }

  const outText = stringifyCsv(rows, { columns });
  if (args.output) {
    await Deno.writeTextFile(args.output, outText);
    console.error(`Result written to ${args.output}`);
  } else {
    console.log(outText);
  }

  if (args.report) {
    const reportText = stringifyCsv(removed, {
      columns: [...columns, "reason"],
    });
    await Deno.writeTextFile(args.report, reportText);
    console.error(`Removed rows written to ${args.report}`);
  }
}

if (import.meta.main) {
  await main();
}
