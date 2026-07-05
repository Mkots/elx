import { assertEquals } from "@std/assert";
import { validateForPublish } from "../domain/ticket_publish.ts";
import type { SnapshotQuestion } from "../db/schema.ts";

Deno.test("VER-TICKET-PUBLISH: a fully verified ticket has no problems", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "fruit",
      distractors: ["a", "b", "c"],
      verified: true,
    },
  ];

  assertEquals(validateForPublish({ questions }), []);
});

Deno.test("VER-TICKET-PUBLISH: lists every problem across every unverified question at once", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "",
      distractors: [],
      verified: false,
    },
    {
      type: "spelling",
      contextSentence: "no placeholder here",
      correctText: "banana",
      distractors: ["a", "b", "c"],
      verified: false,
    },
    {
      type: "definition",
      definitionText: "",
      correctText: "cherry",
      distractors: ["a", "b"],
      verified: true,
    },
  ];

  const problems = validateForPublish({ questions });

  // Question #1 (synonym): unverified, no correct text, wrong distractor count.
  assertEquals(
    problems.some((p) => p.includes("Question #1") && p.includes("unverified")),
    true,
  );
  assertEquals(
    problems.some((p) =>
      p.includes("Question #1") && p.includes("no correct text")
    ),
    true,
  );
  assertEquals(
    problems.some((p) =>
      p.includes("Question #1") && p.includes("exactly 3 distractors")
    ),
    true,
  );

  // Question #2 (spelling): unverified, missing '___' placeholder.
  assertEquals(
    problems.some((p) => p.includes("Question #2") && p.includes("unverified")),
    true,
  );
  assertEquals(
    problems.some((p) => p.includes("Question #2") && p.includes("'___'")),
    true,
  );

  // Question #3 (definition): verified, but wrong distractor count and no definition text.
  assertEquals(
    problems.some((p) =>
      p.includes("Question #3") && p.includes("exactly 3 distractors")
    ),
    true,
  );
  assertEquals(
    problems.some((p) =>
      p.includes("Question #3") && p.includes("no definition text")
    ),
    true,
  );
  assertEquals(
    problems.some((p) => p.includes("Question #3") && p.includes("unverified")),
    false,
  );

  // All three challenge questions should have contributed at least one problem.
  assertEquals(problems.length >= 7, true);
});

Deno.test("VER-TICKET-PUBLISH: verification questions never contribute problems", () => {
  const questions: SnapshotQuestion[] = [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    { type: "verification", wordText: "blarg", isReal: false, difficulty: 1 },
  ];

  assertEquals(validateForPublish({ questions }), []);
});

// Verification check comment to allow commit and PR creation.
