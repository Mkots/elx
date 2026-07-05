import { assert, assertEquals } from "@std/assert";
import { mapRow, parseRows } from "../scripts/importer_core.ts";
import { SEED_CSV_PATH, SEED_IMPORT_CONFIG } from "../scripts/seed_words.ts";

const csvContent = await Deno.readTextFile(SEED_CSV_PATH);
const { rows } = parseRows(csvContent, SEED_IMPORT_CONFIG);
const wordSeeds = rows.map((row) => mapRow(row, SEED_IMPORT_CONFIG));

Deno.test("VER-SEED-WORDS: seed CSV has the expected word count", () => {
  assertEquals(wordSeeds.length, 75);
});

Deno.test("VER-SEED-WORDS: seed words contain no duplicate values", () => {
  const values = wordSeeds.map((word) => word.value);
  const unique = new Set(values);

  assertEquals(unique.size, values.length, "duplicate word values found");
});

Deno.test("VER-SEED-WORDS: seed words are lowercase and non-empty", () => {
  for (const word of wordSeeds) {
    assert(word.value.length > 0, "empty word value");
    assertEquals(
      word.value,
      word.value.toLowerCase().trim(),
      `word "${word.value}" must be trimmed lowercase`,
    );
  }
});

Deno.test("VER-SEED-WORDS: seed words have difficulty in range 1-5", () => {
  for (const word of wordSeeds) {
    assert(
      Number.isInteger(word.difficulty) &&
        word.difficulty >= 1 &&
        word.difficulty <= 5,
      `word "${word.value}" has invalid difficulty ${word.difficulty}`,
    );
  }
});

Deno.test("VER-SEED-WORDS: seed words include both real words and pseudowords", () => {
  const realCount = wordSeeds.filter((word) => word.isReal).length;
  const pseudoCount = wordSeeds.filter((word) => !word.isReal).length;

  assert(realCount > 0, "expected at least one real word");
  assert(pseudoCount > 0, "expected at least one pseudoword");
});

Deno.test("VER-SEED-WORDS: real words have synonyms and definition, pseudowords do not", () => {
  const realWords = wordSeeds.filter((word) => word.isReal);
  const pseudoWords = wordSeeds.filter((word) => !word.isReal);

  for (const word of realWords) {
    assert(
      Array.isArray(word.synonyms),
      `real word "${word.value}" should have synonyms array`,
    );
    assert(
      Array.isArray(word.antonyms),
      `real word "${word.value}" should have antonyms array`,
    );
  }

  const definedCount =
    realWords.filter((w) => w.definition && w.definition.length > 0).length;
  const withSynonymsCount = realWords.filter((w) => w.synonyms.length > 0)
    .length;

  assert(
    definedCount > 0,
    "expected at least one real word to have a definition",
  );
  assert(
    withSynonymsCount > 0,
    "expected at least one real word to have synonyms",
  );

  for (const word of pseudoWords) {
    assertEquals(
      word.synonyms.length,
      0,
      `pseudoword "${word.value}" should have no synonyms`,
    );
    assertEquals(
      word.antonyms.length,
      0,
      `pseudoword "${word.value}" should have no antonyms`,
    );
    assertEquals(
      word.definition,
      null,
      `pseudoword "${word.value}" should have no definition`,
    );
  }
});

Deno.test("VER-SEED-WORDS: spot-checks a known real word's fields", () => {
  const window = wordSeeds.find((w) => w.value === "window");
  assert(window, "expected seed data to contain 'window'");
  assertEquals(window.isReal, true);
  assertEquals(window.difficulty, 1);
  assertEquals(window.synonyms, ["windowpane"]);
});
