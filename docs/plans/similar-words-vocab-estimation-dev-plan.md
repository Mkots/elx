# Development Plan: Similar Words on Stage 2 and Estimated Vocabulary Size

This plan outlines the changes required to display similar words (by Levenshtein
distance) in Stage 2 instead of the exact checked words, and to compute and
display an estimated vocabulary size on the results page.

## Original Request / Traceability

- **Request**: "надо сделать так чтобы на Stage 2 мы показывали не просто те же
  слова что отметили на Stage 1, а похожие или близкие по Расстояния Левенштейна
  (или подобная метрика). А потом, в результатах не просто количество правильно
  отмеченных слов, а аппроксимированный словарный запас."
- **Alignment Choices**:
  1. Similar word selection: Closest word in the entire pool by Levenshtein
     distance (either real or pseudo).
  2. Band sizes: 2,000 words per difficulty band (levels 1-5), totaling a
     maximum of 10,000 words.
  3. Presentation: Display the Estimated Vocabulary Size as a prominent primary
     metric in a new card alongside LexTALE score and Truthfulness.

---

## Technical Design Summary

### 1. Database Schema Changes (`db/schema.ts`)

- Update `VerificationSnapshotQuestion` in `db/schema.ts` to include:
  ```typescript
  export interface VerificationSnapshotQuestion extends BaseSnapshotQuestion {
    type: "verification";
    wordText: string;
    isReal: boolean;
    difficulty: number;
    similarWord?: string;
    similarWordIsReal?: boolean;
  }
  ```
- Update the `test_sessions` table to add a new column:
  ```typescript
  vocabularySize: integer("vocabulary_size"),
  ```

### 2. Similar Word Selection & Ticket Generation (`domain/ticket_generation.ts`)

- Import `editDistance` from `../pipeline/phonetic_distractors.ts`.
- Implement `findSimilarWord(word, pool, random)`:
  - Finds the word in `pool` with the minimum non-zero Levenshtein distance from
    the target word.
  - If multiple candidates exist, uses `random` to deterministically choose one.
- Update `buildQuestions` to calculate the similar word for each `verification`
  question and populate `similarWord`, `similarWordIsReal`, and `difficulty` in
  the snapshot question.

### 3. Stage 2 Routing / Word Mappings (`routes/stage2.ts`)

- In `loadStage2WordList`, map each verification question to its similar word if
  available:
  - `value = q.similarWord ?? q.wordText`
  - `isReal = q.similarWord !== undefined ? (q.similarWordIsReal ?? q.isReal) : q.isReal`
  - Include `difficulty = q.difficulty ?? 3` in the mapped `Stage2Word`
    structure.
- Ensure the routing passes the `difficulty` to the scoring/completion function.

### 4. Scoring and Vocabulary Estimation (`scoring/lextale.ts` and `session.ts`)

- In `scoring/lextale.ts`, implement `computeVocabularySize(answers)`:
  - Calculate `falseAlarmRate` on pseudowords: `knownPseudo / totalPseudo` (0 if
    no pseudowords).
  - For each difficulty level (1 to 5), calculate `hitRate`:
    `knownReal / totalReal`.
  - Calculate corrected knowledge rate per band:
    `max(0, hitRate - falseAlarmRate)`.
  - Estimated size = `sum(correctedRate * 2000)`.
- In `session.ts`, update `completeStage2Result` to calculate `vocabularySize`
  and write it to `test_sessions.vocabulary_size`.
- Update `loadStage2Result` and `saveStage2Result` to load and save
  `vocabularySize`.

### 5. UI Result Page (`ui/pages/ResultPage.tsx`)

- Display the estimated vocabulary size in a prominent card next to the LexTALE
  score and Truthfulness.
- Keep the `data-testid="score"` and `data-testid="truthfulness"` intact on
  their original elements.

---

## Work Items

### Item 1: Database Schema & Migration

Add `vocabularySize` to the `testSessions` table in `db/schema.ts` and run
Drizzle migrations.

- **Subagent Instruction**: Run this in a `self` subagent.
- **Targeted Verification**:
  - Run `deno task db:generate`
  - Run `deno task db:migrate`

### Item 2: LexTALE Scoring and Vocabulary Size Helper

Implement the `computeVocabularySize` function in `scoring/lextale.ts` and add
unit tests to verify correctness under various conditions (all correct, none
correct, false alarms, etc.).

- **Subagent Instruction**: Run this in a `self` subagent.
- **Targeted Verification**:
  - Run `deno test tests/lextale_scoring_test.ts`

### Item 3: Similar Word Computation in Ticket Generation

Modify `domain/ticket_generation.ts` to compute and store similar words
(`similarWord`, `similarWordIsReal`) and `difficulty` for each verification
question. Add unit tests for `findSimilarWord`.

- **Subagent Instruction**: Run this in a `self` subagent.
- **Targeted Verification**:
  - Run `deno test tests/ticket_generation_test.ts`

### Item 4: Session updates for Vocabulary Size

Update `session.ts` to compute the vocabulary size during Stage 2 completion and
save/load it from the database.

- **Subagent Instruction**: Run this in a `self` subagent.
- **Targeted Verification**:
  - Run `deno test tests/session_test.ts`

### Item 5: Stage 2 Routing Updates

Update `routes/stage2.ts` to map stage 2 verification cards to `similarWord` and
use the proper `isReal` target for scoring.

- **Subagent Instruction**: Run this in a `self` subagent.
- **Targeted Verification**:
  - Run `deno test tests/stage2_route_test.ts`

### Item 6: Result Page UI & Route Integration

Modify `ui/pages/ResultPage.tsx` to render the estimated vocabulary size card.
Ensure the routes pass this metric to the page.

- **Subagent Instruction**: Run this in a `self` subagent.
- **Targeted Verification**:
  - Run `deno test tests/result_route_test.ts`
  - Run `deno task lint`

### Item 7: Final Global Validation

Run the entire test suite and verify that all integration and e2e tests continue
to pass.

- **Subagent Instruction**: Run in the main chat context.
- **Targeted Verification**:
  - Run `deno task ci`
