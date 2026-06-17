# Verifications

Test coverage items that verify requirements. Each verification maps test code to one or more requirements via the `verifies` relation.

## Seed Data Verifications

| ID | Name | Verifies | Code |
|----|------|----------|------|
| [VER-SEED-WORDS](VER-SEED-WORDS.md) | seed:words quality and idempotency | REQ-QUESTION-BANK | `scripts/seed_words.ts` |
| [VER-SEED-SYNONYMS](VER-SEED-SYNONYMS.md) | seed:synonyms distractors and idempotency | REQ-QUESTION-BANK | `scripts/seed_synonyms.ts` |
| [VER-SEED-SPELLING](VER-SEED-SPELLING.md) | seed:spelling sentences and distractors | REQ-SPELLING, REQ-QUESTION-BANK | `scripts/seed_spelling.ts` |
| [VER-SEED-MEANINGS](VER-SEED-MEANINGS.md) | seed:meanings definitions and distractors | REQ-MEANING, REQ-QUESTION-BANK | `scripts/seed_meanings.ts` |

## Coverage Status

Run `sara report coverage` from the `requirements/` directory to see current coverage. Requirements with `status: deferred` (e.g., REQ-SEMANTIC-USAGE) are excluded from mandatory coverage.
