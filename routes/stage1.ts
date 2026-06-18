import { Hono } from "@hono/hono";
import { sql } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { words } from "../db/schema.ts";
import { WordGrid } from "../ui/word_grid.tsx";

export interface Stage1WordLoader {
  loadWords(count: number): Promise<{ id: number; value: string }[]>;
}

export interface Stage1SessionStore {
  saveWordSelection(sessionId: string, wordIds: number[]): Promise<void>;
}

const WORD_COUNT = 60;
const SESSION_COOKIE = "sessionId";

let kvInstance: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    kvInstance = await Deno.openKv();
  }
  return kvInstance;
}

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
    await kv.set(["session", sessionId, "stage1_selections"], wordIds);
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
    let sessionId = context.req.raw.headers.get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const form = await context.req.formData();
    const wordIds = form.getAll("word").map((v) => Number(v));

    await store.saveWordSelection(sessionId, wordIds);

    context.header(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; SameSite=Lax`,
    );
    return context.redirect("/stage/2", 302);
  });

  return route;
}
