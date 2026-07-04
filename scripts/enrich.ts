#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * magic-hat enricher
 *
 * Reads a CSV word list ,
 * adds enrichment from the lexical data in magic-hat/rabbits/*.json
 *
 * Example:
 *   deno run --allow-read --allow-write scripts/enrich.ts \
 *     --input  scripts/magic-hat/magicians/A1.noun.csv \
 *     --rabbits scripts/magic-hat/rabbits \
 *     --output A1.enriched.csv --format csv [--hypernyms]
 */

import { parseArgs } from "@std/cli/parse-args";
import { parse as parseCsv, stringify as stringifyCsv } from "@std/csv";

// lex_filenum -> synset file name (without .json). Array index = the number.
const LEXNAMES = [
  "adj.all",
  "adj.pert",
  "adv.all",
  "noun.Tops",
  "noun.act",
  "noun.animal",
  "noun.artifact",
  "noun.attribute",
  "noun.body",
  "noun.cognition",
  "noun.communication",
  "noun.event",
  "noun.feeling",
  "noun.food",
  "noun.group",
  "noun.location",
  "noun.motive",
  "noun.object",
  "noun.person",
  "noun.phenomenon",
  "noun.plant",
  "noun.possession",
  "noun.process",
  "noun.quantity",
  "noun.relation",
  "noun.shape",
  "noun.state",
  "noun.substance",
  "noun.time",
  "verb.body",
  "verb.change",
  "verb.cognition",
  "verb.communication",
  "verb.competition",
  "verb.consumption",
  "verb.contact",
  "verb.creation",
  "verb.emotion",
  "verb.motion",
  "verb.perception",
  "verb.possession",
  "verb.social",
  "verb.stative",
  "verb.weather",
  "adj.ppl",
] as const;

// CSV part-of-speech -> short codes used in the lemma index.
const POS_CODES: Record<string, string[]> = {
  noun: ["n"],
  verb: ["v"],
  adj: ["a", "s"],
  adjective: ["a", "s"],
  adv: ["r"],
  adverb: ["r"],
};

interface Synset {
  definition?: string[];
  example?: string[];
  hypernym?: string[];
  members?: string[];
  partOfSpeech?: string;
}

interface Sense {
  id: string;
  synset: string;
  subcat?: string[];
  antonym?: string[];
  derivation?: string[];
}

interface PosEntry {
  pronunciation?: { value: string }[];
  sense?: Sense[];
}

type EntryFile = Record<string, Record<string, PosEntry>>;

interface EnrichedSense {
  synsetId: string;
  lexname: string | null;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  hypernyms: { id: string; lemma?: string }[];
  frames?: string[];
}

interface EnrichedRow {
  headword: string;
  pos: string;
  pronunciation: string[];
  senseCount: number;
  senses: EnrichedSense[];
  [key: string]: unknown; // original CSV columns
}

class Rabbits {
  private entriesCache = new Map<string, EntryFile | null>();
  private lowerCache = new Map<string, Map<string, string[]>>();
  private synsetCache = new Map<string, Record<string, Synset> | null>();
  private globalSynsets: Map<string, Synset> | null = null;
  private frames: Record<string, string> = {};

  constructor(private dir: string) {}

  async init(withHypernyms: boolean) {
    try {
      this.frames = JSON.parse(
        await Deno.readTextFile(`${this.dir}/frames.json`),
      );
    } catch {
      this.frames = {};
    }
    if (withHypernyms) await this.buildGlobalIndex();
  }

  // Entries file name from the first letter of the headword.
  private entryFileFor(headword: string): string {
    const c = headword[0]?.toLowerCase() ?? "0";
    return /[a-z]/.test(c) ? `entries-${c}.json` : "entries-0.json";
  }

  private async loadJson<T>(name: string): Promise<T | null> {
    try {
      return JSON.parse(await Deno.readTextFile(`${this.dir}/${name}`)) as T;
    } catch {
      return null;
    }
  }

  private async loadEntries(headword: string): Promise<EntryFile | null> {
    const name = this.entryFileFor(headword);
    if (!this.entriesCache.has(name)) {
      this.entriesCache.set(name, await this.loadJson<EntryFile>(name));
    }
    return this.entriesCache.get(name)!;
  }

