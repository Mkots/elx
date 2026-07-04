---
id: "REQ-SPELLING"
type: requirement
name: "Contextual spelling challenge"
specification: >
  The optional challenge SHALL present a context sentence with a gap requiring a specific word
  and SHALL offer 4 spellings that are often phonetically or graphically similar, with exactly
  one correct for the context, and SHALL give feedback on the answer.
status: deferred
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-SPELLING-SEEDS"
---

# Contextual Spelling Challenge

Optional Stage 4. Source:
[`roadmap/04-spelling.md`](../../roadmap/04-spelling.md).

## Requirements

This requirement is **deferred** (planned for future phases). The user-facing
contextual spelling challenge stage is not yet implemented. Only the offline
database seeding and authoring support are active; see
[REQ-SPELLING-SEEDS](REQ-SPELLING-SEEDS.md).
