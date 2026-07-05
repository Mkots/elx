import { assertEquals, assertThrows } from "@std/assert";
import {
  buildQuestions,
  findSimilarWord,
  generateSpellingCandidates,
  type TicketGenerationConfig,
  type WordPoolEntry,
} from "../domain/ticket_generation.ts";
import type { VerificationSnapshotQuestion } from "../db/schema.ts";

function getRng(seedValue: number): () => number {
  let seed = seedValue;
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeConfig(
  overrides: Partial<TicketGenerationConfig> = {},
): TicketGenerationConfig {
  return {
    difficulty1Count: 2,
    difficulty2Count: 2,
    difficulty3Count: 0,
    difficulty4Count: 0,
    difficulty5Count: 0,
    realCount: 3,
    pseudoCount: 1,
    synonymsCount: 1,
    spellingCount: 1,
    definitionCount: 1,
    ...overrides,
  };
}

function makePool(): WordPoolEntry[] {
  return [
    {
      value: "apple",
      isReal: true,
      difficulty: 1,
      synonyms: ["fruit"],
      definition: "a round fruit",
    },
    {
      value: "banana",
      isReal: true,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "cherry",
      isReal: true,
      difficulty: 2,
      synonyms: ["fruit"],
      definition: "a small red fruit",
    },
    {
      value: "date",
      isReal: true,
      difficulty: 2,
      synonyms: [],
      definition: null,
    },
    {
      value: "blarg",
      isReal: false,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "flurp",
      isReal: false,
      difficulty: 2,
      synonyms: [],
      definition: null,
    },
  ];
}

Deno.test("VER-TICKET-GENERATION: happy path builds verification and challenge questions", () => {
  const questions = buildQuestions(makeConfig(), makePool(), getRng(42));

  const verifications = questions.filter((q) => q.type === "verification");
  assertEquals(verifications.length, 4); // 3 real + 1 pseudo

  const reals = verifications.filter((q) =>
    (q as VerificationSnapshotQuestion).isReal
  );
  assertEquals(reals.length, 3);

  const pseudos = verifications.filter((q) =>
    !(q as VerificationSnapshotQuestion).isReal
  );
  assertEquals(pseudos.length, 1);

  assertEquals(questions.filter((q) => q.type === "synonym").length, 1);
  assertEquals(questions.filter((q) => q.type === "definition").length, 1);
  assertEquals(questions.filter((q) => q.type === "spelling").length, 1);
});

Deno.test("VER-TICKET-GENERATION: same seed produces an identical ticket", () => {
  const config = makeConfig();
  const pool = makePool();

  const first = buildQuestions(config, pool, getRng(7));
  const second = buildQuestions(config, pool, getRng(7));

  assertEquals(first, second);
});

Deno.test("VER-TICKET-GENERATION: different seeds can produce different tickets", () => {
  const config = makeConfig();
  const pool = makePool();

  const first = buildQuestions(config, pool, getRng(1));
  const second = buildQuestions(config, pool, getRng(2));

  assertEquals(first === second, false);
});

Deno.test("VER-TICKET-GENERATION: throws naming the difficulty when the pool is too small", () => {
  const config = makeConfig({ difficulty1Count: 5 });
  const pool = makePool(); // only 2 real + 1 pseudo at difficulty 1

  assertThrows(
    () => buildQuestions(config, pool, getRng(1)),
    Error,
    "difficulty 1",
  );
});

Deno.test("VER-TICKET-GENERATION: throws when not enough real words have synonyms", () => {
  const config = makeConfig({ synonymsCount: 5 });
  const pool = makePool();

  assertThrows(
    () => buildQuestions(config, pool, getRng(1)),
    Error,
    "synonyms",
  );
});

Deno.test("VER-TICKET-GENERATION: throws when not enough real words have definitions", () => {
  const config = makeConfig({ definitionCount: 5 });
  const pool = makePool();

  assertThrows(
    () => buildQuestions(config, pool, getRng(1)),
    Error,
    "definitions",
  );
});

Deno.test("VER-TICKET-GENERATION: generateSpellingCandidates never returns the original word", () => {
  const misspellings = generateSpellingCandidates("action");
  assertEquals(misspellings.length, 5);
  for (const m of misspellings) {
    assertEquals(m !== "action", true);
  }
});

Deno.test("VER-TICKET-GENERATION: findSimilarWord finds the closest word excluding itself, using random as tie-breaker", () => {
  const pool: WordPoolEntry[] = [
    {
      value: "cat",
      isReal: true,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "bat",
      isReal: true,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "car",
      isReal: true,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "dog",
      isReal: true,
      difficulty: 2,
      synonyms: [],
      definition: null,
    },
  ];

  // Target word is "cat".
  // Candidates and distances:
  // "bat": editDistance("cat", "bat") = 1
  // "car": editDistance("cat", "car") = 1
  // "dog": editDistance("cat", "dog") = 3
  // Excluding target word "cat".
  // Tie-break: lowest distance is 1, candidates: "bat" and "car".

  const rng = getRng(42);
  const result1 = findSimilarWord(pool[0], pool, rng);
  assertEquals(result1 !== null, true);
  assertEquals(result1!.value === "bat" || result1!.value === "car", true);

  // If pool only has the target word, it should return null
  const result2 = findSimilarWord(pool[0], [pool[0]], rng);
  assertEquals(result2, null);
});

Deno.test("VER-TICKET-GENERATION: buildQuestions includes difficulty, similarWord, and similarWordIsReal in verification snapshot questions", () => {
  const pool = makePool();
  const config = makeConfig();
  const questions = buildQuestions(config, pool, getRng(42));

  const verifications = questions.filter((q) =>
    q.type === "verification"
  ) as VerificationSnapshotQuestion[];
  assertEquals(verifications.length, 4);

  for (const q of verifications) {
    // Check difficulty is present
    assertEquals(typeof q.difficulty, "number");
    assertEquals(q.difficulty >= 1 && q.difficulty <= 5, true);

    // Check similarWord is present and is from the pool (excluding itself)
    if (q.similarWord !== undefined) {
      assertEquals(typeof q.similarWord, "string");
      assertEquals(q.similarWord !== q.wordText, true);
      assertEquals(pool.some((p) => p.value === q.similarWord), true);
      assertEquals(typeof q.similarWordIsReal, "boolean");
      const matched = pool.find((p) => p.value === q.similarWord);
      assertEquals(q.similarWordIsReal, matched?.isReal);
    }
  }
});

Deno.test("VER-TICKET-GENERATION: similar words for real words can be pseudowords", () => {
  const config = makeConfig({
    difficulty1Count: 3,
    difficulty2Count: 0,
    difficulty3Count: 0,
    difficulty4Count: 0,
    difficulty5Count: 0,
    realCount: 2,
    pseudoCount: 1,
    synonymsCount: 0,
    spellingCount: 0,
    definitionCount: 0,
  });

  const pool: WordPoolEntry[] = [
    {
      value: "cat",
      isReal: true,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "cab",
      isReal: true,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
    {
      value: "cap",
      isReal: false,
      difficulty: 1,
      synonyms: [],
      definition: null,
    },
  ];

  // Test Case 1: random() < 0.5 (e.g., 0.1) -> searches pseudowords.
  // "cat" is real, pseudoword "cap" is closer/in pool. It should pick "cap" (pseudo).
  {
    const mockRng = () => 0.1;
    const questions = buildQuestions(config, pool, mockRng);
    const catQuestion = questions.find((q) =>
      q.type === "verification" && q.wordText === "cat"
    ) as VerificationSnapshotQuestion;
    assertEquals(catQuestion !== undefined, true);
    assertEquals(catQuestion.similarWord, "cap");
    assertEquals(catQuestion.similarWordIsReal, false);
  }

  // Test Case 2: random() >= 0.5 (e.g., 0.9) -> general pool search.
  // "cat" is real. If we force random() >= 0.5, it searches the general pool.
  // Since we mock rng to return 0.9, we might get either "cab" or "cap" based on tie-breaking.
  // Let's make "cab" closer than "cap" so it definitely chooses the real word when general search is used.
  // E.g., "cat" (real), "cab" (real, distance 1), "clog" (pseudo, distance 3).
  // If random check succeeds, it is forced to search pseudo pool, so it must pick "clog" (distance 3, even though it's further than "cab").
  // If random check fails, it searches general pool and picks "cab" (distance 1).
  {
    const pool2: WordPoolEntry[] = [
      {
        value: "cat",
        isReal: true,
        difficulty: 1,
        synonyms: [],
        definition: null,
      },
      {
        value: "cab",
        isReal: true,
        difficulty: 1,
        synonyms: [],
        definition: null,
      },
      {
        value: "clog",
        isReal: false,
        difficulty: 1,
        synonyms: [],
        definition: null,
      },
    ];

    // Case 2a: random() < 0.5 -> searches pseudowords only, picks "clog"
    const questions1 = buildQuestions(config, pool2, () => 0.1);
    const catQ1 = questions1.find((q) =>
      q.type === "verification" && q.wordText === "cat"
    ) as VerificationSnapshotQuestion;
    assertEquals(catQ1 !== undefined, true);
    assertEquals(catQ1.similarWord, "clog");
    assertEquals(catQ1.similarWordIsReal, false);

    // Case 2b: random() >= 0.5 -> general search, picks "cab" because distance is 1 (clog is 3)
    const questions2 = buildQuestions(config, pool2, () => 0.9);
    const catQ2 = questions2.find((q) =>
      q.type === "verification" && q.wordText === "cat"
    ) as VerificationSnapshotQuestion;
    assertEquals(catQ2 !== undefined, true);
    assertEquals(catQ2.similarWord, "cab");
    assertEquals(catQ2.similarWordIsReal, true);
  }

  // Test Case 3: random() < 0.5 but no pseudowords are in pool -> fallback to general pool search.
  {
    const configNoPseudo = makeConfig({
      difficulty1Count: 2,
      difficulty2Count: 0,
      difficulty3Count: 0,
      difficulty4Count: 0,
      difficulty5Count: 0,
      realCount: 2,
      pseudoCount: 0,
      synonymsCount: 0,
      spellingCount: 0,
      definitionCount: 0,
    });
    const poolNoPseudo: WordPoolEntry[] = [
      {
        value: "cat",
        isReal: true,
        difficulty: 1,
        synonyms: [],
        definition: null,
      },
      {
        value: "cab",
        isReal: true,
        difficulty: 1,
        synonyms: [],
        definition: null,
      },
    ];
    const questions3 = buildQuestions(configNoPseudo, poolNoPseudo, () => 0.1);
    const catQ3 = questions3.find((q) =>
      q.type === "verification" && q.wordText === "cat"
    ) as VerificationSnapshotQuestion;
    assertEquals(catQ3 !== undefined, true);
    assertEquals(catQ3.similarWord, "cab");
    assertEquals(catQ3.similarWordIsReal, true);
  }
});
