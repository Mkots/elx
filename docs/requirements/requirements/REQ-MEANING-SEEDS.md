---
id: "REQ-MEANING-SEEDS"
type: requirement
name: "Meaning challenge (seeding)"
specification: >
  The database seeder SHALL retrieve and store dictionary definitions for challenge questions offline.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
---

# Meaning Challenge (Seeding)

Offline authoring of Stage 5 questions. Source:
[`roadmap/05-meaning.md`](../../roadmap/05-meaning.md).

## Requirements

Retrieve definitions from a dictionary API during `seed:meanings` in
[REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and store them offline.
