# Additional Data Enrichers — Development Plan

Source:
[`scripts/magic-hat/ENRICHERS_PLAN.md`](../../scripts/magic-hat/ENRICHERS_PLAN.md).
Series tag: `[Enrichers]`.

## Goal

The offline magic-hat pipeline produces a fully enriched LexTALE word bank
without any network calls. Running the enrichers over the cleaned CSV yields:

- a `words`-ready CSV whose columns (`value`, `is_real`, `difficulty`,
  `synonyms`, `antonyms`, `definition`) map directly onto the `words` table (see
  [`docs/data-model.md`](../data-model.md)) and can be imported through the
  existing admin UI import path (`scripts/importer_core.ts`, already supports
  these fields with `splitBy`);
- standalone per-stage distractor/context artifacts (semantic distractors,
  phonetic distractors, gap sentences) that a later ticket-generation step will
  consume.

We know it works when: every enricher script is idempotent, runs offline, and
`deno task ci` is green; the enriched CSV imports cleanly via the admin panel;
and the produced word rows carry non-empty `difficulty`, `antonyms`, and (where
available) `synonyms`/`definition`.

## Decisions

1. **Everything is offline; no Datamuse.** All enrichment is derived from local
   data (WordNet `rabbits/*.json`, a downloaded SUBTLEX frequency file, and a
   downloaded Tatoeba corpus). The plan's original hybrid "Datamuse `sl=`"
   fallback for phonetic distractors is dropped. _Why:_ the user chose a fully
   offline pipeline whose output is loaded through the admin UI, so no seeder
   makes network calls.
2. **The enriched list is loaded via the admin UI import**, not via networked
   `seed:*` scripts. `scripts/importer_core.ts` already accepts
   `value/isReal/difficulty/synonyms/antonyms/definition`, so no importer change
   is required for the `words` columns.
3. **This supersedes the Datamuse-based seeders.** `REQ-QUESTION-BANK` and
   `VER-SEED-SYNONYMS` / `VER-SEED-SPELLING` / `VER-SEED-MEANINGS` currently
   mandate Datamuse-sourced `seed:*` scripts. Those requirement/verification
   docs must be updated to reflect the offline-enrichment + admin-import
   approach. That doc update is tracked as an open question below (not rewritten
   inside this plan).
4. **`difficulty` (1–5) = CEFR primary, SUBTLEX for calibration/fallback.**
   `A1→1, A2→2, B1→3, B2→4`; words with no CEFR / outside the list → `5`.
   SUBTLEX frequency (as a `zipf` value) is joined offline to calibrate and to
   backfill words missing a CEFR band. _Why:_ CEFR is already in the CSV;
   SUBTLEX was chosen over wordfreq as the frequency source. The
   `difficultyFromFrequency` helper referenced by `VER-SEED-SYNONYMS` is not the
   canonical difficulty and is out of scope here.
5. **Frequency source: SUBTLEX-US TSV, downloaded once** into a local folder
   next to `rabbits/` and joined offline. A `zipf` column is added to the
   intermediate enriched CSV for traceability (it is not a `words` column).
