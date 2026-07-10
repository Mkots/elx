# Stage 3: Synonym Challenge

## Description

An optional challenge stage, launched from `/result`, that verifies a deeper
understanding of words the participant already marked as known in Stage 2. It
does not affect the core LexTALE score, truthfulness, vocabulary size, or CEFR
result computed at Stage 2.

## Requirements

1. **Word selection:** eligible questions are limited to verified
   `type: "synonym"` questions in the participant's ticket snapshot for words
   marked "Know" in Stage 2. If Stage 2 substituted a `similarWord` for the
   original verification word, the original word is not treated as known unless
   the participant actually saw that exact text.
2. **Question format:**
   - Show a word (`promptText`).
   - Ask the user to select its synonym.
3. **Answer options:**
   - Four options: the snapshot's `correctText` plus its `distractors`, with
     exactly one correct answer.
4. **Integration:** the user starts this stage optionally from `/result` after
   completing the core LexTALE test (Stage 2); it is never an automatic
   redirect.

## Technical Details

- No separate `synonyms` table and no `seed:synonyms` script. Synonym/antonym
  data lives as columns on `words` (`synonyms`, `antonyms`, `definition`; see
  [data-model.md](../data-model.md)), and challenge questions are generated
  offline into each ticket's immutable `questions` JSONB snapshot during ticket
  authoring (base → complete → published; see
  [business-process.md](../business-process.md)). Runtime Stage 3 only reads the
  participant's published ticket snapshot — it never queries live `words` rows.
- Answers are persisted in `test_answers` with `stage = 3`, `question_index`
  equal to the snapshot index, `question_type = "synonym"`, `answer` equal to
  the submitted option text, and `is_correct` computed server-side against the
  snapshot's `correctText`.
- Routes: `GET/POST /stage/3` (see [AGENTS.md](../../AGENTS.md) file map and
  `routes/stage3.ts`).

## Out of scope / future work

- Antonym support: `words.antonyms` already exists, but ticket-snapshot typing,
  generation, admin curation/configuration, and Stage 3 rendering for antonym
  questions are a later ticket-generation/admin work item.
