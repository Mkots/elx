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

- Core LexTALE flow: [[REQ-WORD-SELECTION]] to [[REQ-VERIFICATION-SCORING]].
- Optional challenges: [[REQ-SYNONYMS-ANTONYMS]], [[REQ-SPELLING]],
  [[REQ-MEANING]], and deferred [[REQ-SEMANTIC-USAGE]].
- Platform blocks: [[REQ-SSR-STAGE-FLOW]], [[REQ-SESSION-STATE]],
  [[REQ-DATA-PERSISTENCE]], [[REQ-QUESTION-BANK]].
- Operations and quality: [[REQ-DEPLOYMENT]], [[REQ-BACKUPS]],
  [[REQ-OBSERVABILITY]], [[REQ-QUALITY-GATES]].

Sources: `roadmap/` and `tech-details/`.
