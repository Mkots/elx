---
id: "REQ-WORD-SELECTION"
type: requirement
name: "Core LexTALE word selection"
specification: >
  The system SHALL present a grid of 60 words (real words of varying difficulty plus
  non-existent pseudowords) and SHALL let the user mark the words they know and proceed to the
  next stage, persisting the selection in session state.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-SESSION-STATE"
---

# Core LexTALE Word Selection

Stage 1. Source:
[`roadmap/01-lextale-core.md`](../../roadmap/01-lextale-core.md).

## Requirements

1. **Word bank:** show 60 words per page, mixing real English words of varying
   difficulty with English-looking pseudowords. Each has a reality flag and
   difficulty level prepared by [REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and
   `seed:words`.
2. **Selection interface:** server-render a grid or list of 60 words. Let the
   user mark known words with HTML form checkboxes without requiring client-side
   JavaScript.
3. **Navigation:** "Next" or "Finish selection" submits the form and stores the
   selected words in session state for verification and scoring.

## Acceptance Criteria

- The application works without client-side JavaScript.
- Selected words are available from session state in the next stage.
