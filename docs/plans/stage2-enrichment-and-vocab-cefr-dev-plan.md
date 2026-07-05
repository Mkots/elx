# Stage 2 Pseudoword Mixing and Progressive CEFR Vocabulary Estimation — Development Plan

Source:
[USER_REQUEST](file:///Users/vitalijkomarov/dev/tmp/elx/docs/plans/stage2-enrichment-and-vocab-cefr-dev-plan.md).
Series tag: `[Stage2-Vocab-CEFR]`.

## Goal

This plan outlines the changes required to mix pseudoword distractors into Stage
2 for users who only select real words in Stage 1, and to implement a
progressive vocabulary size model with an inflated CEFR level badge on the
Results page. We know it works when all unit, route, and integration tests pass,
Stage 2 contains pseudowords, and the results page renders a styled CEFR badge
alongside the calculated vocabulary size.

## Decisions

1. **Practical Ceiling Correction**: The default ticket configuration (selecting
   30 real words) previously resulted in a practical maximum vocabulary size of
   around 6,000 words. Replacing the linear 2,000-word bands with progressive
   sizes (Difficulty 1: 1,500, Difficulty 2: 2,500, Difficulty 3: 4,000,
   Difficulty 4: 6,000, Difficulty 5: 8,000) raises the theoretical maximum
   vocabulary size to 22,000 words, allowing high-performing users to reach the
   C2 threshold (>= 12,000 words).
2. **Pseudoword Distractors (50% Chance)**: During ticket generation, for each
   real word selected, there is a 50% probability to search for a similar word
   among the _pseudowords_ in the pool. If no similar pseudoword is found, we
   fall back to the general pool.
3. **Inflated CEFR Levels**: Define a mapping from vocabulary size to CEFR:
   - `< 1,500` -> A1
   - `1,500 - 2,999` -> A2
   - `3,000 - 5,499` -> B1
   - `5,500 - 8,499` -> B2
   - `8,500 - 11,999` -> C1
   - `>= 12,000` -> C2
4. **Result Presentation**: Display the CEFR level badge next to/below the
   vocabulary size in the `result-vocab-card` on the results page.

---

## Work items

### 1. Implement pseudoword distractor selection in ticket generation

- **Depends on**: —
- **Context**:
  [buildQuestions](file:///Users/vitalijkomarov/dev/tmp/elx/domain/ticket_generation.ts#L135-L253)
  in `domain/ticket_generation.ts`.
- **Deliverable**:
  1. Modify the loop mapping selected words to verification snapshot questions.
  2. If the word `w` is real (`w.isReal === true`) and `random() < 0.5`, filter
     the `wordPool` to only contain pseudowords (`!wp.isReal`) and use
     `findSimilarWord` on that filtered pool.
  3. Fall back to `findSimilarWord` on the entire `wordPool` if not triggered or
     if no similar pseudoword was found.
- **Acceptance criteria**:
  - `deno test tests/ticket_generation_test.ts` passes.
  - Add a unit test verifying that similar words for real words can be
    pseudowords.

### 2. Implement progressive vocabulary size formula and CEFR mapping

- **Depends on**: —
- **Context**: `scoring/lextale.ts` where
  [computeVocabularySize](file:///Users/vitalijkomarov/dev/tmp/elx/scoring/lextale.ts#L30-L49)
  is defined.
- **Deliverable**:
  1. Add a `BAND_SIZES` mapping: `1: 1500, 2: 2500, 3: 4000, 4: 6000, 5: 8000`.
  2. Update `computeVocabularySize` to calculate `totalSize` using
     `BAND_SIZES[band]`.
  3. Implement `getCEFRLevel(vocabularySize: number): string` mapping to A1-C2.
- **Acceptance criteria**:
  - `computeVocabularySize` calculates correct progressive sizes.
  - `getCEFRLevel` maps to A1-C2 correctly.

### 3. Display CEFR level on Result Page

- **Depends on**: 2
- **Context**:
  [ResultPage](file:///Users/vitalijkomarov/dev/tmp/elx/ui/pages/ResultPage.tsx#L17-L71),
  `routes/result.ts`, and
  [app.css](file:///Users/vitalijkomarov/dev/tmp/elx/static/app.css#L256-L300).
- **Deliverable**:
  1. Update `routes/result.ts` to compute or pass the CEFR level to the page.
  2. Render the CEFR level badge in `ui/pages/ResultPage.tsx` with
     `data-testid="cefr-level"`.
  3. Add styling for `.result-cefr-badge` and `.cefr-val` in `static/app.css`.
- **Acceptance criteria**:
  - Results page displays the CEFR level badge.
  - `deno test tests/result_route_test.ts` is updated to check for
    `data-testid="cefr-level"` and passes.

### 4. Update unit tests for scoring and sessions

- **Depends on**: 2
- **Context**: `tests/lextale_scoring_test.ts` and `tests/session_test.ts`.
- **Deliverable**:
  1. Update existing assertions in `tests/lextale_scoring_test.ts` to match the
     new progressive weights (e.g., maximum score is 22,000, mixed cases have
     recalculated expected values).
  2. Update `tests/session_test.ts` vocabulary size assertion to expect `2750`
     instead of `2000`.
- **Acceptance criteria**:
  - All unit tests under `tests/` pass.

### 5. Final global validation

- **Depends on**: 1, 2, 3, 4
- **Context**: Entire repository.
- **Deliverable**: Run global tests and lint check.
- **Acceptance criteria**:
  - `deno task ci` is green.

---

## Out of scope

- Adjusting default config counts in database configuration tables, as D1-D5
  target counts are already sufficient to distribute words across all bands.

## Open questions

- None.
