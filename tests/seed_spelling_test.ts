import { GAP, hasSingleGap, spellingSeeds } from "../scripts/seed_spelling.ts";
import { isUsableWord } from "../scripts/seed_synonyms.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("VER-SEED-SPELLING: hasSingleGap accepts a sentence with exactly one gap", () => {
  assert(hasSingleGap(`The cat sat on the ___ mat.`));
});

Deno.test("VER-SEED-SPELLING: hasSingleGap rejects sentences with no gap or many gaps", () => {
  assert(!hasSingleGap("No gap here at all."), "missing gap");
  assert(!hasSingleGap(`A ___ and another ${GAP} gap.`), "two gaps");
});

Deno.test("VER-SEED-SPELLING: spelling seeds contain no duplicate words", () => {
  const words = spellingSeeds.map((seed) => seed.word);
  const unique = new Set(words);

  assertEquals(unique.size, words.length, "duplicate seed words found");
});

Deno.test("VER-SEED-SPELLING: spelling seed words are usable single tokens", () => {
  for (const seed of spellingSeeds) {
    assert(
      isUsableWord(seed.word),
      `word "${seed.word}" must be a lowercase single-token word`,
    );
  }
});

Deno.test("VER-SEED-SPELLING: spelling seeds have difficulty in range 1-5", () => {
  for (const seed of spellingSeeds) {
    assert(
      Number.isInteger(seed.difficulty) &&
        seed.difficulty >= 1 &&
        seed.difficulty <= 5,
      `word "${seed.word}" has invalid difficulty ${seed.difficulty}`,
    );
  }
});

Deno.test("VER-SEED-SPELLING: every spelling sentence has exactly one gap", () => {
  for (const seed of spellingSeeds) {
    assert(
      hasSingleGap(seed.sentence),
      `sentence for "${seed.word}" must contain exactly one ${GAP} gap`,
    );
  }
});

Deno.test("VER-SEED-SPELLING: spelling sentences never contain the answer word", () => {
  for (const seed of spellingSeeds) {
    const filled = seed.sentence.toLowerCase();
    assert(
      !new RegExp(`\\b${seed.word}\\b`).test(filled),
      `sentence for "${seed.word}" leaks the answer`,
    );
  }
});
