import { assertEquals, assertNotEquals } from "@std/assert";
import { selectDistractors } from "./distractors.ts";
import { seededRng } from "./rng.ts";

Deno.test("VER-DISTRACTORS: selectDistractors filters out target and target relations", () => {
  const target = {
    headword: "abandon",
    pos: "verb",
    CEFR: "B1",
    lexname: "verb.possession",
    synonyms: ["forsake", "leave"],
    antonyms: ["keep"],
    hypernyms: ["discard"],
  };

  const pool = [
    target,
    {
      headword: "forsake",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "keep",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "discard",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    // Valid candidates
    {
      headword: "surrender",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "yield",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "relinquish",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
  ];

  const rng = seededRng(42);

  const chosen = selectDistractors(target, pool, rng, "synonym");

  // Should have exactly 3 distractors
  assertEquals(chosen.length, 3);

  // None of the chosen should be the target or its synonyms/antonyms/hypernyms
  const forbidden = ["abandon", "forsake", "keep", "discard"];
  for (const item of chosen) {
    assertEquals(forbidden.includes(item), false);
  }
});

Deno.test("VER-DISTRACTORS: selectDistractors prefers same lexname for definition mode", () => {
  const target = {
    headword: "dog",
    pos: "noun",
    CEFR: "A1",
    lexname: "noun.animal",
    synonyms: [],
    antonyms: [],
    hypernyms: [],
  };

  const pool = [
    target,
    // Same POS + CEFR + lexname (animal)
    {
      headword: "cat",
      pos: "noun",
      CEFR: "A1",
      lexname: "noun.animal",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "cow",
      pos: "noun",
      CEFR: "A1",
      lexname: "noun.animal",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "pig",
      pos: "noun",
      CEFR: "A1",
      lexname: "noun.animal",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    // Same POS + CEFR, different lexname
    {
      headword: "car",
      pos: "noun",
      CEFR: "A1",
      lexname: "noun.artifact",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "house",
      pos: "noun",
      CEFR: "A1",
      lexname: "noun.artifact",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
  ];

  const rng = seededRng(42);

  const chosen = selectDistractors(target, pool, rng, "definition");

  // Should select animal distractors first because they have the same lexname
  assertEquals(chosen.sort((a, b) => a.localeCompare(b)), [
    "cat",
    "cow",
    "pig",
  ]);
});

Deno.test("VER-DISTRACTORS: selectDistractors runs deterministically under same seed", () => {
  const target = {
    headword: "abandon",
    pos: "verb",
    CEFR: "B1",
    lexname: "verb.possession",
    synonyms: [],
    antonyms: [],
    hypernyms: [],
  };

  const pool = [
    target,
    {
      headword: "surrender",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "yield",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "relinquish",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
    {
      headword: "concede",
      pos: "verb",
      CEFR: "B1",
      lexname: "verb.possession",
      synonyms: [],
      antonyms: [],
      hypernyms: [],
    },
  ];

  const out1 = selectDistractors(target, pool, seededRng(42), "synonym");
  const out2 = selectDistractors(target, pool, seededRng(42), "synonym");
  const out3 = selectDistractors(target, pool, seededRng(99), "synonym");

  assertEquals(out1, out2);
  assertNotEquals(out1, out3);
});
