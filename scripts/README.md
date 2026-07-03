# Word list scripts

Offline tooling to prepare the LexTALE word bank from CSV word lists. These
scripts are run manually against local data files (`scripts/magic-hat/`,
gitignored) and are separate from the running app.

## Pipeline: clean.ts -> enrich.ts

Source word lists (e.g. `scripts/magic-hat/magicians/ALL.csv`) have columns
`headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold`. Run them through
`clean.ts` before `enrich.ts` so lookups against the lexical data in
`scripts/magic-hat/rabbits/*.json` don't fail on avoidable issues.

```bash
deno task clean scripts/magic-hat/magicians/ALL.csv -o ALL.clean.csv
deno task enrich ALL.clean.csv -o ALL.enriched.csv
```

(equivalent to `deno run --allow-read --allow-write scripts/clean.ts ...` /
`scripts/enrich.ts ...` if you'd rather not use the tasks.)

### 1. `clean.ts` — CSV -> CSV cleanup

- **Slash-variants**: headword is cut to the first `/`-separated form, e.g.
  `adviser/advisor` -> `adviser`, `a.m./A.M./am/AM` -> `a.m.`.
- **Function-word POS**: rows tagged `pronoun`, `preposition`, `determiner`,
  `conjunction`, `number`, `modal auxiliary`, `be-verb`, `do-verb`, `have-verb`,
  `interjection`, or `infinitive-to` are dropped — `enrich.ts` has no rabbits
  data for them. Rows tagged `noun`, `verb`, `adjective`, or `adverb` are kept.
- **Multi-word headwords**: rows whose (slash-cut) headword contains whitespace
  are dropped, e.g. `alarm clock`, `air force`.
- **Hyphenated headwords**: rows whose headword contains a hyphen are dropped,
  e.g. `brand-new`, `CD-ROM`.
- **Abbreviations/acronyms**: rows whose headword contains a `.` (`a.m.`, `Mr.`)
  or is an all-caps acronym (`DVD`, `ID`, `OK`) are dropped.
- **Lowercasing**: surviving headwords are lowercased, trimmed, double spaces
  collapsed, unicode normalized to NFC.
- **Guard**: throws on an empty headword or a POS tag it doesn't recognize
  (neither kept nor dropped), so unexpected input in future files fails loudly
  instead of being silently mis-processed.
- **Reporting**: prints removed/changed counts (broken down by POS and by shape
  rule) to stderr. Pass `--report <path>` to also write the dropped rows, with a
  `reason` column, to their own CSV so nothing is lost silently.

```bash
deno run --allow-read --allow-write scripts/clean.ts <input.csv> \
  -o <output.csv> [--report <removed.csv>]
```

### 2. `enrich.ts` — adds lexical data

Looks up each headword (case-insensitively) in `scripts/magic-hat/rabbits/` and
appends definition, synonyms, examples, pronunciation, and sense count. Rows it
can't resolve are marked `notFound=true` instead of failing the run.

```bash
deno run --allow-read --allow-write scripts/enrich.ts <input.csv> \
  [--rabbits <dir>] -o <output.csv> [--format csv|json] [--hypernyms]
```

### Checking the result

`enrich.ts` prints `Done: N words, enriched M, not found K` to stderr. Cleaning
first should push the notFound rate from roughly 8% down to about 1-2% (the
remainder being words genuinely absent from the WordNet data).
