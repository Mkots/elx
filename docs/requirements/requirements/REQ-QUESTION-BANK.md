---
id: "REQ-QUESTION-BANK"
type: requirement
name: "Offline question bank generation"
specification: >
  The system SHALL generate the entire question bank (words, distractors, metadata) ahead of
  time via offline seeder scripts and at runtime only read it from PostgreSQL, with no calls
  to external APIs or ML models on the user request path.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DATA-PERSISTENCE"
---

# Offline Question Bank Generation

Cross-cutting preparation block for Stage 0. Sources:
[`roadmap/00-data-seeding.md`](../../roadmap/00-data-seeding.md),
[`tech-details/tech-stack.md`](../../tech-details/tech-stack.md). The choice is
justified by [ADR-OFFLINE-QUESTION-BANK](../decisions/ADR-OFFLINE-QUESTION-BANK.md).

## Requirements

1. **Seeder scripts** in `scripts/`, run manually as `deno task seed:*`:
   - `seed:words` for real words, pseudowords, reality flags, and difficulty in
     Stages 1-2.
   - `seed:synonyms` for synonyms, antonyms, and distractors in Stage 3.
   - `seed:spelling` for context sentences and phonetically or visually similar
     options in Stage 4.
   - `seed:meanings` for definitions and answer options in Stage 5.
2. **Seeder-only data sources:** use Datamuse for synonyms, antonyms, and
   phonetic distractors, and a dictionary API for definitions. All network calls
   happen here, never at runtime.
3. **Pre-write validation:** verify word existence and reality flags, ensure one
   unambiguous correct answer, and reject duplicates or empty fields.
4. **Idempotency:** repeated runs upsert by natural key and create no
   duplicates.

## Acceptance Criteria

- Runtime performs only `SELECT` queries.
- Invalid rows never enter the database.
- Re-running a seeder does not change database contents.
