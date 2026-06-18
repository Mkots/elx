---
id: "REQ-SYNONYMS-ANTONYMS"
type: requirement
name: "Synonyms and antonyms challenge"
specification: >
  The optional challenge SHALL show a word marked as known and SHALL ask the user to pick its
  synonym or antonym from 4 options with exactly one correct answer, drawing source words from
  the user's "known" set.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
  - "REQ-VERIFICATION-SCORING"
  - "REQ-SSR-STAGE-FLOW"
---

# Synonyms and Antonyms Challenge

Optional Stage 3. Source:
[`roadmap/03-synonyms-antonyms.md`](../../roadmap/03-synonyms-antonyms.md).

## Requirements

1. **Word selection:** use only words marked as known in session state.
2. **Question format:** show a word and ask the user to select its synonym or
   antonym.
3. **Answer options:** provide four options with exactly one correct answer.
   Prepare the bank and distractors offline through
   [REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and `seed:synonyms`.
4. **Optional launch:** offer the stage after the core LexTALE test.

## Acceptance Criteria

- Runtime performs only `SELECT` queries, and questions are deterministic.
