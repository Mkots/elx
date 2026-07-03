import { assertEquals, assertThrows } from "@std/assert";
import { cleanHeadword, cleanRecords } from "../scripts/clean.ts";

Deno.test("VER-CLEAN: cleanHeadword cuts slash-variants and normalizes whitespace/unicode", () => {
  assertEquals(cleanHeadword("adviser/advisor"), "adviser");
  assertEquals(cleanHeadword("a.m./A.M./am/AM"), "a.m.");
  assertEquals(cleanHeadword("  cafe  au   lait "), "cafe au lait");
  assertEquals(cleanHeadword("café"), "café".normalize("NFC"));
});

Deno.test("VER-CLEAN: cleanRecords normalizes headwords for kept POS", () => {
  const { rows, stats } = cleanRecords([
    { headword: "adviser/advisor", pos: "noun" },
    { headword: "abandon", pos: "verb" },
  ]);
  assertEquals(rows.map((r) => r.headword), ["adviser", "abandon"]);
  assertEquals(stats.headwordChanged, 1);
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
