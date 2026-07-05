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

const BAND_SIZES: Record<number, number> = {
  1: 1500,
  2: 2500,
  3: 4000,
  4: 6000,
  5: 8000,
};

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
    const bandSize = BAND_SIZES[band] || 0;
    totalSize += correctedRate * bandSize;
  }

  return Math.round(totalSize);
}

export function getCEFRLevel(vocabularySize: number): string {
  if (vocabularySize < 1500) return "A1";
  if (vocabularySize < 3000) return "A2";
  if (vocabularySize < 5500) return "B1";
  if (vocabularySize < 8500) return "B2";
  if (vocabularySize < 12000) return "C1";
  return "C2";
}
