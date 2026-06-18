---
id: "VER-SEED-MEANINGS"
type: verification
name: "seed:meanings definitions, distractors, and idempotency"
method: utest
verifies:
  - "REQ-MEANING"
  - "REQ-QUESTION-BANK"
---

# Verification: seed:meanings

Covers the `seed:meanings` seeder against
[REQ-MEANING](../requirements/REQ-MEANING.md) (a short definition prompt with
four words and exactly one correct match, chosen to fit the detected vocabulary
level) and [REQ-QUESTION-BANK](../requirements/REQ-QUESTION-BANK.md) (offline
dictionary sourcing and idempotency).

## Code under verification

- `scripts/seed_meanings.ts` — fetches definitions from the Free Dictionary API
  for the real words in the bank, stores one definition prompt plus
  `MIN_DISTRACTORS` wrong words per challenge, and rebuilds the table
  transactionally so repeated runs are idempotent.

## Tests

- `tests/seed_meanings_test.ts` (`deno test`), exercising the pure helpers
  without network or database access:
  - `cleanDefinition` collapses whitespace and trims;
  - `isUsableDefinition` rejects definitions that are too short, too long, or
    that reveal the answer word, and accepts reasonable ones;
  - `extractDefinition` returns the first usable definition across parts of
    speech, returns `null` when none fit, and tolerates missing
    `meanings`/`definitions` fields in the API response.

## Requirement coverage

- _Definition prompt_ — definitions are fetched in the seeder and stored as
  `definitions.definitionText`, so runtime only reads them.
- _Word selection_ / _"exactly one correct match"_ — the prompt's `wordId` is
  the single answer, plus `MIN_DISTRACTORS` (= 3) distractor words excluding the
  answer give four options; the answer word is filtered out of any definition
  that would reveal it.
- _Difficulty adaptation_ — distractors are drawn from the answer word's own
  difficulty tier where the tier is large enough, so every option in a challenge
  sits at one level and the runtime can select definitions matching the level
  detected in the core stages.
- _Seeder-only data sources_ — the Free Dictionary API calls live in the seeder,
  never on the request path; a 404 simply skips the word.
- _Idempotency_ — challenges are rebuilt via a `delete` + `insert` transaction,
  so repeated runs produce the same challenges without duplication.
