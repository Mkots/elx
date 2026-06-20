import type { Hono } from "@hono/hono";
import { AdminChallengesPage } from "../../ui/pages/AdminChallengesPage.tsx";
import { AdminChallengeEditPage } from "../../ui/pages/AdminChallengeEditPage.tsx";
import type { AdminChallengesLoader } from "./loaders/challenges.ts";

const CHALLENGE_TYPES = ["synonyms", "spelling", "definitions"] as const;
type ChallengeType = typeof CHALLENGE_TYPES[number];

function isChallengeType(value: string): value is ChallengeType {
  return (CHALLENGE_TYPES as readonly string[]).includes(value);
}

// parseBody() result shape — challenge form fields arrive as strings.
type BodyData = Record<string, string | File | (string | File)[]>;

type ChallengePayload =
  | {
    type: "synonyms";
    data: {
      wordId: number;
      targetId: number;
      relationType: string;
      distractors: number[];
    };
  }
  | {
    type: "spelling";
    data: {
      contextSentence: string;
      correctWordId: number;
      distractors: number[];
    };
  }
  | {
    type: "definitions";
    data: { wordId: number; definitionText: string; distractors: number[] };
  };

/**
 * Parses the comma-separated distractor input into word ids. Throws with a
 * user-facing message when the list is empty or references unknown words.
 */
function resolveDistractorIds(
  input: string,
  allWords: { id: number; value: string }[],
): number[] {
  const names = input
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (names.length === 0) {
    throw new Error("At least one distractor word is required.");
  }

  const idByValue: Record<string, number> = {};
  for (const w of allWords) {
    idByValue[w.value.toLowerCase()] = w.id;
  }

  const missing: string[] = [];
  const ids: number[] = [];
  for (const name of names) {
    const id = idByValue[name.toLowerCase()];
    if (id === undefined) {
      missing.push(name);
    } else {
      ids.push(id);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `The following distractor words do not exist in the database: ${
        missing.join(", ")
      }`,
    );
  }

  return ids;
}

/**
 * Validates the type-specific form fields and builds the typed payload shared
 * by the create and edit handlers. Throws with a user-facing message on
 * invalid input.
 */
function buildChallengePayload(
  type: ChallengeType,
  body: BodyData,
  distractors: number[],
): ChallengePayload {
  if (type === "synonyms") {
    const wordId = Number(body.wordId);
    const targetId = Number(body.targetId);
    const relationType = typeof body.relationType === "string"
      ? body.relationType.trim()
      : "synonym";

    if (isNaN(wordId) || isNaN(targetId)) {
      throw new Error("Source and target words are required.");
    }

    return { type, data: { wordId, targetId, relationType, distractors } };
  }

  if (type === "spelling") {
    const contextSentence = typeof body.contextSentence === "string"
      ? body.contextSentence.trim()
      : "";
    const correctWordId = Number(body.correctWordId);

    if (!contextSentence) {
      throw new Error("Context sentence is required.");
    }
    if (!contextSentence.includes("___")) {
      throw new Error("Context sentence must contain `___` for the blank gap.");
    }
    if (isNaN(correctWordId)) {
      throw new Error("Correct answer word is required.");
    }

    return { type, data: { contextSentence, correctWordId, distractors } };
  }

  const wordId = Number(body.wordId);
  const definitionText = typeof body.definitionText === "string"
    ? body.definitionText.trim()
    : "";

  if (isNaN(wordId)) {
    throw new Error("Target word is required.");
  }
  if (!definitionText) {
    throw new Error("Definition text is required.");
  }

  return { type, data: { wordId, definitionText, distractors } };
}

function getChallengeById(
  loader: AdminChallengesLoader,
  type: ChallengeType,
  id: number,
) {
  if (type === "synonyms") return loader.getSynonym(id);
  if (type === "spelling") return loader.getSpelling(id);
  return loader.getDefinition(id);
}

function createChallenge(loader: AdminChallengesLoader, p: ChallengePayload) {
  if (p.type === "synonyms") return loader.createSynonym(p.data);
  if (p.type === "spelling") return loader.createSpelling(p.data);
  return loader.createDefinition(p.data);
}

function updateChallenge(
  loader: AdminChallengesLoader,
  id: number,
  p: ChallengePayload,
) {
  if (p.type === "synonyms") return loader.updateSynonym(id, p.data);
  if (p.type === "spelling") return loader.updateSpelling(id, p.data);
  return loader.updateDefinition(id, p.data);
}

