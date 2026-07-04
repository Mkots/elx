import { assertEquals } from "@std/assert";
import { createApp } from "../app.ts";
import { defaultServices, type Services } from "../db/services.ts";
import type {
  SeedMeaningVerificationItem,
  SeedSpellingVerificationItem,
  SeedSynonymVerificationItem,
  SeedWordVerificationItem,
} from "../db/repositories/words.ts";

const mockWords: SeedWordVerificationItem[] = [
  { id: 1, value: "alpha", isReal: true, difficulty: 1 },
  { id: 2, value: "blarg", isReal: false, difficulty: 5 },
];
const mockSynonyms: SeedSynonymVerificationItem[] = [
  {
    id: 10,
    prompt: "bright",
    target: "shiny",
    relationType: "synonym",
    distractors: ["dark", "heavy", "quiet"],
  },
];
const mockSpelling: SeedSpellingVerificationItem[] = [
  {
    id: 20,
    contextSentence: "She planted a single red ___ in the garden.",
    correctWord: "flower",
    distractors: ["flour", "flauer", "flaur"],
  },
];
const mockMeanings: SeedMeaningVerificationItem[] = [
  {
    id: 30,
    word: "kitten",
    definitionText: "a young domestic cat that is not yet an adult",
    distractors: ["river", "forest", "castle"],
  },
];

function makeServices(
  wordsOverrides: Partial<Services["words"]> = {},
): Services {
  return {
    ...defaultServices,
    words: {
      ...defaultServices.words,
      loadWords: () => Promise.resolve(mockWords),
      loadSynonyms: () => Promise.resolve(mockSynonyms),
      loadSpelling: () => Promise.resolve(mockSpelling),
      loadMeanings: () => Promise.resolve(mockMeanings),
      ...wordsOverrides,
    },
    sessions: {
      ...defaultServices.sessions,
      loadStage2Result: () => Promise.resolve(null),
    },
    tickets: {
      ...defaultServices.tickets,
      getPublishedTickets: () => Promise.resolve([]),
    },
  };
}

Deno.test("VER-SEED-VERIFICATION-ROUTE: GET /health/seeds/words returns seeded words", async () => {
  const app = createApp(makeServices());
  const response = await app.request("/health/seeds/words");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    category: "words",
    count: 2,
    items: [
      { id: 1, value: "alpha", isReal: true, difficulty: 1 },
      { id: 2, value: "blarg", isReal: false, difficulty: 5 },
    ],
  });
});

Deno.test("VER-SEED-VERIFICATION-ROUTE: GET /health/seeds/synonyms returns synonym challenges", async () => {
  const app = createApp(makeServices());
  const response = await app.request("/health/seeds/synonyms");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    category: "synonyms",
    count: 1,
    items: [
      {
        id: 10,
        prompt: "bright",
        target: "shiny",
        relationType: "synonym",
        distractors: ["dark", "heavy", "quiet"],
      },
    ],
  });
});

Deno.test("VER-SEED-VERIFICATION-ROUTE: GET /health/seeds/spelling returns spelling challenges", async () => {
  const app = createApp(makeServices());
  const response = await app.request("/health/seeds/spelling");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    category: "spelling",
    count: 1,
    items: [
      {
        id: 20,
        contextSentence: "She planted a single red ___ in the garden.",
        correctWord: "flower",
        distractors: ["flour", "flauer", "flaur"],
      },
    ],
  });
});

Deno.test("VER-SEED-VERIFICATION-ROUTE: GET /health/seeds/meanings returns meaning challenges", async () => {
  const app = createApp(makeServices());
  const response = await app.request("/health/seeds/meanings");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    category: "meanings",
    count: 1,
    items: [
      {
        id: 30,
        word: "kitten",
        definitionText: "a young domestic cat that is not yet an adult",
        distractors: ["river", "forest", "castle"],
      },
    ],
  });
});

Deno.test("VER-SEED-VERIFICATION-ROUTE: seed verification routes propagate errors through app handler", async () => {
  const app = createApp(makeServices({
    loadWords: () => Promise.reject(new Error("db offline")),
  }));

  const response = await app.request("/health/seeds/words");

  assertEquals(response.status, 500);
  assertEquals(await response.json(), { error: "Internal server error" });
});
