#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * pipeline phonetic distractor generator
 *
 * Operating on the enriched CSV, selects 3 phonetically and visually similar spelling distractors
 * per headword using edit distance over IPA and orthography, plus Metaphone equivalence.
 *
 * Example:
 *   deno run --allow-read --allow-write pipeline/phonetic_distractors.ts \
 *     --input pipeline/out/ALL.enriched.csv \
 *     --output pipeline/out/phonetic_distractors.csv
 */

import { parseArgs } from "@std/cli/parse-args";
import { parse as parseCsv, stringify as stringifyCsv } from "@std/csv";

interface WordRecord {
  headword: string;
  pos: string;
  CEFR: string;
  pronunciation: string; // IPA
  metaphone: string;
}

function metaphone(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";

  if (
    w.startsWith("kn") ||
    w.startsWith("gn") ||
    w.startsWith("pn") ||
    w.startsWith("ae") ||
    w.startsWith("wr")
  ) {
    w = w.substring(1);
  } else if (w.startsWith("x")) {
    w = "s" + w.substring(1);
  } else if (w.startsWith("wh")) {
    w = "w" + w.substring(2);
  }

  let code = "";
  let i = 0;
  const isVowel = (c: string) => "aeiou".includes(c);

  while (i < w.length) {
    const c = w[i];
    const next = w[i + 1] ?? "";
    const next2 = w[i + 2] ?? "";
    const prev = w[i - 1] ?? "";

    if (c === next && c !== "c") {
      i++;
      continue;
    }

    if (i === 0 && isVowel(c)) {
      code += c;
      i++;
      continue;
    }

    switch (c) {
      case "b":
        if (!(i === w.length - 1 && prev === "m")) {
          code += "b";
        }
        break;
      case "c":
        if (next === "h") {
          code += "x";
          i++;
        } else if (next === "i" && next2 === "a") {
          code += "x";
          i += 2;
        } else if ("eiy".includes(next)) {
          if (prev !== "s") {
            code += "s";
          }
        } else {
          code += "k";
        }
        break;
      case "d":
        if (next === "g" && "eiy".includes(next2)) {
          code += "j";
          i += 2;
        } else {
          code += "t";
        }
        break;
      case "f":
        code += "f";
        break;
      case "g":
        if (next === "h" && (i === w.length - 2 || !isVowel(w[i + 2] ?? ""))) {
          if (!"bdfhjlmnrstwxz".includes(prev)) {
            code += "f";
          }
          i++;
        } else if (next === "n" || (next === "n" && next2 === "s")) {
          i++;
        } else if ("eiy".includes(next)) {
          code += "j";
        } else {
          code += "k";
        }
        break;
      case "h":
        if (i === 0 || (isVowel(prev) && !isVowel(next))) {
          code += "h";
        }
        break;
      case "j":
        code += "j";
        break;
      case "k":
        if (prev !== "c") {
          code += "k";
        }
        break;
      case "l":
        code += "l";
        break;
      case "m":
        code += "m";
        break;
      case "n":
        code += "n";
        break;
      case "p":
        if (next === "h") {
          code += "f";
          i++;
        } else {
          code += "p";
        }
        break;
      case "q":
        code += "k";
        break;
      case "r":
        code += "r";
        break;
      case "s":
        if (next === "h") {
          code += "x";
          i++;
        } else if (next === "i" && (next2 === "o" || next2 === "a")) {
          code += "x";
          i += 2;
        } else {
          code += "s";
        }
        break;
      case "t":
        if (next === "h") {
          code += "0";
          i++;
        } else if (next === "i" && (next2 === "o" || next2 === "a")) {
          code += "x";
          i += 2;
        } else {
          code += "t";
        }
        break;
      case "v":
        code += "f";
        break;
      case "w":
      case "y":
        if (i === 0 || isVowel(next)) {
          code += c;
        }
        break;
      case "x":
        code += "ks";
        break;
      case "z":
        code += "s";
        break;
    }
    i++;
  }
  return code.toUpperCase();
}

export function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }
  return dp[a.length][b.length];
}

