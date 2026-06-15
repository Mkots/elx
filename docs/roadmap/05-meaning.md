# Stage 5: Meaning Challenge (Definitions)

## Description

Test the user's understanding of word definitions.

## Requirements

1. **Description:** provide a short English definition or description of a word.
2. **Word selection:**
   - Provide four word options.
   - Ask the user to choose the word that best matches the description.
3. **Difficulty levels:** select definitions based on the user's vocabulary
   level determined in Stage 1.

## Technical Details

- Store a static definition bank in PostgreSQL.
- **Generate the question bank offline** (see [Stage 0](./00-data-seeding.md),
  script `seed:meanings`): retrieve definitions from a dictionary API during
  seeding, not at runtime. Runtime only performs `SELECT` queries.
