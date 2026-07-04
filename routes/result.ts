import { Hono } from "@hono/hono";
import { parseSessionId } from "../session.ts";
import { ResultPage } from "../ui/pages/ResultPage.tsx";
import type { Services } from "../db/services.ts";

export function createResultRoute(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const result = await services.sessions.loadStage2Result(sessionId);
    if (!result) return context.redirect("/stage/2", 302);

    return context.html(ResultPage(result));
  });

  return route;
}