export function selectPhoneticDistractors(
  target: WordRecord,
  pool: WordRecord[],
): string[] {
  const targetLower = target.headword.toLowerCase();

  // Filter candidates: same POS, not target
  const candidates = pool
    .filter((r) => {
      if (r.pos.toLowerCase() !== target.pos.toLowerCase()) return false;
      if (r.headword.toLowerCase() === targetLower) return false;
      return true;
    })
    .map((r) => {
      const orthoDist = editDistance(targetLower, r.headword.toLowerCase());
      const ipaDist = target.pronunciation && r.pronunciation
        ? editDistance(target.pronunciation, r.pronunciation)
        : Infinity;
      const metaphoneMatch = target.metaphone === r.metaphone;

      return {
        record: r,
        orthoDist,
        ipaDist,
        metaphoneMatch,
      };
    });

  // Filter for candidates that are actually somewhat similar
  // (e.g. edit distance <= 4 orthographically, or <= 4 in IPA, or Metaphone match)
  const similarCandidates = candidates.filter((c) => {
    return c.metaphoneMatch || c.orthoDist <= 4 || c.ipaDist <= 4;
  });

  // Sort: Metaphone match first, then by IPA distance, then by orthography distance, then length diff
  similarCandidates.sort((a, b) => {
    if (a.metaphoneMatch && !b.metaphoneMatch) return -1;
    if (!a.metaphoneMatch && b.metaphoneMatch) return 1;

    if (a.ipaDist !== b.ipaDist) {
      return a.ipaDist - b.ipaDist;
    }

    if (a.orthoDist !== b.orthoDist) {
      return a.orthoDist - b.orthoDist;
    }

    const lenDiffA = Math.abs(
      target.headword.length - a.record.headword.length,
    );
    const lenDiffB = Math.abs(
      target.headword.length - b.record.headword.length,
    );
    return lenDiffA - lenDiffB;
  });

  return similarCandidates.slice(0, 3).map((c) => c.record.headword);
}

export interface PhoneticDistractorsOptions {
  input: string;
  output?: string;
}

/** Generates phonetic/spelling distractors for every IPA-tagged word in `input`, writes `output`. Used by both the CLI and the orchestrator. */
export async function runPhoneticDistractors(
  opts: PhoneticDistractorsOptions,
): Promise<{ rowCount: number }> {
  const csvText = await Deno.readTextFile(opts.input);

  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];

  const pool: WordRecord[] = [];
  for (const rec of records) {
    const headword = (rec.headword ?? "").trim();
    const pos = (rec.pos ?? "").trim();
    if (!headword || !pos) continue;

    pool.push({
      headword,
      pos,
      CEFR: (rec.CEFR ?? "").trim(),
      pronunciation: (rec.pronunciation ?? "").trim(),
      metaphone: metaphone(headword),
    });
  }

  if (pool.length === 0) {
    throw new Error("No valid records found in the input CSV");
  }

  const rows = [];
  let warnedCount = 0;

  for (const target of pool) {
    // Only generate for targets with available IPA (pronunciation)
    if (!target.pronunciation) continue;

    const chosen = selectPhoneticDistractors(target, pool);

    if (chosen.length < 3) {
      console.error(
        `Warning: Target '${target.headword}' (${target.pos}) has only ${chosen.length} phonetic distractors.`,
      );
      warnedCount++;
    }

    rows.push({
      headword: target.headword,
      pos: target.pos,
      CEFR: target.CEFR,
      pronunciation: target.pronunciation,
      phonetic_distractors: chosen.join("; "),
    });
  }

  console.error(
    `Processed ${rows.length} words with IPA. Warnings (fewer than 3 distractors): ${warnedCount}`,
  );

  const columns = [
    "headword",
    "pos",
    "CEFR",
    "pronunciation",
    "phonetic_distractors",
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
    string: ["input", "output", "help"],
    alias: { i: "input", o: "output", h: "help" },
  });

  if (args.help) {
    console.error(
      `pipeline phonetic distractor generator

Usage:
  deno run --allow-read --allow-write pipeline/phonetic_distractors.ts [options]

Options:
  -i, --input <path>     input enriched CSV (defaults to pipeline/out/ALL.enriched.csv)
  -o, --output <path>    result CSV file (defaults to stdout)
  -h, --help             show this help`,
    );
    Deno.exit(0);
  }

  const scriptDir = import.meta.dirname ?? ".";
  const inputPath = args.input ?? `${scriptDir}/out/ALL.enriched.csv`;

  try {
    await runPhoneticDistractors({ input: inputPath, output: args.output });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
