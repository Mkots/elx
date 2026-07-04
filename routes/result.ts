import { Hono } from "@hono/hono";
import { ResultPage } from "../ui/pages/ResultPage.tsx";
import type { Services } from "../db/services.ts";
import { requireTestSession } from "./test_session.ts";

export function createResultRoute(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/stage/1",
    });
    if (session instanceof Response) return session;
    const { sessionId } = session;

    const result = await services.sessions.loadStage2Result(sessionId);
    if (!result) return context.redirect("/stage/2", 302);

    return context.html(ResultPage(result));
  });

  return route;
}
