---
id: "VER-SEED-SYNONYMS"
type: verification
name: "seed:synonyms distractors and idempotency"
method: utest
verifies:
  - "REQ-QUESTION-BANK"
---

# Verification: seed:synonyms

Covers the `seed:synonyms` seeder against [[REQ-QUESTION-BANK]] (offline
Datamuse sourcing, one unambiguous answer with distractors, and idempotency).
The runtime challenge it feeds is specified by [[REQ-SYNONYMS-ANTONYMS]].

## Code under verification

- `scripts/seed_synonyms.ts` — fetches synonyms/antonyms from the Datamuse API
  for the canonical LexTALE words, stores one correct target plus at least three
  real-word distractors per challenge, and rebuilds the table transactionally so
  repeated runs are idempotent.

## Tests

- `tests/seed_synonyms_test.ts` (`deno test`), exercising the pure helpers
  without network or database access:
  - `isUsableWord` rejects phrases, hyphens, casing, and out-of-range lengths;
  - `frequencyFromTags` parses the Datamuse `md=f` metadata;
  - `difficultyFromFrequency` maps frequency onto the 1–5 scale;
  - `pickDistractors` returns the requested count of distinct ids from the pool,
    is deterministic under a seeded RNG, and caps at the pool size.

## Requirement coverage

- _Seeder-only data sources_ — Datamuse calls live in the seeder, never on the
  request path.
- _Pre-write validation_ / _"one unambiguous correct answer"_ — single-word
  filtering, plus the `MIN_DISTRACTORS` distractor count drawn from real words
  excluding the prompt, the answer, and the prompt's other synonyms/antonyms.
- _Idempotency_ — challenges are rebuilt via a `delete` + `insert` transaction;
  imported target words upsert with `onConflictDoNothing`, verified end-to-end
  by two consecutive runs producing the same challenge count.
