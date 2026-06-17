# Roadmap

Development milestones for the ELX vocabulary test, organized as sequential
stages. Each stage builds on the previous one.

## Overview

| Stage                           | Name                        | Status      |
| ------------------------------- | --------------------------- | ----------- |
| [0](00-data-seeding.md)         | Offline Database Seeding    | Implemented |
| [1](01-lextale-core.md)         | Core LexTALE Word Selection | Implemented |
| [2](02-scoring-verification.md) | Verification and Scoring    | Implemented |
| [3](03-synonyms-antonyms.md)    | Synonyms and Antonyms       | Implemented |
| [4](04-spelling.md)             | Contextual Spelling         | Implemented |
| [5](05-meaning.md)              | Meaning (Definitions)       | Implemented |
| [6](06-semantic-usage.md)       | Semantic Usage              | Deferred    |

## Stage Dependencies

```
Stage 0 (Data Seeding)
  └── Stage 1 (LexTALE Core)
        └── Stage 2 (Scoring)
              ├── Stage 3 (Synonyms & Antonyms)
              ├── Stage 4 (Spelling)
              └── Stage 5 (Meaning)
                    └── Stage 6 (Semantic Usage) [deferred]
```

## Core vs Optional

- **Stages 1-2** form the core LexTALE test — all users complete these.
- **Stages 3-5** are optional challenge stages users can attempt after the core
  test.
- **Stage 6** is frozen pending research into automatic semantic distractor
  generation.
