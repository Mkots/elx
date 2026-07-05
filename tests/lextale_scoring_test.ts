import { assertEquals } from "@std/assert";
import {
  computeScore,
  computeVocabularySize,
  type VocabularyScoringWord,
} from "../scoring/lextale.ts";

Deno.test("VER-VERIFICATION-SCORING: computeScore: all real words known → score equals count, truthfulness 100", () => {
  const answers = [
    { isReal: true, known: true },
    { isReal: true, known: true },
    { isReal: true, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 3);
  assertEquals(result.truthfulness, 100);
});

Deno.test("VER-VERIFICATION-SCORING: computeScore: mix of real and pseudo → score = real - pseudo", () => {
  const answers = [
    { isReal: true, known: true },
    { isReal: true, known: true },
    { isReal: false, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 1); // 2 real - 1 pseudo
  assertEquals(result.truthfulness, 67); // 2/3 * 100 rounded
});

Deno.test("VER-VERIFICATION-SCORING: computeScore: all pseudowords known → score negative, truthfulness 0", () => {
  const answers = [
    { isReal: false, known: true },
    { isReal: false, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, -2);
  assertEquals(result.truthfulness, 0);
});

Deno.test("VER-VERIFICATION-SCORING: computeScore: no words known → score 0, truthfulness 100", () => {
  const answers = [
    { isReal: true, known: false },
    { isReal: false, known: false },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 0);
  assertEquals(result.truthfulness, 100);
});

Deno.test("VER-VERIFICATION-SCORING: computeScore: empty answers → score 0, truthfulness 100", () => {
  const result = computeScore([]);
  assertEquals(result.score, 0);
  assertEquals(result.truthfulness, 100);
});

Deno.test("VER-VERIFICATION-SCORING: computeScore: only don't-know answers ignored in score", () => {
  const answers = [
    { isReal: true, known: false },
    { isReal: true, known: true },
    { isReal: false, known: false },
    { isReal: false, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 0); // 1 real - 1 pseudo
  assertEquals(result.truthfulness, 50);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: all correct real words, no pseudowords known → 10000", () => {
  const answers: VocabularyScoringWord[] = [
    // Real words in each band
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 2, known: true },
    { isReal: true, difficulty: 3, known: true },
    { isReal: true, difficulty: 4, known: true },
    { isReal: true, difficulty: 5, known: true },
    // Pseudowords not known
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },
  ];
  assertEquals(computeVocabularySize(answers), 10000);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: all correct real words, no pseudowords at all → 10000", () => {
  const answers: VocabularyScoringWord[] = [
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 2, known: true },
    { isReal: true, difficulty: 3, known: true },
    { isReal: true, difficulty: 4, known: true },
    { isReal: true, difficulty: 5, known: true },
  ];
  assertEquals(computeVocabularySize(answers), 10000);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: no correct real words, all pseudowords known → 0", () => {
  const answers: VocabularyScoringWord[] = [
    { isReal: true, difficulty: 1, known: false },
    { isReal: true, difficulty: 2, known: false },
    { isReal: true, difficulty: 3, known: false },
    { isReal: true, difficulty: 4, known: false },
    { isReal: true, difficulty: 5, known: false },
    { isReal: false, difficulty: 0, known: true },
    { isReal: false, difficulty: 0, known: true },
  ];
  assertEquals(computeVocabularySize(answers), 0);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: mixed cases with false alarms (hand calculated case 1)", () => {
  const answers: VocabularyScoringWord[] = [
    // 10 pseudowords, 3 known -> false alarm rate = 0.3
    { isReal: false, difficulty: 0, known: true },
    { isReal: false, difficulty: 0, known: true },
    { isReal: false, difficulty: 0, known: true },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },

    // Band 1: 4 real, 3 known -> hitRate = 0.75 -> correctedRate = 0.45 -> size = 900
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: false },

    // Band 2: 5 real, 1 known -> hitRate = 0.2 -> correctedRate = 0 -> size = 0
    { isReal: true, difficulty: 2, known: true },
    { isReal: true, difficulty: 2, known: false },
    { isReal: true, difficulty: 2, known: false },
    { isReal: true, difficulty: 2, known: false },
    { isReal: true, difficulty: 2, known: false },

    // Band 3: 2 real, 2 known -> hitRate = 1.0 -> correctedRate = 0.7 -> size = 1400
    { isReal: true, difficulty: 3, known: true },
    { isReal: true, difficulty: 3, known: true },

    // Band 4: 0 real -> hitRate = 0 -> correctedRate = 0 -> size = 0

    // Band 5: 5 real, 4 known -> hitRate = 0.8 -> correctedRate = 0.5 -> size = 1000
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: false },
  ];
  // Total expected size = 900 + 0 + 1400 + 0 + 1000 = 3300
  assertEquals(computeVocabularySize(answers), 3300);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: mixed cases with rounding (hand calculated case 2)", () => {
  const answers: VocabularyScoringWord[] = [
    // 3 pseudowords, 1 known -> false alarm rate = 1/3
    { isReal: false, difficulty: 0, known: true },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },

    // Band 1: 3 real, 2 known -> hitRate = 2/3 -> correctedRate = 1/3 -> size = 666.666...
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: false },
  ];
  // Total expected size = 2000 / 3 = 666.666... -> rounded to 667
  assertEquals(computeVocabularySize(answers), 667);
});
