---
id: "VER-VERIFICATION-SCORING"
type: verification
name: "LexTALE server-side scoring algorithm unit tests"
method: utest
verifies:
  - "REQ-VERIFICATION-SCORING"
---

# Verification: Verification and Scoring Unit Tests

Covers the server-side scoring and pseudoword penalty logic against [REQ-VERIFICATION-SCORING](../requirements/REQ-VERIFICATION-SCORING.md).

## Code under verification

- `scoring/lextale.ts` — contains the `computeScore` function, which implements the LexTALE scoring algorithm including accuracy/truthfulness and pseudoword penalty calculations.

## Tests

- `tests/lextale_scoring_test.ts` (`deno test`):
  - computeScore: all real words known → score equals count, truthfulness 100;
  - computeScore: mix of real and pseudo → score = real - pseudo;
  - computeScore: all pseudowords known → score negative, truthfulness 0;
  - computeScore: no words known → score 0, truthfulness 100;
  - computeScore: empty answers → score 0, truthfulness 100;
  - computeScore: only don't-know answers ignored in score.

## Requirement coverage

- _Truthfulness score_ and _Scoring algorithm_ — verified that claiming to know pseudowords decreases the truthfulness/reliability score and subtracts from the overall score. Empty/don't-know choices are safely ignored in scoring.