  // Entry by headword, case-insensitive; case variants are merged together.
  private async resolveEntry(
    headword: string,
  ): Promise<Record<string, PosEntry> | null> {
    const file = await this.loadEntries(headword);
    if (!file) return null;

    const name = this.entryFileFor(headword);
    let lower = this.lowerCache.get(name);
    if (!lower) {
      lower = new Map();
      for (const key of Object.keys(file)) {
        const lk = key.toLowerCase();
        (lower.get(lk) ?? lower.set(lk, []).get(lk)!).push(key);
      }
      this.lowerCache.set(name, lower);
    }
    const origs = lower.get(headword.toLowerCase());
    if (!origs) return null;
    // Merge all case variants (e.g. "august" + "August").
    return Object.assign({}, ...origs.map((k) => file[k]));
  }

  // Synset file name from a sense key (lemma%ss_type:lex_filenum:...).
  private lexnameForSenseKey(senseKey: string): string | null {
    const rest = senseKey.split("%")[1];
    if (!rest) return null;
    const lexFilenum = Number(rest.split(":")[1]);
    return LEXNAMES[lexFilenum] ?? null;
  }

  private async loadSynsetFile(
    lexname: string,
  ): Promise<Record<string, Synset> | null> {
    if (!this.synsetCache.has(lexname)) {
      this.synsetCache.set(
        lexname,
        await this.loadJson<Record<string, Synset>>(`${lexname}.json`),
      );
    }
    return this.synsetCache.get(lexname)!;
  }

  // Loads every synset file once into a shared index (to resolve hypernyms).
  private async buildGlobalIndex() {
    this.globalSynsets = new Map();
    for (const lexname of LEXNAMES) {
      const file = await this.loadSynsetFile(lexname);
      if (!file) continue;
      for (const [id, syn] of Object.entries(file)) {
        this.globalSynsets.set(id, syn);
      }
    }
  }

  frameFor(key: string): string | undefined {
    return this.frames[key];
  }

  private async synsetFromSense(sense: Sense): Promise<Synset | null> {
    const lexname = this.lexnameForSenseKey(sense.id);
    if (!lexname) return null;
    const file = await this.loadSynsetFile(lexname);
    return file?.[sense.synset] ?? null;
  }

  // Resolves a hypernym lemma from the shared index (when it has been built).
  private hypernymLemma(id: string): string | undefined {
    return this.globalSynsets?.get(id)?.members?.[0];
  }

  async enrich(headword: string, pos: string): Promise<{
    found: boolean;
    pronunciation: string[];
    senses: EnrichedSense[];
  }> {
    const entry = await this.resolveEntry(headword);
    if (!entry) return { found: false, pronunciation: [], senses: [] };

    const codes = POS_CODES[pos.toLowerCase()] ?? [pos.toLowerCase()];
    // Handle homographs: keys like `n`, `n-1`, `n-2`, `v-1` ...
    const matchKeys = Object.keys(entry).filter((k) =>
      codes.some((c) => k === c || k.startsWith(`${c}-`))
    );
    const pronunciation = new Set<string>();
    const senses: EnrichedSense[] = [];

    for (const key of matchKeys) {
      const posEntry = entry[key];
      if (!posEntry) continue;
      for (const p of posEntry.pronunciation ?? []) {
        if (p.value) pronunciation.add(p.value);
      }
      for (const sense of posEntry.sense ?? []) {
        const lexname = this.lexnameForSenseKey(sense.id);
        const syn = await this.synsetFromSense(sense);
        const members = syn?.members ?? [];
        const synonyms = members.filter(
          (m) => m.toLowerCase() !== headword.toLowerCase(),
        );
        const antonyms = [
          ...new Set(
            (sense.antonym ?? [])
              .map((key) => key.split("%")[0].replace(/_/g, " "))
              .filter((lemma) =>
                lemma.toLowerCase() !== headword.toLowerCase()
              ),
          ),
        ];
        const hypernyms = (syn?.hypernym ?? []).map((id) => {
          const lemma = this.hypernymLemma(id);
          return lemma ? { id, lemma } : { id };
        });
        const frames = (sense.subcat ?? [])
          .map((k) => this.frameFor(k))
          .filter((f): f is string => Boolean(f));

        senses.push({
          synsetId: sense.synset,
          lexname,
          definition: (syn?.definition ?? []).join("; "),
          examples: syn?.example ?? [],
          synonyms,
          antonyms,
          hypernyms,
          ...(frames.length ? { frames } : {}),
        });
      }
    }

    return {
      found: senses.length > 0,
      pronunciation: [...pronunciation],
      senses,
    };
  }
}

