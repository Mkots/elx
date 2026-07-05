import { Hono } from "@hono/hono";
import { analyticsEvent, analyticsProps } from "../analytics.ts";
import { ResultPage } from "../ui/pages/ResultPage.tsx";
import type { Services } from "../db/services.ts";
import { requireTestSession } from "./test_session.ts";
import { getCEFRLevel } from "../scoring/lextale.ts";

export function createResultRoute(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/stage/1",
      requireConsent: true,
      requireTicket: true,
    });
    if (session instanceof Response) return session;
    const { sessionId, ticket } = session;

    const result = await services.sessions.loadStage2Result(sessionId);
    if (!result) return context.redirect("/stage/2", 302);

    const { score, truthfulness, vocabularySize } = result;
    const cefrLevel = typeof vocabularySize === "number"
      ? getCEFRLevel(vocabularySize)
      : undefined;

    return context.html(
      ResultPage({
        score,
        truthfulness,
        vocabularySize,
        cefrLevel,
        analytics: analyticsProps(context, {
          consentGranted: true,
          events: [
            analyticsEvent("test_completed", sessionId, ticket.code, {
              score,
              truthfulness,
            }),
          ],
        }),
      }),
    );
  });

  return route;
}
