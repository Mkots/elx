import { assertEquals, assertThrows } from "@std/assert";
import {
  cleanRecords,
  cutSlashVariant,
  isAbbreviation,
  isHyphenated,
  isMultiWord,
  normalizeHeadword,
} from "./clean.ts";

Deno.test("VER-CLEAN: cutSlashVariant keeps the first slash-variant form", () => {
  assertEquals(cutSlashVariant("adviser/advisor"), "adviser");
  assertEquals(cutSlashVariant("a.m./A.M./am/AM"), "a.m.");
});

Deno.test("VER-CLEAN: isMultiWord detects whitespace-separated headwords", () => {
  assertEquals(isMultiWord("alarm clock"), true);
  assertEquals(isMultiWord("abandon"), false);
});

Deno.test("VER-CLEAN: isHyphenated detects hyphenated headwords", () => {
  assertEquals(isHyphenated("brand-new"), true);
  assertEquals(isHyphenated("abandon"), false);
});

Deno.test("VER-CLEAN: isAbbreviation detects dotted shorthand and all-caps acronyms", () => {
  assertEquals(isAbbreviation("a.m."), true);
  assertEquals(isAbbreviation("Mr."), true);
  assertEquals(isAbbreviation("DVD"), true);
  assertEquals(isAbbreviation("OK"), true);
  assertEquals(isAbbreviation("April"), false);
  assertEquals(isAbbreviation("abandon"), false);
});

Deno.test("VER-CLEAN: normalizeHeadword lowercases and collapses whitespace/unicode", () => {
  assertEquals(normalizeHeadword("April"), "april");
  assertEquals(normalizeHeadword("  Cafe   "), "cafe");
  assertEquals(normalizeHeadword("café"), "café".normalize("NFC"));
});

Deno.test("VER-CLEAN: cleanRecords normalizes headwords for kept POS", () => {
  const { rows, stats } = cleanRecords([
    { headword: "adviser/advisor", pos: "noun" },
    { headword: "Abandon", pos: "verb" },
  ]);
  assertEquals(rows.map((r) => r.headword), ["adviser", "abandon"]);
  assertEquals(stats.headwordChanged, 2);
});

Deno.test("VER-CLEAN: cleanRecords drops function-word POS rows and counts them", () => {
  const { rows, removed, stats } = cleanRecords([
    { headword: "a", pos: "determiner" },
    { headword: "I", pos: "pronoun" },
    { headword: "dog", pos: "noun" },
  ]);
  assertEquals(rows.map((r) => r.headword), ["dog"]);
  assertEquals(removed.length, 2);
  assertEquals(removed[0].reason, "function POS: determiner");
  assertEquals(stats.removedByPos, { determiner: 1, pronoun: 1 });
});

Deno.test("VER-CLEAN: cleanRecords drops multi-word, hyphenated and abbreviation headwords", () => {
  const { rows, removed, stats } = cleanRecords([
    { headword: "alarm clock", pos: "noun" },
    { headword: "brand-new", pos: "adjective" },
    { headword: "DVD", pos: "noun" },
    { headword: "a.m.", pos: "adverb" },
    { headword: "April", pos: "noun" },
  ]);
  assertEquals(rows.map((r) => r.headword), ["april"]);
  assertEquals(removed.length, 4);
  assertEquals(removed.map((r) => r.reason), [
    "multi-word headword",
    "hyphenated headword",
    "abbreviation/acronym",
    "abbreviation/acronym",
  ]);
  assertEquals(stats.removedByShape, {
    "multi-word headword": 1,
    "hyphenated headword": 1,
    "abbreviation/acronym": 2,
  });
});

Deno.test("VER-CLEAN: cleanRecords guards against empty headwords", () => {
  assertThrows(
    () => cleanRecords([{ headword: "  ", pos: "noun" }]),
    Error,
    "empty headword",
  );
});

Deno.test("VER-CLEAN: cleanRecords guards against unknown POS tags", () => {
  assertThrows(
    () => cleanRecords([{ headword: "dog", pos: "mystery" }]),
    Error,
    'unknown POS "mystery"',
  );
});
