import {
  difficultyFromFrequency,
  frequencyFromTags,
  isUsableWord,
  MIN_DISTRACTORS,
  pickDistractors,
} from "../scripts/seed_synonyms.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("VER-SEED-SYNONYMS: isUsableWord accepts plain lowercase words", () => {
  assert(isUsableWord("content"));
  assert(isUsableWord("bright"));
});

Deno.test("VER-SEED-SYNONYMS: isUsableWord rejects phrases, hyphens, and odd lengths", () => {
  assert(!isUsableWord("ice cream"), "multi-word phrase");
  assert(!isUsableWord("well-known"), "hyphenated");
  assert(!isUsableWord("Bright"), "uppercase");
  assert(!isUsableWord("ax"), "too short");
  assert(!isUsableWord("a".repeat(21)), "too long");
});

Deno.test("VER-SEED-SYNONYMS: frequencyFromTags parses the f: metadata tag", () => {
  assertEquals(frequencyFromTags(["f:73.803356"]), 73.803356);
  assertEquals(frequencyFromTags(["p:n", "f:0.29"]), 0.29);
  assertEquals(frequencyFromTags(undefined), 0);
  assertEquals(frequencyFromTags(["p:n"]), 0);
});

Deno.test("VER-SEED-SYNONYMS: difficultyFromFrequency maps frequency onto the 1-5 scale", () => {
  assertEquals(difficultyFromFrequency(100), 1);
  assertEquals(difficultyFromFrequency(20), 2);
  assertEquals(difficultyFromFrequency(5), 3);
  assertEquals(difficultyFromFrequency(1), 4);
  assertEquals(difficultyFromFrequency(0.01), 5);
});

Deno.test("VER-SEED-SYNONYMS: pickDistractors returns the requested count drawn from the pool", () => {
  const pool = [10, 11, 12, 13, 14];
  const picked = pickDistractors(pool, MIN_DISTRACTORS);

  assertEquals(picked.length, MIN_DISTRACTORS);
  assertEquals(new Set(picked).size, MIN_DISTRACTORS, "no duplicate ids");
  for (const id of picked) assert(pool.includes(id), "id came from the pool");
});

Deno.test("VER-SEED-SYNONYMS: pickDistractors is deterministic with a seeded rng", () => {
  const pool = [1, 2, 3, 4, 5, 6];
  const rng = () => 0; // always picks the current first element during shuffle
  assertEquals(pickDistractors(pool, 3, rng), pickDistractors(pool, 3, rng));
});

Deno.test("VER-SEED-SYNONYMS: pickDistractors caps at the pool size", () => {
  assertEquals(pickDistractors([7, 8], 3).length, 2);
});
