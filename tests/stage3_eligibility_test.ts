import { assertEquals } from "@std/assert";
import {
  getEligibleSynonymQuestions,
  validateSynonymAnswer,
} from "../domain/stage3_eligibility.ts";
import type {
  SnapshotQuestion,
  SynonymSnapshotQuestion,
} from "../db/schema.ts";

Deno.test("VER-STAGE3-ELIGIBILITY: a verified synonym question for a known word is eligible", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "fruit",
      distractors: ["a", "b", "c"],
      verified: true,
    },
  ];

  const eligible = getEligibleSynonymQuestions(questions, { "0": true });

  assertEquals(eligible.length, 1);
  assertEquals(eligible[0].questionIndex, 1);
});

Deno.test("VER-STAGE3-ELIGIBILITY: unverified synonym questions are excluded", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "fruit",
      distractors: ["a", "b", "c"],
      verified: false,
    },
  ];

  assertEquals(getEligibleSynonymQuestions(questions, { "0": true }), []);
});

Deno.test("VER-STAGE3-ELIGIBILITY: synonym questions for words not marked known are excluded", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "fruit",
      distractors: ["a", "b", "c"],
      verified: true,
    },
  ];

  assertEquals(getEligibleSynonymQuestions(questions, { "0": false }), []);
  assertEquals(getEligibleSynonymQuestions(questions, {}), []);
});

Deno.test("VER-STAGE3-ELIGIBILITY: a similarWord substitution makes the original word ineligible even if marked known", () => {
  const questions: SnapshotQuestion[] = [
    {
      type: "verification",
      wordText: "apple",
      isReal: true,
      difficulty: 1,
      similarWord: "appla",
      similarWordIsReal: false,
    },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "fruit",
      distractors: ["a", "b", "c"],
      verified: true,
    },
  ];

  assertEquals(getEligibleSynonymQuestions(questions, { "0": true }), []);
});

Deno.test("VER-STAGE3-ELIGIBILITY: a known word without a similarWord substitution remains eligible", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    { type: "verification", wordText: "chair", isReal: true, difficulty: 2 },
    {
      type: "synonym",
      promptText: "chair",
      correctText: "seat",
      distractors: ["a", "b", "c"],
      verified: true,
    },
  ];

  const eligible = getEligibleSynonymQuestions(questions, {
    "0": true,
    "1": true,
  });

  assertEquals(eligible.length, 1);
  assertEquals(eligible[0].questionIndex, 2);
});

Deno.test("VER-STAGE3-ANSWER: answer equal to correctText is valid and correct", () => {
  const question: SynonymSnapshotQuestion = {
    type: "synonym",
    promptText: "apple",
    correctText: "fruit",
    distractors: ["a", "b", "c"],
    verified: true,
  };

  assertEquals(validateSynonymAnswer(question, "fruit"), {
    valid: true,
    isCorrect: true,
  });
});

Deno.test("VER-STAGE3-ANSWER: answer equal to a distractor is valid but incorrect", () => {
  const question: SynonymSnapshotQuestion = {
    type: "synonym",
    promptText: "apple",
    correctText: "fruit",
    distractors: ["a", "b", "c"],
    verified: true,
  };

  assertEquals(validateSynonymAnswer(question, "a"), {
    valid: true,
    isCorrect: false,
  });
});

Deno.test("VER-STAGE3-ANSWER: arbitrary answer text is rejected as invalid", () => {
  const question: SynonymSnapshotQuestion = {
    type: "synonym",
    promptText: "apple",
    correctText: "fruit",
    distractors: ["a", "b", "c"],
    verified: true,
  };

  assertEquals(validateSynonymAnswer(question, "nonsense"), { valid: false });
});
