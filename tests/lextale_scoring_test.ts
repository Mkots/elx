import { assertEquals } from "@std/assert";
import {
  computeScore,
  computeVocabularySize,
  getCEFRLevel,
  type VocabularyScoringWord,
} from "../scoring/lextale.ts";

// Tests updated for progressive CEFR band scoring

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

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: all correct real words, no pseudowords known → 22000", () => {
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
  assertEquals(computeVocabularySize(answers), 22000);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: all correct real words, no pseudowords at all → 22000", () => {
  const answers: VocabularyScoringWord[] = [
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 2, known: true },
    { isReal: true, difficulty: 3, known: true },
    { isReal: true, difficulty: 4, known: true },
    { isReal: true, difficulty: 5, known: true },
  ];
  assertEquals(computeVocabularySize(answers), 22000);
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

    // Band 1: 4 real, 3 known -> hitRate = 0.75 -> correctedRate = 0.45 -> size = 0.45 * 1500 = 675
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

    // Band 3: 2 real, 2 known -> hitRate = 1.0 -> correctedRate = 0.7 -> size = 0.7 * 4000 = 2800
    { isReal: true, difficulty: 3, known: true },
    { isReal: true, difficulty: 3, known: true },

    // Band 4: 0 real -> hitRate = 0 -> correctedRate = 0 -> size = 0

    // Band 5: 5 real, 4 known -> hitRate = 0.8 -> correctedRate = 0.5 -> size = 0.5 * 8000 = 4000
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: true },
    { isReal: true, difficulty: 5, known: false },
  ];
  // Total expected size = 675 + 0 + 2800 + 0 + 4000 = 7475
  assertEquals(computeVocabularySize(answers), 7475);
});

Deno.test("VER-VERIFICATION-SCORING: computeVocabularySize: mixed cases with rounding (hand calculated case 2)", () => {
  const answers: VocabularyScoringWord[] = [
    // 3 pseudowords, 1 known -> false alarm rate = 1/3
    { isReal: false, difficulty: 0, known: true },
    { isReal: false, difficulty: 0, known: false },
    { isReal: false, difficulty: 0, known: false },

    // Band 1: 3 real, 2 known -> hitRate = 2/3 -> correctedRate = 1/3 -> size = (1/3) * 1500 = 500
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: true },
    { isReal: true, difficulty: 1, known: false },
  ];
  // Total expected size = 500
  assertEquals(computeVocabularySize(answers), 500);
});

Deno.test("VER-VERIFICATION-SCORING: getCEFRLevel: maps vocabulary size to correct CEFR bands", () => {
  // A1: < 1500
  assertEquals(getCEFRLevel(0), "A1");
  assertEquals(getCEFRLevel(1499), "A1");

  // A2: 1500 to 2999
  assertEquals(getCEFRLevel(1500), "A2");
  assertEquals(getCEFRLevel(2999), "A2");

  // B1: 3000 to 5499
  assertEquals(getCEFRLevel(3000), "B1");
  assertEquals(getCEFRLevel(5499), "B1");

  // B2: 5500 to 8499
  assertEquals(getCEFRLevel(5500), "B2");
  assertEquals(getCEFRLevel(8499), "B2");

  // C1: 8500 to 11999
  assertEquals(getCEFRLevel(8500), "C1");
  assertEquals(getCEFRLevel(11999), "C1");

  // C2: >= 12000
  assertEquals(getCEFRLevel(12000), "C2");
  assertEquals(getCEFRLevel(25000), "C2");
});
