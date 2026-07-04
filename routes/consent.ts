import { Hono } from "@hono/hono";
import { analyticsProps } from "../analytics.ts";
import type { Services } from "../db/services.ts";
import { ConsentPage } from "../ui/pages/ConsentPage.tsx";
import { requireTestSession } from "./test_session.ts";

export function createConsentRoute(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/",
      requireTicket: true,
    });
    if (session instanceof Response) return session;
    const { sessionId, ticket } = session;

    const consentedAt = await services.sessions.loadConsentTimestamp(
      sessionId,
    );
    if (consentedAt) return context.redirect("/stage/1", 302);

    return context.html(
      ConsentPage({
        analytics: analyticsProps(context),
        ticketCode: ticket.code,
      }),
    );
  });

  route.post("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/",
      requireTicket: true,
    });
    if (session instanceof Response) return session;
    const { sessionId, ticket } = session;

    const form = await context.req.formData();
    if (form.get("accept") !== "yes") {
      return context.html(
        ConsentPage({
          analytics: analyticsProps(context),
          error: "Consent is required before the assessment can start.",
          ticketCode: ticket.code,
        }),
        400,
      );
    }

    await services.sessions.saveConsentTimestamp(sessionId);
    return context.redirect(
      "/stage/1?event=consent_granted,test_started",
      302,
    );
  });

  return route;
}
