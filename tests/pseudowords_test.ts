import { assertEquals, assertNotEquals } from "@std/assert";
import { Rabbits } from "../scripts/enrich.ts";
import { generatePseudowordsList } from "../scripts/pseudowords.ts";

// Simple test for Rabbits integration and helper checks
Deno.test("VER-PSEUDOWORDS: Rabbits can load and check entries", async () => {
  const scriptDir = import.meta.dirname ?? ".";
  const rabbitsDir = `${scriptDir}/../scripts/magic-hat/rabbits`;
  const rabbits = new Rabbits(rabbitsDir);
  await rabbits.init(false);

  // Real word should exist
  const existsReal = await rabbits.hasEntry("abandon");
  assertEquals(existsReal, true);

  // Pseudoword should not exist
  const existsPseudo = await rabbits.hasEntry("zongleword");
  assertEquals(existsPseudo, false);
});

// Test the generator logic directly to verify output and determinism
Deno.test("VER-PSEUDOWORDS: Generator runs deterministically and produces requested format", async () => {
  const scriptDir = import.meta.dirname ?? ".";
  const rabbitsDir = `${scriptDir}/../scripts/magic-hat/rabbits`;
  const rabbits = new Rabbits(rabbitsDir);
  await rabbits.init(false);

  const realWordsMock = [
    { word: "abandon", difficulty: 3 },
    { word: "ability", difficulty: 2 },
    { word: "abnormal", difficulty: 3 },
    { word: "abrupt", difficulty: 4 },
    { word: "absolute", difficulty: 2 },
  ];

  // Run twice with the same seed
  const gen1 = await generatePseudowordsList(realWordsMock, rabbits, 5, 42);
  const gen2 = await generatePseudowordsList(realWordsMock, rabbits, 5, 42);

  assertEquals([...gen1.entries()], [...gen2.entries()]);

  // Run with a different seed -> should be different
  const gen3 = await generatePseudowordsList(realWordsMock, rabbits, 5, 99);
  assertNotEquals([...gen1.entries()], [...gen3.entries()]);

  // Verify structure
  assertEquals(gen1.size, 5);

  // Verify all are absent from rabbits dictionary, have difficulty between 1 and 5, and are non-empty
  for (const [word, difficulty] of gen1.entries()) {
    assertEquals(word.length > 0, true);
    assertEquals(difficulty >= 1 && difficulty <= 5, true);
    const exists = await rabbits.hasEntry(word);
    assertEquals(exists, false);
  }
});
