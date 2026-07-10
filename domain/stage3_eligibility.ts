import type {
  SnapshotQuestion,
  SynonymSnapshotQuestion,
} from "../db/schema.ts";

export interface EligibleSynonymQuestion {
  questionIndex: number;
  question: SynonymSnapshotQuestion;
}

/**
 * A word only counts as "known" for Stage 3 if the participant marked its
 * own verification question as known in Stage 2 *and* Stage 2 actually
 * displayed that exact word text. When a verification question carries a
 * `similarWord` substitute, Stage 2 showed the substitute instead of
 * `wordText`, so a "know" answer there says nothing about whether the
 * participant knows the original word.
 */
function collectKnownWordTexts(
  questions: SnapshotQuestion[],
  stage2KnownAnswers: Record<string, boolean>,
): Set<string> {
  const knownWords = new Set<string>();

  questions.forEach((question, index) => {
    if (question.type !== "verification") return;
    if (question.similarWord !== undefined) return;
    if (stage2KnownAnswers[String(index)] !== true) return;
    knownWords.add(question.wordText);
  });

  return knownWords;
}

export function getEligibleSynonymQuestions(
  questions: SnapshotQuestion[],
  stage2KnownAnswers: Record<string, boolean>,
): EligibleSynonymQuestion[] {
  const knownWords = collectKnownWordTexts(questions, stage2KnownAnswers);

  const eligible: EligibleSynonymQuestion[] = [];
  questions.forEach((question, index) => {
    if (question.type !== "synonym") return;
    if (!question.verified) return;
    if (!knownWords.has(question.promptText)) return;
    eligible.push({ questionIndex: index, question });
  });

  return eligible;
}

export type Stage3AnswerValidation =
  | { valid: true; isCorrect: boolean }
  | { valid: false };

export function validateSynonymAnswer(
  question: SynonymSnapshotQuestion,
  submittedAnswer: string,
): Stage3AnswerValidation {
  const options = [question.correctText, ...question.distractors];
  if (!options.includes(submittedAnswer)) {
    return { valid: false };
  }
  return { valid: true, isCorrect: submittedAnswer === question.correctText };
}
