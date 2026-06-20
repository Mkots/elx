import {
  cleanDefinition,
  type DictionaryEntry,
  extractDefinition,
  isUsableDefinition,
} from "../scripts/seed_meanings.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("VER-SEED-MEANINGS: cleanDefinition collapses whitespace and trims", () => {
  assertEquals(
    cleanDefinition("  a   small\n  domestic   animal  "),
    "a small domestic animal",
  );
});

Deno.test("VER-SEED-MEANINGS: isUsableDefinition accepts reasonable definitions", () => {
  assert(isUsableDefinition("a small domestic carnivore kept as a pet", "cat"));
});

Deno.test("VER-SEED-MEANINGS: isUsableDefinition rejects too short or too long text", () => {
  assert(!isUsableDefinition("a pet", "cat"), "too short");
  assert(!isUsableDefinition("x".repeat(241), "cat"), "too long");
});

Deno.test("VER-SEED-MEANINGS: isUsableDefinition rejects definitions revealing the word", () => {
  assert(
    !isUsableDefinition("a cat is a small domestic carnivore", "cat"),
    "exact word leaks the answer",
  );
  assert(
    isUsableDefinition("a small domestic carnivore kept as a pet", "cats"),
    "different word is fine",
  );
});

Deno.test("VER-SEED-MEANINGS: extractDefinition returns the first usable definition", () => {
  const entries: DictionaryEntry[] = [
    {
      word: "kitten",
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            { definition: "kitten" }, // too short / leaks
            { definition: "a young  domestic\ncat that is not yet an adult" },
          ],
        },
      ],
    },
  ];

  assertEquals(
    extractDefinition(entries, "kitten"),
    "a young domestic cat that is not yet an adult",
  );
});

Deno.test("VER-SEED-MEANINGS: extractDefinition returns null when nothing fits", () => {
  const entries: DictionaryEntry[] = [
    { word: "cat", meanings: [{ definitions: [{ definition: "a cat" }] }] },
    { word: "cat", meanings: [{ definitions: [{}] }] },
  ];

  assertEquals(extractDefinition(entries, "cat"), null);
});

Deno.test("VER-SEED-MEANINGS: extractDefinition tolerates missing meanings and definitions", () => {
  assertEquals(extractDefinition([{ word: "cat" }], "cat"), null);
});
