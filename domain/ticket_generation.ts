import type { SnapshotQuestion } from "../db/schema.ts";
import { editDistance } from "../pipeline/phonetic_distractors.ts";

export interface TicketGenerationConfig {
  difficulty1Count: number;
  difficulty2Count: number;
  difficulty3Count: number;
  difficulty4Count: number;
  difficulty5Count: number;
  realCount: number;
  pseudoCount: number;
  synonymsCount: number;
  antonymsCount: number;
  spellingCount: number;
  definitionCount: number;
}

export interface WordPoolEntry {
  value: string;
  isReal: boolean;
  difficulty: number;
  synonyms: string[];
  antonyms: string[];
  definition: string | null;
}

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

function difficultyTarget(
  config: TicketGenerationConfig,
  difficulty: number,
): number {
  return config[
    `difficulty${difficulty}Count` as keyof TicketGenerationConfig
  ];
}

function shuffle<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function richnessScore(word: WordPoolEntry): number {
  return (word.synonyms.length > 0 ? 1 : 0) +
    (word.antonyms.length > 0 ? 1 : 0) +
    (word.definition && word.definition.trim() !== "" ? 1 : 0);
}

/**
 * Picks `count` words, favoring ones with synonyms/antonyms/definitions so
 * the aggregate selection across all difficulties reliably has enough
 * candidates for the synonym/antonym/definition challenge questions. Ties
 * are broken randomly.
 */
