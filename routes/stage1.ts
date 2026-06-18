import { Hono } from "@hono/hono";
import { sql } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { words } from "../db/schema.ts";
import {
  getKv,
  parseSessionId,
  saveWordSelection,
  sessionCookie,
} from "../session.ts";
import { WordGrid } from "../ui/word_grid.tsx";

export interface Stage1WordLoader {
  loadWords(count: number): Promise<{ id: number; value: string }[]>;
}

export interface Stage1SessionStore {
  saveWordSelection(sessionId: string, wordIds: number[]): Promise<void>;
}

const WORD_COUNT = 60;

export const databaseStage1WordLoader: Stage1WordLoader = {
  async loadWords(count) {
    const { client, db } = createDatabase();
    try {
      return await db
        .select({ id: words.id, value: words.value })
        .from(words)
        .orderBy(sql`random()`)
        .limit(count);
    } finally {
      await client.end();
    }
  },
};

export const kvStage1SessionStore: Stage1SessionStore = {
  async saveWordSelection(sessionId, wordIds) {
    const kv = await getKv();
    await saveWordSelection(kv, sessionId, wordIds);
  },
};

export function createStage1Route(
  loader: Stage1WordLoader = databaseStage1WordLoader,
  store: Stage1SessionStore = kvStage1SessionStore,
) {
  const route = new Hono();

  route.get("/", async (context) => {
    const wordList = await loader.loadWords(WORD_COUNT);
    return context.html(WordGrid({ words: wordList }));
  });

  route.post("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader) ?? crypto.randomUUID();

    const form = await context.req.formData();
    const wordIds = form.getAll("word").map((v) => Number(v));

    await store.saveWordSelection(sessionId, wordIds);

    context.header("Set-Cookie", sessionCookie(sessionId));
    return context.redirect("/stage/2", 302);
  });

  return route;
}
