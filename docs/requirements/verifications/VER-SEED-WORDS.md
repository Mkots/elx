---
id: "VER-SEED-WORDS"
type: verification
name: "seed:words data quality and idempotency"
method: utest
verifies:
  - "REQ-QUESTION-BANK"
---

# Verification: seed:words

Covers the `seed:words` seeder against [[REQ-QUESTION-BANK]] (pre-write
validation and idempotency).

## Code under verification

- `scripts/seed_words.ts` — seeds real words, pseudowords, reality flags, and
  difficulty; upserts on the unique `value` column so repeated runs create no
  duplicates.

## Tests

- `tests/seed_words_test.ts` (`deno test`):
  - no duplicate word values;
  - values are trimmed lowercase and non-empty;
  - difficulty is an integer in 1–5;
  - the bank contains both real words and pseudowords.

## Requirement coverage

- *Pre-write validation* and *"Invalid rows never enter the database"* — the
  duplicate, casing, and difficulty-range assertions.
- *Idempotency* / *"Re-running a seeder does not change database contents"* —
  the `onConflictDoUpdate` upsert on `words.value`, verified end-to-end by two
  consecutive runs leaving the row count unchanged.