function selectPreferringRichWords(
  pool: WordPoolEntry[],
  count: number,
  random: () => number,
): WordPoolEntry[] {
  return shuffle(pool, random)
    .map((word) => ({ word, score: richnessScore(word) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.word);
}

/** Heuristic misspelled word generator for spelling distractors. */
export function generateSpellingCandidates(word: string): string[] {
  const candidates = new Set<string>();
  const lower = word.toLowerCase();

  if (lower.length > 3) {
    for (let i = 0; i < lower.length - 1; i++) {
      const arr = lower.split("");
      const temp = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = temp;
      candidates.add(arr.join(""));
    }
    for (let i = 0; i < lower.length; i++) {
      candidates.add(lower.slice(0, i + 1) + lower[i] + lower.slice(i + 1));
    }
    for (let i = 0; i < lower.length; i++) {
      candidates.add(lower.slice(0, i) + lower.slice(i + 1));
    }
  } else {
    candidates.add(lower + "e");
    candidates.add(lower + "s");
  }

  candidates.delete(lower);
  return Array.from(candidates).slice(0, 5);
}

/**
 * Finds the word in pool with the lowest Levenshtein distance to word, excluding word itself.
 * If multiple words have the same minimum distance, one is chosen deterministically using random.
 */
export function findSimilarWord(
  word: WordPoolEntry,
  pool: WordPoolEntry[],
  random: () => number,
): WordPoolEntry | null {
  let minDistance = Infinity;
  let candidates: WordPoolEntry[] = [];

  for (const cand of pool) {
    if (cand.value === word.value) {
      continue;
    }
    const dist = editDistance(word.value, cand.value);
    if (dist < minDistance) {
      minDistance = dist;
      candidates = [cand];
    } else if (dist === minDistance) {
      candidates.push(cand);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const idx = Math.floor(random() * candidates.length);
  return candidates[idx];
}

/**
 * Greedily selects words from an in-memory pool and builds the full set of
 * ticket questions. Throws a descriptive error naming the difficulty or
 * question type that couldn't be satisfied instead of retrying.
 */
export function buildQuestions(
  config: TicketGenerationConfig,
  wordPool: WordPoolEntry[],
  random: () => number,
): SnapshotQuestion[] {
  let remainingReal = config.realCount;
  let remainingPseudo = config.pseudoCount;
  const selectedReal: WordPoolEntry[] = [];
  const selectedPseudo: WordPoolEntry[] = [];

  for (const difficulty of DIFFICULTIES) {
    const target = difficultyTarget(config, difficulty);
    const poolReal = wordPool.filter((w) =>
      w.isReal && w.difficulty === difficulty
    );
    const poolPseudo = wordPool.filter((w) =>
      !w.isReal && w.difficulty === difficulty
    );

    // Pseudo words are the scarcer resource (often absent at some
    // difficulties), so satisfy the pseudo target first and let the more
    // abundant real pool fill whatever's left.
    const takePseudo = Math.min(remainingPseudo, poolPseudo.length, target);
    const takeReal = Math.min(
      remainingReal,
      poolReal.length,
      target - takePseudo,
    );

    if (takeReal + takePseudo < target) {
      throw new Error(
        `Not enough words at difficulty ${difficulty}: need ${target}, but ` +
          `only ${poolReal.length} real and ${poolPseudo.length} pseudo ` +
          `words are available. Seed more words or lower the config counts.`,
      );
    }

    selectedReal.push(
      ...selectPreferringRichWords(poolReal, takeReal, random),
    );
    selectedPseudo.push(...shuffle(poolPseudo, random).slice(0, takePseudo));

    remainingReal -= takeReal;
    remainingPseudo -= takePseudo;
  }

  if (remainingReal > 0 || remainingPseudo > 0) {
    throw new Error(
      `Could not select enough words overall: ${remainingReal} real and ` +
        `${remainingPseudo} pseudo words short of the configured counts.`,
    );
  }

  const synCandidates = selectedReal.filter((w) => w.synonyms.length > 0);
  if (synCandidates.length < config.synonymsCount) {
    throw new Error(
      `Not enough real words with synonyms: need ${config.synonymsCount}, ` +
        `have ${synCandidates.length}.`,
    );
  }

  const antCandidates = selectedReal.filter((w) => w.antonyms.length > 0);
  if (antCandidates.length < config.antonymsCount) {
    throw new Error(
      `Not enough real words with antonyms: need ${config.antonymsCount}, ` +
        `have ${antCandidates.length}.`,
    );
  }

  const defCandidates = selectedReal.filter((w) =>
    w.definition && w.definition.trim() !== ""
  );
  if (defCandidates.length < config.definitionCount) {
    throw new Error(
      `Not enough real words with definitions: need ` +
        `${config.definitionCount}, have ${defCandidates.length}.`,
    );
  }

  if (selectedReal.length < config.spellingCount) {
    throw new Error(
      `Not enough real words for spelling questions: need ` +
        `${config.spellingCount}, have ${selectedReal.length}.`,
    );
  }

  const synonymWords = shuffle(synCandidates, random).slice(
    0,
    config.synonymsCount,
  );
  const antonymWords = shuffle(antCandidates, random).slice(
    0,
    config.antonymsCount,
  );
  const definitionWords = shuffle(defCandidates, random).slice(
    0,
    config.definitionCount,
  );
  const spellingWords = shuffle(selectedReal, random).slice(
    0,
    config.spellingCount,
  );

  const usedValues = new Set([
    ...selectedReal.map((w) => w.value),
    ...selectedPseudo.map((w) => w.value),
  ]);
  const distractorPool = wordPool
    .filter((w) => w.isReal && !usedValues.has(w.value))
    .map((w) => w.value);

  function pickDistractors(correct: string, exclude: string[] = []): string[] {
    const candidates = distractorPool.filter((v) =>
      v !== correct && !exclude.includes(v)
    );
    return shuffle(candidates, random).slice(0, 3);
  }

  const questions: SnapshotQuestion[] = [];

  for (const w of shuffle([...selectedReal, ...selectedPseudo], random)) {
    let similar: WordPoolEntry | null = null;
    if (w.isReal && random() < 0.5) {
      const pseudoPool = wordPool.filter((wp) => !wp.isReal);
      similar = findSimilarWord(w, pseudoPool, random);
    }
    if (!similar) {
      similar = findSimilarWord(w, wordPool, random);
    }
    questions.push({
      type: "verification",
      wordText: w.value,
      isReal: w.isReal,
      difficulty: w.difficulty,
      similarWord: similar?.value,
      similarWordIsReal: similar?.isReal,
    });
  }

  for (const w of synonymWords) {
    const correctSynonym = w.synonyms[0] ?? "";
    questions.push({
      type: "synonym",
      promptText: w.value,
      correctText: correctSynonym,
      distractors: pickDistractors(correctSynonym, [w.value]),
      verified: false,
    });
  }

  for (const w of antonymWords) {
    const correctAntonym = w.antonyms[0] ?? "";
    questions.push({
      type: "antonym",
      promptText: w.value,
      correctText: correctAntonym,
      distractors: pickDistractors(correctAntonym, [w.value]),
      verified: false,
    });
  }

  for (const w of definitionWords) {
    questions.push({
      type: "definition",
      definitionText: w.definition ?? "",
      correctText: w.value,
      distractors: pickDistractors(w.value),
      verified: false,
    });
  }

  for (const w of spellingWords) {
    const spellingCandidates = generateSpellingCandidates(w.value);
    while (spellingCandidates.length < 3) {
      spellingCandidates.push(w.value + "x");
    }
    questions.push({
      type: "spelling",
      contextSentence: `Example sentence with ___ for word ${w.value}.`,
      correctText: w.value,
      distractors: spellingCandidates.slice(0, 3),
      verified: false,
    });
  }

  return questions;
}
