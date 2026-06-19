import { Hono } from "@hono/hono";
import {
  getKv,
  loadStage2Result,
  parseSessionId,
  type Stage2Result,
} from "../session.ts";
import { ResultPage } from "../ui/pages/ResultPage.tsx";

export interface ResultSessionStore {
  loadStage2Result(sessionId: string): Promise<Stage2Result | null>;
}

export const kvResultSessionStore: ResultSessionStore = {
  async loadStage2Result(sessionId) {
    const kv = await getKv();
    return loadStage2Result(kv, sessionId);
  },
};

export function createResultRoute(
  store: ResultSessionStore = kvResultSessionStore,
) {
  const route = new Hono();

  route.get("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const result = await store.loadStage2Result(sessionId);
    if (!result) return context.redirect("/stage/2", 302);

    return context.html(ResultPage(result));
  });

  return route;
}
