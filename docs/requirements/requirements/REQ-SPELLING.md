---
id: "REQ-SPELLING"
type: requirement
name: "Contextual spelling challenge"
specification: >
  The optional challenge SHALL present a context sentence with a gap requiring a specific word
  and SHALL offer 4 spellings that are often phonetically or graphically similar, with exactly
  one correct for the context, and SHALL give feedback on the answer.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
  - "REQ-VERIFICATION-SCORING"
---

# Contextual Spelling Challenge

Optional Stage 4. Source:
[`roadmap/04-spelling.md`](../../roadmap/04-spelling.md).

## Requirements

1. **Context sentence:** provide a gap requiring a specific word, such as "I
   have a fluffy ___ with white fur and long tail."
2. **Spelling options:** provide four often phonetically or visually similar
   options, such as `Cut`, `Caught`, `Cat`, and `Kit`, with exactly one correct
   answer for the context.
3. **Feedback:** check immediately or accumulate the result until the stage
   ends.

Prepare sentence templates and distractors offline through [[REQ-QUESTION-BANK]]
and `seed:spelling`.

## Acceptance Criteria

- Every sentence has one unambiguous correct option.