function toCsvRow(
  row: EnrichedRow,
  originalColumns: string[],
  withHypernyms?: boolean,
): Record<string, string> {
  const first = row.senses[0];
  const out: Record<string, string> = {};
  for (const col of originalColumns) out[col] = String(row[col] ?? "");
  out.lexname = first?.lexname ?? "";
  out.definition = first?.definition ?? "";
  out.synonyms = first ? first.synonyms.join("; ") : "";
  out.antonyms = first ? first.antonyms.join("; ") : "";
  if (withHypernyms) {
    out.hypernyms = first
      ? first.hypernyms
        .map((h) => h.lemma)
        .filter((l): l is string => Boolean(l))
        .join("; ")
      : "";
  }
  out.examples = first ? first.examples.join(" | ") : "";
  out.pronunciation = row.pronunciation.join(", ");
  out.senseCount = String(row.senseCount);
  return out;
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["input", "rabbits", "output", "format"],
    boolean: ["hypernyms", "help"],
    alias: { i: "input", o: "output", h: "help" },
    default: { format: "csv" },
  });

  // Input may be passed via --input or as the first positional argument.
  const input = args.input ?? args._[0]?.toString();

  if (args.help || !input) {
    console.error(
      `magic-hat enricher

Usage:
  deno run --allow-read --allow-write scripts/enrich.ts <input.csv> [options]

Options:
  -i, --input <path>     input CSV (or pass it as the first positional arg)
      --rabbits <dir>    data directory (defaults to ./magic-hat/rabbits next to the script)
  -o, --output <path>    result file (defaults to stdout)
      --format <fmt>     csv | json (defaults to csv)
      --hypernyms        resolve hypernyms to lemmas (loads all synsets once)
  -h, --help             show this help`,
    );
    Deno.exit(args.help ? 0 : 1);
  }

  const format = args.format === "json" ? "json" : "csv";
  const scriptDir = import.meta.dirname ?? ".";
  const rabbitsDir = args.rabbits ?? `${scriptDir}/magic-hat/rabbits`;

  const rabbits = new Rabbits(rabbitsDir);
  await rabbits.init(Boolean(args.hypernyms));

  const csvText = await Deno.readTextFile(input);
  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];
  const originalColumns = Object.keys(records[0] ?? {});

  const results: EnrichedRow[] = [];
  let found = 0;
  let processed = 0;

  for (const rec of records) {
    const headword = (rec.headword ?? "").trim();
    const pos = (rec.pos ?? "").trim();
    if (!headword) continue;

    const { found: ok, pronunciation, senses } = await rabbits.enrich(
      headword,
      pos,
    );
    if (ok) found++;
    processed++;
    if (processed % 100 === 0) {
      console.error(`  ...processed ${processed} (found ${found})`);
    }

    if (!ok) continue;

    results.push({
      ...rec,
      headword,
      pos,
      pronunciation,
      senseCount: senses.length,
      senses,
    });
  }

  console.error(
    `Done: ${processed} words, enriched ${found}, not found ${
      processed - found
    }.`,
  );

  let outText: string;
  if (format === "csv") {
    const rows = results.map((r) =>
      toCsvRow(r, originalColumns, Boolean(args.hypernyms))
    );
    const columns = [
      ...originalColumns,
      "lexname",
      "definition",
      "synonyms",
      "antonyms",
      "examples",
      "pronunciation",
      "senseCount",
    ];
    if (args.hypernyms) {
      columns.push("hypernyms");
    }
    outText = stringifyCsv(rows, { columns });
  } else {
    outText = JSON.stringify(results, null, 2);
  }

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