/** Registers the challenges CRUD routes (synonyms/spelling/definitions). */
export function registerChallengesRoutes(
  route: Hono,
  challengesLoader: AdminChallengesLoader,
) {
  // GET /admin/challenges
  route.get("/challenges", async (context) => {
    const type = context.req.query("type") || "synonyms";
    if (!isChallengeType(type)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    try {
      const synonymsList = await challengesLoader.listSynonyms();
      const spellingList = await challengesLoader.listSpelling();
      const definitionsList = await challengesLoader.listDefinitions();
      const allWords = await challengesLoader.getAllWords();

      const wordsMap: Record<number, string> = {};
      for (const w of allWords) {
        wordsMap[w.id] = w.value;
      }

      return context.html(
        AdminChallengesPage({
          type,
          synonyms: synonymsList,
          spelling: spellingList,
          definitions: definitionsList,
          wordsMap,
          success: successMsg,
          error: errorMsg,
        }),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminChallengesPage({
          type,
          synonyms: [],
          spelling: [],
          definitions: [],
          wordsMap: {},
          error: "Failed to load challenges: " + errMsg,
        }),
      );
    }
  });

  // GET /admin/challenges/:challengeType/new
  route.get("/challenges/:challengeType/new", async (context) => {
    const challengeType = context.req.param("challengeType");
    if (!isChallengeType(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const allWords = await challengesLoader.getAllWords();
    return context.html(
      AdminChallengeEditPage({
        challengeType,
        words: allWords,
      }),
    );
  });

  // POST /admin/challenges/:challengeType/new
  route.post("/challenges/:challengeType/new", async (context) => {
    const challengeType = context.req.param("challengeType");
    if (!isChallengeType(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const body = await context.req.parseBody();
    const distractorsInput = typeof body.distractors === "string"
      ? body.distractors
      : "";

    const allWords = await challengesLoader.getAllWords();

    let distractorIds: number[];
    try {
      distractorIds = resolveDistractorIds(distractorsInput, allWords);
    } catch (err) {
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: body,
          distractorsString: distractorsInput,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    try {
      const payload = buildChallengePayload(
        challengeType,
        body,
        distractorIds,
      );
      await createChallenge(challengesLoader, payload);

      return context.redirect(
        `/admin/challenges?type=${challengeType}&success=` +
          encodeURIComponent("Challenge was successfully created."),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: body,
          distractorsString: distractorsInput,
          error: "Failed to create challenge: " + errMsg,
        }),
      );
    }
  });

  // GET /admin/challenges/:challengeType/:id/edit
  route.get("/challenges/:challengeType/:id/edit", async (context) => {
    const challengeType = context.req.param("challengeType");
    if (!isChallengeType(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Invalid ID."),
      );
    }

    const allWords = await challengesLoader.getAllWords();
    const wordsMap: Record<number, string> = {};
    for (const w of allWords) {
      wordsMap[w.id] = w.value;
    }

    const challenge = await getChallengeById(
      challengesLoader,
      challengeType,
      id,
    );

    if (!challenge) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Challenge not found."),
      );
    }

    const distractorsString = challenge.distractors.map((id: number) =>
      wordsMap[id] || `#${id}`
    ).join(", ");

    return context.html(
      AdminChallengeEditPage({
        challengeType,
        challenge,
        words: allWords,
        distractorsString,
      }),
    );
  });

  // POST /admin/challenges/:challengeType/:id/edit
  route.post("/challenges/:challengeType/:id/edit", async (context) => {
    const challengeType = context.req.param("challengeType");
    if (!isChallengeType(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Invalid ID."),
      );
    }

    const challenge = await getChallengeById(
      challengesLoader,
      challengeType,
      id,
    );

    if (!challenge) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Challenge not found."),
      );
    }

    const body = await context.req.parseBody();
    const distractorsInput = typeof body.distractors === "string"
      ? body.distractors
      : "";

    const allWords = await challengesLoader.getAllWords();

    let distractorIds: number[];
    try {
      distractorIds = resolveDistractorIds(distractorsInput, allWords);
    } catch (err) {
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: { id, ...body },
          distractorsString: distractorsInput,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    try {
      const payload = buildChallengePayload(
        challengeType,
        body,
        distractorIds,
      );
      await updateChallenge(challengesLoader, id, payload);

      return context.redirect(
        `/admin/challenges?type=${challengeType}&success=` +
          encodeURIComponent("Challenge was successfully updated."),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: { id, ...body },
          distractorsString: distractorsInput,
          error: "Failed to update challenge: " + errMsg,
        }),
      );
    }
  });

  // POST /admin/challenges/:challengeType/:id/delete
  route.post("/challenges/:challengeType/:id/delete", async (context) => {
    const challengeType = context.req.param("challengeType");
    if (!isChallengeType(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Invalid ID."),
      );
    }

    try {
      if (challengeType === "synonyms") {
        await challengesLoader.deleteSynonym(id);
      } else if (challengeType === "spelling") {
        await challengesLoader.deleteSpelling(id);
      } else {
        await challengesLoader.deleteDefinition(id);
      }
      return context.redirect(
        `/admin/challenges?type=${challengeType}&success=` +
          encodeURIComponent("Challenge was successfully deleted."),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Failed to delete challenge: " + errMsg),
      );
    }
  });
}
