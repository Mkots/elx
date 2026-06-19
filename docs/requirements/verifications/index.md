# Verifications

Test coverage items that verify requirements. Each verification maps test code
to one or more requirements via the `verifies` relation.

## Seed Data Verifications

| ID                                        | Name                                      | Verifies                        | Code                       |
| ----------------------------------------- | ----------------------------------------- | ------------------------------- | -------------------------- |
| [VER-SEED-WORDS](VER-SEED-WORDS.md)       | seed:words quality and idempotency        | REQ-QUESTION-BANK               | `scripts/seed_words.ts`    |
| [VER-SEED-SYNONYMS](VER-SEED-SYNONYMS.md) | seed:synonyms distractors and idempotency | REQ-QUESTION-BANK               | `scripts/seed_synonyms.ts` |
| [VER-SEED-SPELLING](VER-SEED-SPELLING.md) | seed:spelling sentences and distractors   | REQ-SPELLING, REQ-QUESTION-BANK | `scripts/seed_spelling.ts` |
| [VER-SEED-MEANINGS](VER-SEED-MEANINGS.md) | seed:meanings definitions and distractors | REQ-MEANING, REQ-QUESTION-BANK  | `scripts/seed_meanings.ts` |

## Application Route & Logic Verifications

| ID                                                            | Name                                               | Verifies                                     | Code                                    |
| ------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| [VER-SESSION-STATE](VER-SESSION-STATE.md)                     | Session ID parsing and cookie unit tests           | REQ-SESSION-STATE                            | `tests/session_test.ts`                 |
| [VER-VERIFICATION-SCORING](VER-VERIFICATION-SCORING.md)       | LexTALE scoring algorithm unit tests               | REQ-VERIFICATION-SCORING                     | `tests/lextale_scoring_test.ts`         |
| [VER-STAGE1-ROUTE](VER-STAGE1-ROUTE.md)                       | Stage 1 route integration tests                    | REQ-WORD-SELECTION, REQ-SSR-STAGE-FLOW       | `tests/stage1_route_test.ts`            |
| [VER-STAGE2-ROUTE](VER-STAGE2-ROUTE.md)                       | Stage 2 route integration tests                    | REQ-VERIFICATION-SCORING, REQ-SSR-STAGE-FLOW | `tests/stage2_route_test.ts`            |
| [VER-RESULT-ROUTE](VER-RESULT-ROUTE.md)                       | Result page route integration tests                | REQ-VERIFICATION-SCORING, REQ-SSR-STAGE-FLOW | `tests/result_route_test.ts`            |
| [VER-APP-ROUTE](VER-APP-ROUTE.md)                             | App index and healthcheck route integration tests  | REQ-SSR-STAGE-FLOW, REQ-OBSERVABILITY        | `tests/app_test.ts`                     |
| [VER-SEED-VERIFICATION-ROUTE](VER-SEED-VERIFICATION-ROUTE.md) | Database seed verification route integration tests | REQ-QUESTION-BANK, REQ-SSR-STAGE-FLOW        | `tests/seed_verification_route_test.ts` |
| [VER-ADMIN-ROUTE](VER-ADMIN-ROUTE.md)                         | Admin panel routes and CRUD integration tests      | REQ-ADMIN-PANEL, REQ-DATA-PERSISTENCE        | `tests/admin_test.ts`                   |
| [VER-WIKI-BUILD](VER-WIKI-BUILD.md)                           | Wiki compiler and build script unit tests          | REQ-QUALITY-GATES                            | `tests/wiki_build_test.ts`              |

## End-to-End Verifications

| ID                                  | Name                                              | Verifies                                                        | Code                       |
| ----------------------------------- | ------------------------------------------------- | --------------------------------------------------------------- | -------------------------- |
| [VER-HOME-E2E](VER-HOME-E2E.md)     | Homepage and healthcheck end-to-end browser tests | REQ-SSR-STAGE-FLOW, REQ-OBSERVABILITY                           | `tests/e2e/home.spec.ts`   |
| [VER-STAGE1-E2E](VER-STAGE1-E2E.md) | Stage 1 end-to-end browser tests                  | REQ-WORD-SELECTION, REQ-SSR-STAGE-FLOW, REQ-SESSION-STATE       | `tests/e2e/stage1.spec.ts` |
| [VER-STAGE2-E2E](VER-STAGE2-E2E.md) | Stage 2 end-to-end browser tests                  | REQ-VERIFICATION-SCORING, REQ-SSR-STAGE-FLOW, REQ-SESSION-STATE | `tests/e2e/stage2.spec.ts` |
| [VER-ADMIN-E2E](VER-ADMIN-E2E.md)   | Admin panel end-to-end browser tests              | REQ-ADMIN-PANEL, REQ-DATA-PERSISTENCE, REQ-SYNONYMS-ANTONYMS... | `tests/e2e/admin.spec.ts`  |

## Coverage Status

Run `sara report coverage` from the `requirements/` directory to see current
coverage. Requirements with `status: deferred` (e.g., REQ-SEMANTIC-USAGE) are
excluded from mandatory coverage.
