# Stage 4: Contextual Spelling Challenge

## Description

Test spelling skills and the ability to distinguish similar words in context.

## Requirements

1. **Context sentence:** provide a sentence with a gap that requires a specific
   word.
   - Example: "I have a fluffy ___ with white fur and long tail."
2. **Spelling options:**
   - Provide four spellings that are often phonetically or visually similar.
   - Example: `Cut`, `Caught`, `Cat`, `Kit`.
3. **Feedback:** check the answer immediately or accumulate the result.

## Technical Details

- Store sentence templates with metadata for the correct word and similar
  distractors.
- **Generate the question bank offline** (see [Stage 0](./00-data-seeding.md),
  script `seed:spelling`). Runtime only performs `SELECT` queries.
