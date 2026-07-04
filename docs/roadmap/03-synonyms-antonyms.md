# Stage 3: Synonyms and Antonyms Challenge

## Description

An optional challenge stage that verifies a deeper understanding of words
(currently authoring-only, user-facing is planned).

## Requirements

1. **Word selection:** use only words the user marked as known in earlier
   stages.
2. **Question format:**
   - Show a word.
   - Ask the user to select its synonym or antonym.
3. **Answer options:**
   - Provide four options with exactly one correct answer.
4. **Integration:** let the user start this stage optionally after completing
   the core LexTALE test.

## Technical Details

- Maintain a database of synonyms and antonyms.
- Generate distractors.
- **Generate the question bank offline** (see [Stage 0](./00-data-seeding.md),
  script `seed:synonyms`). Runtime only performs `SELECT` queries.
- Note: The user-facing synonyms/antonyms challenge stage is planned for a
  future phase and not yet implemented.
