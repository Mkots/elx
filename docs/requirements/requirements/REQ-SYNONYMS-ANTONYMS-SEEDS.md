---
id: "REQ-SYNONYMS-ANTONYMS-SEEDS"
type: requirement
name: "Synonyms and antonyms challenge (seeding)"
specification: >
  The database seeder SHALL compile and store synonyms and antonyms for the challenge questions offline.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
---

# Synonyms and Antonyms Challenge (Seeding)

Offline authoring of Stage 3 questions. Source:
[`roadmap/03-synonyms-antonyms.md`](../../roadmap/03-synonyms-antonyms.md).

## Requirements

Prepare the synonyms, antonyms and distractors offline through
[REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and `seed:synonyms`.
