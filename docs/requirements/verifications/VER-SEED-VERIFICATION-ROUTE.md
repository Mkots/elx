---
id: "VER-SEED-VERIFICATION-ROUTE"
type: verification
name: "Database seed verification endpoint route integration tests"
method: itest
verifies:
  - "REQ-QUESTION-BANK"
  - "REQ-SSR-STAGE-FLOW"
---

# Verification: Database Seed Verification Route Integration Tests

Covers seed-verification routes against
[REQ-QUESTION-BANK](../requirements/REQ-QUESTION-BANK.md) and
[REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md).

## Code under verification

- `routes/seed_verification.ts` — contains route handlers for `/health/seeds/*`
  allowing monitoring and checking of database seed state.

## Tests

- `tests/seed_verification_route_test.ts` (`deno test` + Hono app.request):
  - GET /health/seeds/words returns seeded words;
  - GET /health/seeds/synonyms returns synonym challenges;
  - GET /health/seeds/spelling returns spelling challenges;
  - GET /health/seeds/meanings returns meaning challenges;
  - seed verification routes propagate errors through app handler.

## Requirement coverage

- _Seeder scripts_ and _Offline question bank generation_ — ensures seeded words
  and optional stage challenges are correctly exposed for system diagnostic
  verification.
