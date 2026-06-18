---
id: "REQ-VERIFICATION-SCORING"
type: requirement
name: "Verification and scoring"
specification: >
  The system SHALL verify selected words via similar-word cards, SHALL reduce the result's
  truthfulness when the user claims to know a pseudoword, and SHALL compute the final score
  server-side as (known real words) minus (pseudoword penalty) and display it.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-WORD-SELECTION"
  - "REQ-SSR-STAGE-FLOW"
---

# Verification and Scoring

Stage 2. Source:
[`roadmap/02-scoring-verification.md`](../../roadmap/02-scoring-verification.md).
Server-side scoring is justified by
[ADR-SSR-ARCHITECTURE](../decisions/ADR-SSR-ARCHITECTURE.md).

## Requirements

1. **Verification cards:** for words marked as known, show cards with similar
   words and "Know"/"Don't know" choices. Process answers on the server.
2. **Truthfulness score:** choosing "Know" for a pseudoword lowers result
   reliability and detects overstatement or guessing.
3. **Scoring algorithm:** calculate known real words minus the pseudoword
   penalty entirely on the server.
4. **Result display:** show the final score and truthfulness indicator.

## Acceptance Criteria

- No scoring runs on the client.
- The final result reflects the pseudoword penalty.
