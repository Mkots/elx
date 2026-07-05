---
id: "VER-SEED-WORDS"
type: verification
name: "seed:words data quality and idempotency"
method: utest
verifies:
  - "REQ-QUESTION-BANK"
---

# Verification: seed:words

Covers the `seed:words` seeder against
[REQ-QUESTION-BANK](../requirements/REQ-QUESTION-BANK.md) (pre-write validation
and idempotency).

## Code under verification

- `scripts/seed_words.ts` — a thin loader that reads
  `pipeline/data/seed_words.csv` through `scripts/importer_core.ts` and upserts
  on the unique `value` column, so repeated runs create no duplicates. Each row
  is stamped with a `bank_version` (a `sha256:` content hash of the CSV), giving
  every word a traceable link to the generation run that produced it;
  pre-existing rows keep `'pre-manifest'` until re-imported.

## Tests

- `tests/seed_words_test.ts` (`deno test`): parses
  `pipeline/data/seed_words.csv` via `importer_core.ts` (no DB needed) and
  checks:
  - the expected word count;
  - no duplicate word values;
  - values are trimmed lowercase and non-empty;
  - difficulty is an integer in 1–5;
  - the bank contains both real words and pseudowords;
  - a spot-checked real word's fields match the known source data.
- `tests/importer_test.ts` (`deno test`): `executeImport` stamps the same
  `bankVersion` on both inserted and updated rows.
- `tests/admin_tickets_test.ts` (`VER-ADMIN-TICKETS-DB`, needs `DATABASE_URL`):
  a freshly generated ticket's notes include `Bank version(s):`.

## Requirement coverage

- _Pre-write validation_ and _"Invalid rows never enter the database"_ — the
  duplicate, casing, and difficulty-range assertions.
- _Idempotency_ / _"Re-running a seeder does not change database contents"_ —
  the `onConflictDoUpdate` upsert on `words.value`, verified end-to-end by two
  consecutive runs leaving the row count unchanged.
