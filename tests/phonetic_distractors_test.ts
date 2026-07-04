import { assertEquals } from "@std/assert";
import {
  editDistance,
  selectPhoneticDistractors,
} from "../scripts/phonetic_distractors.ts";

Deno.test("VER-PHONETIC-DISTRACTORS: editDistance calculates correct Levenshtein distance", () => {
  assertEquals(editDistance("cat", "cat"), 0);
  assertEquals(editDistance("cat", "cut"), 1);
  assertEquals(editDistance("cat", "bat"), 1);
  assertEquals(editDistance("cat", "cats"), 1);
  assertEquals(editDistance("cats", "cat"), 1);
  assertEquals(editDistance("kitten", "sitting"), 3);
});

Deno.test("VER-PHONETIC-DISTRACTORS: selectPhoneticDistractors selects closest phonetic matches", () => {
  const target = {
    headword: "accept",
    pos: "verb",
    CEFR: "B1",
    pronunciation: "ækˈsɛpt",
    metaphone: "AKSPT",
  };

  const pool = [
    target,
    {
      headword: "except",
      pos: "verb",
      CEFR: "B1",
      pronunciation: "ɪkˈsɛpt",
      metaphone: "AKSPT", // same Metaphone code under rules
    },
    {
      headword: "expect",
      pos: "verb",
      CEFR: "B1",
      pronunciation: "ɪkˈspɛkt",
      metaphone: "AKSPKT",
    },
    {
      headword: "access",
      pos: "verb",
      CEFR: "B1",
      pronunciation: "ˈæk.sɛs",
      metaphone: "AKSS",
    },
    {
      headword: "abandon",
      pos: "verb",
      CEFR: "B1",
      pronunciation: "əˈbæn.dən",
      metaphone: "ABNTN",
    },
  ];

  const chosen = selectPhoneticDistractors(target, pool);

  // Should have "except", "expect", and "access"
  assertEquals(chosen.length, 3);
  assertEquals(chosen.includes("except"), true);
  assertEquals(chosen.includes("expect"), true);
  assertEquals(chosen.includes("access"), true);

  // "except" should be the first choice due to Metaphone match + very close IPA
  assertEquals(chosen[0], "except");

  // Should definitely not include "abandon" which is completely different
  assertEquals(chosen.includes("abandon"), false);
});
