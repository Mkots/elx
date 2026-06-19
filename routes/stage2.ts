import { Hono } from "@hono/hono";
import { inArray } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { words } from "../db/schema.ts";
import { computeScore } from "../scoring/lextale.ts";
import {
  getKv,
  loadWordSelection,
  parseSessionId,
  saveStage2Result,
  sessionCookie,
} from "../session.ts";
import { Stage2Page } from "../ui/pages/Stage2Page.tsx";

export interface Stage2WordLoader {
  loadWords(
    ids: number[],
  ): Promise<{ id: number; value: string; isReal: boolean }[]>;
}

export interface Stage2SessionStore {
  loadWordSelection(sessionId: string): Promise<number[]>;
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
  async loadWordSelection(sessionId) {
    const kv = await getKv();
    return loadWordSelection(kv, sessionId);
  },
  async saveStage2Result(sessionId, result) {
    const kv = await getKv();
    await saveStage2Result(kv, sessionId, result);
  },
};

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

    const wordList = await loader.loadWords(wordIds);
    return context.html(Stage2Page({ words: wordList }));
  });

  route.post("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const wordIds = await store.loadWordSelection(sessionId);
    const wordList = await loader.loadWords(wordIds);

    const form = await context.req.formData();
    const answers = wordList.map((word) => ({
      isReal: word.isReal,
      known: form.get(`word_${word.id}`) === "know",
    }));

    const result = computeScore(answers);
    await store.saveStage2Result(sessionId, result);

    context.header("Set-Cookie", sessionCookie(sessionId));
    return context.redirect("/result", 302);
  });

  return route;
}
