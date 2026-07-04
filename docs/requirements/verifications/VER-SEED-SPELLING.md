---
id: "VER-SEED-SPELLING"
type: verification
name: "seed:spelling sentences, distractors, and idempotency"
method: utest
verifies:
  - "REQ-SPELLING-SEEDS"
  - "REQ-QUESTION-BANK"
---

# Verification: seed:spelling

Covers the `seed:spelling` seeder against
[REQ-SPELLING-SEEDS](../requirements/REQ-SPELLING-SEEDS.md) (a context sentence
with a single gap and four phonetically similar options, exactly one correct)
and [REQ-QUESTION-BANK](../requirements/REQ-QUESTION-BANK.md) (offline Datamuse
sourcing and idempotency).

## Code under verification

- `scripts/seed_spelling.ts` — for each curated context sentence, fetches
  phonetically similar words from the Datamuse sounds-like API (`sl=`), stores
  one correct target plus `MIN_DISTRACTORS` similar-sounding distractors per
  challenge, and rebuilds the table transactionally so repeated runs are
  idempotent.

## Tests

- `tests/seed_spelling_test.ts` (`deno test`), exercising the seed data and pure
  helpers without network or database access:
  - `hasSingleGap` accepts a sentence with exactly one `___` placeholder and
    rejects sentences with zero or multiple gaps;
  - every `spellingSeeds` entry is a usable single-token lowercase word, carries
    a difficulty in the 1–5 range, and has no duplicates;
  - every sentence contains exactly one gap and never leaks its own answer word.

## Requirement coverage

- _Context sentence_ — every seed sentence carries exactly one `___` gap
  (`hasSingleGap`), and the answer word never appears in the sentence itself.
- _Spelling options_ / _"one unambiguous correct answer"_ — the correct word
  plus `MIN_DISTRACTORS` (= 3) phonetically similar wrong answers give four
  options; distractors are taken in descending sound-similarity order, filtered
  through `isUsableWord`, de-duplicated, and never equal the correct word.
- _Seeder-only data sources_ — the Datamuse sounds-like calls live in the
  seeder, never on the request path.
- _Idempotency_ — challenges are rebuilt via a `delete` + `insert` transaction;
  the correct word and imported distractors upsert with `onConflictDoNothing`,
  so repeated runs produce the same challenges without duplicating words.
