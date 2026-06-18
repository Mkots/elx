---
id: "SOL-LEXTALE"
type: solution
name: "LexTALE vocabulary test"
description: >
  A web application that assesses English vocabulary using the LexTALE method:
  selecting known words among pseudoword traps, verification and scoring, plus
  optional synonym/antonym, spelling, and meaning challenges. The architecture uses
  Deno + Hono SSR/MPA, Deno KV session state, and an offline-generated PostgreSQL question bank.
---

# LexTALE Vocabulary Test

## Goal

Provide a fast vocabulary test protected against client-side tampering, plus
optional stages for additional self-assessment.

## Scope

Each logical block is a separate `requirement` that refines this solution and
can be developed independently:

- Core LexTALE flow: [REQ-WORD-SELECTION](../requirements/REQ-WORD-SELECTION.md)
  to [REQ-VERIFICATION-SCORING](../requirements/REQ-VERIFICATION-SCORING.md).
- Optional challenges:
  [REQ-SYNONYMS-ANTONYMS](../requirements/REQ-SYNONYMS-ANTONYMS.md),
  [REQ-SPELLING](../requirements/REQ-SPELLING.md),
  [REQ-MEANING](../requirements/REQ-MEANING.md), and deferred
  [REQ-SEMANTIC-USAGE](../requirements/REQ-SEMANTIC-USAGE.md).
- Platform blocks: [REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md),
  [REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md),
  [REQ-DATA-PERSISTENCE](../requirements/REQ-DATA-PERSISTENCE.md),
  [REQ-QUESTION-BANK](../requirements/REQ-QUESTION-BANK.md).
- Operations and quality: [REQ-DEPLOYMENT](../requirements/REQ-DEPLOYMENT.md),
  [REQ-BACKUPS](../requirements/REQ-BACKUPS.md),
  [REQ-OBSERVABILITY](../requirements/REQ-OBSERVABILITY.md),
  [REQ-QUALITY-GATES](../requirements/REQ-QUALITY-GATES.md).

Sources: `roadmap/` and `tech-details/`.
