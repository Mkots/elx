import { assertEquals } from "@std/assert";
import { computeScore } from "../scoring/lextale.ts";

Deno.test("computeScore: all real words known → score equals count, truthfulness 100", () => {
  const answers = [
    { isReal: true, known: true },
    { isReal: true, known: true },
    { isReal: true, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 3);
  assertEquals(result.truthfulness, 100);
});

Deno.test("computeScore: mix of real and pseudo → score = real - pseudo", () => {
  const answers = [
    { isReal: true, known: true },
    { isReal: true, known: true },
    { isReal: false, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 1); // 2 real - 1 pseudo
  assertEquals(result.truthfulness, 67); // 2/3 * 100 rounded
});

Deno.test("computeScore: all pseudowords known → score negative, truthfulness 0", () => {
  const answers = [
    { isReal: false, known: true },
    { isReal: false, known: true },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, -2);
  assertEquals(result.truthfulness, 0);
});

Deno.test("computeScore: no words known → score 0, truthfulness 100", () => {
  const answers = [
    { isReal: true, known: false },
    { isReal: false, known: false },
  ];
  const result = computeScore(answers);
  assertEquals(result.score, 0);
  assertEquals(result.truthfulness, 100);
});

Deno.test("computeScore: empty answers → score 0, truthfulness 100", () => {
  const result = computeScore([]);
  assertEquals(result.score, 0);
  assertEquals(result.truthfulness, 100);
});

Deno.test("computeScore: only don't-know answers ignored in score", () => {
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
