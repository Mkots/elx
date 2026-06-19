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
