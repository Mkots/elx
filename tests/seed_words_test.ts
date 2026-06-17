import { wordSeeds } from "../scripts/seed_words.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("seed words contain no duplicate values", () => {
  const values = wordSeeds.map((word) => word.value);
  const unique = new Set(values);

  assertEquals(unique.size, values.length, "duplicate word values found");
});

Deno.test("seed words are lowercase and non-empty", () => {
  for (const word of wordSeeds) {
    assert(word.value.length > 0, "empty word value");
    assertEquals(
      word.value,
      word.value.toLowerCase().trim(),
      `word "${word.value}" must be trimmed lowercase`,
    );
  }
});

Deno.test("seed words have difficulty in range 1-5", () => {
  for (const word of wordSeeds) {
    assert(
      Number.isInteger(word.difficulty) &&
        word.difficulty >= 1 &&
        word.difficulty <= 5,
      `word "${word.value}" has invalid difficulty ${word.difficulty}`,
    );
  }
});

Deno.test("seed words include both real words and pseudowords", () => {
  const realCount = wordSeeds.filter((word) => word.isReal).length;
  const pseudoCount = wordSeeds.filter((word) => !word.isReal).length;

  assert(realCount > 0, "expected at least one real word");
  assert(pseudoCount > 0, "expected at least one pseudoword");
});
