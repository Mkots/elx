import { assertEquals } from "@std/assert";
import { replaceHeadwordWithGap } from "./gap_sentences.ts";

Deno.test("VER-GAP-SENTENCES: replaceHeadwordWithGap replaces base form case-insensitively", () => {
  assertEquals(
    replaceHeadwordWithGap("We abandoned the ship.", "abandon"),
    "We ___ the ship.",
  );
  assertEquals(
    replaceHeadwordWithGap("He has great ability.", "ability"),
    "He has great ___.",
  );
});

Deno.test("VER-GAP-SENTENCES: replaceHeadwordWithGap replaces inflected forms of regular verbs", () => {
  assertEquals(
    replaceHeadwordWithGap("They are abandoning the project.", "abandon"),
    "They are ___ the project.",
  );
  assertEquals(
    replaceHeadwordWithGap("He abandons all hope.", "abandon"),
    "He ___ all hope.",
  );
  assertEquals(
    replaceHeadwordWithGap("The search was abandoned yesterday.", "abandon"),
    "The search was ___ yesterday.",
  );
});

Deno.test("VER-GAP-SENTENCES: replaceHeadwordWithGap replaces inflected forms ending in y", () => {
  assertEquals(
    replaceHeadwordWithGap("She studies history every day.", "study"),
    "She ___ history every day.",
  );
  assertEquals(
    replaceHeadwordWithGap("They studied hard for the test.", "study"),
    "They ___ hard for the test.",
  );
  assertEquals(
    replaceHeadwordWithGap("He is studying the results.", "study"),
    "He is ___ the results.",
  );
});

Deno.test("VER-GAP-SENTENCES: replaceHeadwordWithGap returns null if word is absent or multiple matches", () => {
  // Absent
  assertEquals(
    replaceHeadwordWithGap("The weather is nice today.", "abandon"),
    null,
  );
  // Multiple matches
  assertEquals(
    replaceHeadwordWithGap(
      "If you abandon the cat, I will abandon the dog.",
      "abandon",
    ),
    null,
  );
});