6. **Phased execution order, one PR-sized issue each**: work items are numbered
   `1 → 6` below in a dependency-respecting execution order — antonyms,
   difficulty, pseudowords (needed earliest by the roadmap), then semantic
   distractors, phonetic distractors, gap sentences. (This preserves the source
   plan's intent of doing semantic distractors before the phonetic/gap items;
   the source plan's own numbering differed.)
7. **Enrichers 4–6 emit standalone CSV/JSON artifacts**, keyed by headword. The
   `words` import covers only
   `value/isReal/difficulty/synonyms/antonyms/definition`. Consumption of the
   distractor/gap artifacts by ticket generation (per `docs/data-model.md` §5,
   distractors live on `tickets`) is **out of scope** of this plan.

### Verified state at planning time (mismatches corrected)

- `enrich.ts` outputs `lexname`, `definition`, `synonyms`, `examples`,
  `pronunciation`, and `senseCount`. It does **not** output `antonyms`, and
  although it can resolve `hypernyms` in memory (`--hypernyms`), it does **not**
  write them to the CSV. The source plan's claim that enrich.ts "closes
  hypernyms" is inaccurate for the CSV output.
- `ALL.enriched.csv` header has **no** `difficulty`, `zipf`, `is_real`, or
  `antonyms` columns yet.
- Only `seed:words` exists as a `deno task`; `seed:synonyms/spelling/meanings`
  are specified but unimplemented.

## Work items

### 1. Extract antonyms (and emit hypernyms) in `enrich.ts`

- **Depends on**: —
- **Context**: `Sense.antonym` in `rabbits/entries-*.json` holds sense keys of
  the form `lemma%...`; `enrich.ts` already parses `sense` objects but discards
  `antonym`. `toCsvRow` (scripts/enrich.ts) has no `antonyms` column, and
  hypernyms (resolvable via `--hypernyms`) are never written out — item 6 needs
  them.
- **Deliverable**:
  1. In `enrich()`, read `sense.antonym`, cut each key at `%` to get the lemma,
     dedupe against the headword, expose as `EnrichedSense.antonyms`.
  2. Add an `antonyms` column (joined with a semicolon and a space) to
     `toCsvRow` and the CSV column list.
  3. Add a `hypernyms` column (lemmas, joined with a semicolon and a space) to
     the CSV output when `--hypernyms` is set.
- **Acceptance criteria**:
  - Running `deno task enrich` on a sample list produces `antonyms` populated
    for words with WordNet antonyms (e.g. a known pair) and empty otherwise.
  - With `--hypernyms`, the `hypernyms` column is populated; without it the
    column is empty (or absent) with no error.
  - `deno task ci` green.

### 2. Compute `difficulty` (1–5) + `zipf` from CEFR + SUBTLEX

- **Depends on**: —
- **Context**: `words.difficulty` is `NOT NULL` (data-model). CEFR is present in
  the CSV (`A1/A2/B1/B2`), but no `difficulty`/`zipf` columns exist.
- **Deliverable**:
  1. A one-time offline fetch of the SUBTLEX-US frequency file into a local data
     folder next to `rabbits/` (documented, downloaded manually, not fetched at
     runtime).
  2. A join step (in `enrich.ts` or a sibling script) that, per headword,
     derives `zipf` from SUBTLEX and `difficulty` via: CEFR band (`A1→1 … B2→4`)
     primary; `5` for no-CEFR/out-of-list; SUBTLEX used to calibrate and to
     backfill missing bands.
  3. Adds `difficulty` and `zipf` columns to the enriched CSV.
- **Acceptance criteria**:
  - Every output row has an integer `difficulty` in `1..5`; no empty values.
  - A word with CEFR `B2` maps to `4`; a rare out-of-list word maps to `5`.
  - Re-running is deterministic (same input → same output).
  - `deno task ci` green.

### 3. Pseudoword generator (`is_real=false`)

- **Depends on**: —
- **Context**: LexTALE Stage 1–2 needs pseudowords. This is a generator, not an
  enricher. `rabbits/entries-*.json` acts as an existence filter.
- **Deliverable**:
  1. `scripts/pseudowords.ts`: bigram/syllable Markov model over the real word
     list (Wuggy-style) that emits candidate non-words.
  2. Validation that each candidate does **not** exist in `entries-*.json`
     (rabbits used as a dictionary filter).
  3. Output rows compatible with the `words` import (`value`, `is_real=false`,
     `difficulty`, empty `synonyms/antonyms`, null `definition`).
- **Acceptance criteria**:
  - Generated candidates are all absent from the rabbits dictionary.
  - Output is a valid `words`-import CSV row set; a run produces the requested
    count of unique pseudowords.
  - Deterministic under a seeded RNG.
  - `deno task ci` green.

### 4. Semantic distractors for definition/synonym questions

- **Depends on**: 1 (antonyms + hypernyms in CSV)
- **Context**: Stage 3 & 5 need plausible-but-wrong options. Purely local
  selection over enriched columns (`pos`, `CEFR`, `lexname`, `synonyms`,
  `antonyms`, `hypernyms`).
- **Deliverable**:
  1. `scripts/distractors.ts` operating on the enriched CSV.
  2. Candidate selection: same `pos` + same CEFR band; exclude the target's
     `synonyms`/`antonyms`/`hypernyms`. For definition questions, prefer same
     `lexname` for semantic plausibility.
  3. A standalone per-word distractor artifact (CSV/JSON), not a `words` column.
- **Acceptance criteria**:
  - Each target gets ≥3 distinct distractors drawn from real words, none of
    which are the target's own synonyms/antonyms/hypernyms.
  - Deterministic under a seeded RNG.
  - `deno task ci` green.

### 5. Phonetic distractors for spelling (Stage 4)

- **Depends on**: 1 (uses enriched pronunciation/IPA already produced by
  `enrich.ts`)
- **Context**: Stage 4 needs phonetically/visually similar spelling options.
  Fully local — **no Datamuse**.
- **Deliverable**:
  1. Local candidate selection: edit distance over IPA and orthography within
     the dictionary, plus double-metaphone equivalence.
  2. A standalone per-word phonetic-distractor artifact.
- **Acceptance criteria**:
  - Each target with available IPA gets ≥3 similar-sounding/similar-spelled
    real-word candidates; targets with fewer are reported, not silently dropped.
  - Deterministic; no network calls.
  - `deno task ci` green.

### 6. Gap sentences (Stage 4)

- **Depends on**: 5 (shares the spelling-stage artifact set)
- **Context**: WordNet `examples` exist but coverage is partial and they are not
  gap-ready. Tatoeba (CC-BY) augments offline.
- **Deliverable**:
  1. Filter enriched `examples` to those containing the headword; replace the
     headword occurrence with `___`.
  2. One-time offline download of the Tatoeba corpus into a local data folder;
     backfill gap sentences for words lacking a usable WordNet example.
  3. A standalone per-word gap-sentence artifact.
- **Acceptance criteria**:
  - Produced sentences contain exactly one `___` and do not leak the headword.
  - Words with no WordNet example are backfilled from Tatoeba where available;
    coverage gaps are reported.
  - `deno task ci` green.

## Roadmap binding

| Enricher                  | Consumed by                    | Stage     |
| :------------------------ | :----------------------------- | :-------- |
| 1. Antonyms (+ hypernyms) | `words` import / distractors   | Stage 3   |
| 2. Difficulty + zipf      | `words` import                 | Stage 1–2 |
| 3. Pseudowords            | `words` import                 | Stage 1–2 |
| 4. Semantic distractors   | ticket generation (Stage 3, 5) | Stage 3,5 |
| 5. Phonetic distractors   | ticket generation (Stage 4)    | Stage 4   |
| 6. Gap sentences          | ticket generation (Stage 4)    | Stage 4   |

## Out of scope

- **Ticket generation / how distractor artifacts become `tickets` rows** —
  enrichers 4–6 stop at standalone artifacts (Decision 7).
- **Datamuse and any runtime/seed-time network calls** — dropped (Decision 1).
- **Rewriting `REQ-QUESTION-BANK` / `VER-SEED-*`** — flagged as an open
  question, not done here.
- **The `words` table migration/backfill** (`docs/data-model.md` §4) — a
  separate DB-refactor track.

## Open questions

1. **Requirement/verification alignment** — `REQ-QUESTION-BANK` and the
   `VER-SEED-*` docs still describe Datamuse-based seeders. Who updates them to
   the offline-enrichment + admin-import model, and when? _Trigger:_ before the
   first enricher PR merges, so CI/verification docs don't contradict the code.
   Does not block starting item 1.
2. **SUBTLEX file provenance & license note** — exact SUBTLEX-US file/version
   and where its download is documented in-repo. _Trigger:_ needed during
   item 2.
3. **Tatoeba subset size** — full corpus vs a filtered English subset kept in
   the repo/data folder. _Trigger:_ needed during item 6.
