# Stage 0: Offline Database Seeding (Question Bank)

## Description

A cross-cutting preparation stage. All words, questions, distractors, and
metadata are generated and validated **in advance by offline scripts**, then
stored in PostgreSQL. At runtime the application only performs `SELECT` queries,
with no external API or ML model calls in the user request path.

## Motivation

- **Determinism:** every test run uses the same debuggable, verifiable question
  bank.
- **Speed:** runtime has no network calls or expensive computation.
- **Reliability:** the test does not fail when a third-party API is unavailable.
- **Quality:** distractors and answer unambiguity are validated once before data
  is written to the database.

## Requirements

1. **Seeder scripts** in `scripts/`, run manually with `deno task seed:*`:
   - `seed:words`: the LexTALE word bank (real words, pseudowords, reality flag,
     and difficulty). Stages 1-2.
   - `seed:synonyms`: synonyms, antonyms, and distractors. Stage 3.
   - `seed:spelling`: context sentences and phonetically or visually similar
     options. Stage 4.
   - `seed:meanings`: word definitions and answer options. Stage 5.
2. **Data sources used only by seeders:**
   - [Datamuse API](https://www.datamuse.com/api/) for synonyms, antonyms, and
     phonetically similar distractors.
   - A dictionary API, such as Free Dictionary, for word definitions.
3. **Validation before writing:**
   - Verify that each word exists and that its reality flag is correct.
   - Ensure the correct answer is unambiguous.
   - Reject duplicate and empty fields.

## Technical Details

- Scripts are idempotent: repeated runs use an upsert on the natural key and do
  not create duplicates.
- Generated data is recorded through the Drizzle schema and migrations.
- External API calls happen only here and use the native `fetch`.
