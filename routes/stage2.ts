import { Hono } from "@hono/hono";
import { inArray } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { words } from "../db/schema.ts";
import { computeScore } from "../scoring/lextale.ts";
import {
  getKv,
  loadStage2Answers,
  loadWordSelection,
  parseSessionId,
  saveStage2Answer,
  saveStage2Result,
  sessionCookie,
  type Stage2Answers,
} from "../session.ts";
import { Stage2Card, Stage2Page } from "../ui/pages/Stage2Page.tsx";

export interface Stage2WordLoader {
  loadWords(
    ids: number[],
  ): Promise<{ id: number; value: string; isReal: boolean }[]>;
}

export interface Stage2SessionStore {
  loadStage2Answers(sessionId: string): Promise<Stage2Answers>;
  loadWordSelection(sessionId: string): Promise<number[]>;
  saveStage2Answer(
    sessionId: string,
    wordId: number,
    known: boolean,
  ): Promise<void>;
  saveStage2Result(
    sessionId: string,
    result: { score: number; truthfulness: number },
  ): Promise<void>;
}

export const databaseStage2WordLoader: Stage2WordLoader = {
  async loadWords(ids) {
    if (ids.length === 0) return [];
    const { client, db } = createDatabase();
    try {
      return await db
        .select({ id: words.id, value: words.value, isReal: words.isReal })
        .from(words)
        .where(inArray(words.id, ids));
    } finally {
      await client.end();
    }
  },
};

export const kvStage2SessionStore: Stage2SessionStore = {
  async loadStage2Answers(sessionId) {
    const kv = await getKv();
    return loadStage2Answers(kv, sessionId);
  },
  async loadWordSelection(sessionId) {
    const kv = await getKv();
    return loadWordSelection(kv, sessionId);
  },
  async saveStage2Answer(sessionId, wordId, known) {
    const kv = await getKv();
    await saveStage2Answer(kv, sessionId, wordId, known);
  },
  async saveStage2Result(sessionId, result) {
    const kv = await getKv();
    await saveStage2Result(kv, sessionId, result);
  },
};

type Stage2Word = { id: number; value: string; isReal: boolean };

function orderWordsBySelection(wordList: Stage2Word[], wordIds: number[]) {
  const order = new Map(wordIds.map((id, index) => [id, index]));
  return [...wordList].sort((a, b) =>
    (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

function getNextWordIndex(wordList: Stage2Word[], answers: Stage2Answers) {
  return wordList.findIndex((word) => answers[String(word.id)] === undefined);
}

function computeStage2Result(
  wordList: Stage2Word[],
  answers: Stage2Answers,
) {
  return computeScore(
    wordList.map((word) => ({
      isReal: word.isReal,
      known: answers[String(word.id)] === true,
    })),
  );
}

function isHtmxRequest(request: Request) {
  return request.headers.get("HX-Request") === "true";
}

export function createStage2Route(
  loader: Stage2WordLoader = databaseStage2WordLoader,
  store: Stage2SessionStore = kvStage2SessionStore,
) {
  const route = new Hono();

  route.get("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const wordIds = await store.loadWordSelection(sessionId);
    if (wordIds.length === 0) return context.redirect("/stage/1", 302);

    const wordList = orderWordsBySelection(
      await loader.loadWords(wordIds),
      wordIds,
    );
    const answers = await store.loadStage2Answers(sessionId);
    const currentIndex = getNextWordIndex(wordList, answers);

    if (currentIndex === -1) {
      const result = computeStage2Result(wordList, answers);
      await store.saveStage2Result(sessionId, result);
      context.header("Set-Cookie", sessionCookie(sessionId));
      return context.redirect("/result", 302);
    }

    return context.html(
      Stage2Page({
        currentIndex,
        totalWords: wordList.length,
        word: wordList[currentIndex],
      }),
    );
  });

  route.post("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const wordIds = await store.loadWordSelection(sessionId);
    if (wordIds.length === 0) return context.redirect("/stage/1", 302);

    const wordList = orderWordsBySelection(
      await loader.loadWords(wordIds),
      wordIds,
    );

    const form = await context.req.formData();
    const submittedWordId = Number(form.get("wordId"));
    const submittedAnswer = form.get("answer");

    if (!submittedWordId && submittedAnswer === null) {
      const answers = Object.fromEntries(
        wordList.map((word) => [
          String(word.id),
          form.get(`word_${word.id}`) === "know",
        ]),
      );
      const result = computeStage2Result(wordList, answers);
      await store.saveStage2Result(sessionId, result);

      context.header("Set-Cookie", sessionCookie(sessionId));
      return context.redirect("/result", 302);
    }

    const word = wordList.find((item) => item.id === submittedWordId);
    if (
      !word || (submittedAnswer !== "know" && submittedAnswer !== "dont_know")
    ) {
      return context.text("Invalid Stage 2 answer", 400);
    }

    await store.saveStage2Answer(
      sessionId,
      submittedWordId,
      submittedAnswer === "know",
    );

    const answers = {
      ...await store.loadStage2Answers(sessionId),
      [String(submittedWordId)]: submittedAnswer === "know",
    };
    const currentIndex = getNextWordIndex(wordList, answers);

    context.header("Set-Cookie", sessionCookie(sessionId));

    if (currentIndex === -1) {
      const result = computeStage2Result(wordList, answers);
      await store.saveStage2Result(sessionId, result);

      if (isHtmxRequest(context.req.raw)) {
        context.header("HX-Redirect", "/result");
        return context.body(null, 204);
      }

      return context.redirect("/result", 302);
    }

    if (isHtmxRequest(context.req.raw)) {
      return context.html(
        Stage2Card({
          currentIndex,
          totalWords: wordList.length,
          word: wordList[currentIndex],
        }),
      );
    }

    return context.redirect("/stage/2", 302);
  });

  return route;
}
