---
id: "REQ-SPELLING-SEEDS"
type: requirement
name: "Contextual spelling challenge (seeding)"
specification: >
  The database seeder SHALL prepare sentence templates with exactly one gap and a set of wrong
  options for contextual spelling challenge questions offline.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
---

# Contextual Spelling Challenge (Seeding)

Offline authoring of Stage 4 questions. Source:
[`roadmap/04-spelling.md`](../../roadmap/04-spelling.md).

## Requirements

1. **Context sentence:** provide a gap requiring a specific word, such as "I
   have a fluffy ___ with white fur and long tail."
2. **Spelling options:** prepare four often phonetically or visually similar
   options, such as `Cut`, `Caught`, `Cat`, and `Kit`, with exactly one correct
   answer for the context.

Prepare sentence templates and distractors offline through
[REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and `seed:spelling`.

## Acceptance Criteria

- Every sentence has one unambiguous correct option.
