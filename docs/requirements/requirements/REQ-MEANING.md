---
id: "REQ-MEANING"
type: requirement
name: "Meaning challenge (definitions)"
specification: >
  The optional challenge SHALL show a short English definition and SHALL ask the user to pick
  the best-matching word from 4 options (exactly one correct), with definitions chosen to match
  the vocabulary level detected in the core test.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
  - "REQ-VERIFICATION-SCORING"
---

# Meaning Challenge (Definitions)

Optional Stage 5. Source:
[`roadmap/05-meaning.md`](../../roadmap/05-meaning.md).

## Requirements

1. **Definition prompt:** show a short English definition. Retrieve definitions
   from a dictionary API during `seed:meanings` in
   [REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and only read them at runtime.
2. **Word selection:** provide four words with exactly one correct match.
3. **Difficulty adaptation:** select definitions for the level detected in the
   core Stages 1-2.

## Acceptance Criteria

- Definition difficulty is consistent with the core test result.
