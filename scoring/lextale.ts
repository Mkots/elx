export interface WordAnswer {
  isReal: boolean;
  known: boolean;
}

export interface LexTALEResult {
  score: number;
  truthfulness: number;
}

export function computeScore(answers: WordAnswer[]): LexTALEResult {
  const knownReal = answers.filter((a) => a.known && a.isReal).length;
  const knownPseudo = answers.filter((a) => a.known && !a.isReal).length;
  const totalKnown = knownReal + knownPseudo;

  const score = knownReal - knownPseudo;
  const truthfulness = totalKnown > 0
    ? Math.round((knownReal / totalKnown) * 100)
    : 100;

  return { score, truthfulness };
}

export interface VocabularyScoringWord {
  isReal: boolean;
  difficulty: number;
  known: boolean;
}

export function computeVocabularySize(
  answers: VocabularyScoringWord[],
): number {
  const pseudoAnswers = answers.filter((a) => !a.isReal);
  const totalPseudo = pseudoAnswers.length;
  const knownPseudo = pseudoAnswers.filter((a) => a.known).length;
  const falseAlarmRate = totalPseudo > 0 ? knownPseudo / totalPseudo : 0;

  let totalSize = 0;
  for (let band = 1; band <= 5; band++) {
    const realInBand = answers.filter((a) => a.isReal && a.difficulty === band);
    const totalRealInBand = realInBand.length;
    const knownRealInBand = realInBand.filter((a) => a.known).length;
    const hitRate = totalRealInBand > 0 ? knownRealInBand / totalRealInBand : 0;
    const correctedRate = Math.max(0, hitRate - falseAlarmRate);
    totalSize += correctedRate * 2000;
  }

  return Math.round(totalSize);
}
