---
id: "REQ-SEMANTIC-USAGE"
type: requirement
name: "Semantic usage challenge (DEFERRED)"
specification: >
  The optional challenge SHOULD present a context where several words fit grammatically but only
  one is semantically most appropriate, with options chosen by meaning rather than sound.
  DEFERRED until a reliable way to auto-generate unambiguous semantic distractors exists.
status: deferred
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
---

# Semantic Usage Challenge (DEFERRED)

> **Status: DEFERRED.** There is no reliable way to generate unambiguous
> semantic distractors automatically. Work is frozen until a viable approach is
> found. ML tools such as word embeddings, Transformers.js, and `pgvector` will
> be reconsidered only if work resumes. Source:
> [`roadmap/06-semantic-usage.md`](../../roadmap/06-semantic-usage.md).

## Idea

Provide a sentence that several words could fill grammatically but only one fits
best semantically. Select options by meaning rather than sound, such as
`Whiskers`, `Vibrissae`, `Mustache`, and `Eyes`.

## Current Blockers

- No deterministic way to generate context and closely related synonym pairs.
- No validation that each sentence has one unambiguous correct answer.

> Excluded from mandatory coverage because `status: deferred`; see
> [[REQ-QUALITY-GATES]].
