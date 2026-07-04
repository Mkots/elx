import { Hono } from "@hono/hono";
import { analyticsEvent, analyticsProps } from "../analytics.ts";
import type { VerificationSnapshotQuestion } from "../db/schema.ts";
import { getSessionId, setSessionCookie } from "../session.ts";
import { Stage1Page } from "../ui/pages/Stage1Page.tsx";
import type { Services } from "../db/services.ts";
import { requireTestSession } from "./test_session.ts";

export function createStage1Route(services: Services) {
  const route = new Hono();

  route.post("/start", async (context) => {
    const form = await context.req.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!ticketId) return context.redirect("/", 302);

    const sessionId = getSessionId(context) ?? crypto.randomUUID();
    await services.sessions.saveSessionTicketId(sessionId, ticketId);

    setSessionCookie(context, sessionId);

    const consentedAt = await services.sessions.loadConsentTimestamp(
      sessionId,
    );
    if (!consentedAt) return context.redirect("/consent", 302);

    await services.sessions.saveWordSelection(sessionId, []);
    return context.redirect("/stage/1?event=test_started", 302);
  });

  route.get("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/",
      requireTicket: true,
      requireConsent: true,
    });
    if (session instanceof Response) return session;
    const { sessionId, ticket } = session;

    const events = (context.req.query("event") ?? "")
      .split(",")
      .filter((event) =>
        event === "consent_granted" || event === "test_started"
      )
      .map((event) => analyticsEvent(event, sessionId, ticket.code));

    const verificationWords = ticket.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.type === "verification")
      .map(({ q, idx }) => ({
        id: idx,
        value: (q as VerificationSnapshotQuestion).wordText,
      }));

    return context.html(
      Stage1Page({
        analytics: analyticsProps(context, {
          consentGranted: true,
          events,
        }),
        words: verificationWords,
        ticketCode: ticket.code,
      }),
    );
  });

  route.post("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/",
      requireConsent: true,
    });
    if (session instanceof Response) return session;
    const { sessionId } = session;

    const form = await context.req.formData();
    const wordIds = form.getAll("word").map((v) => Number(v));

    await services.sessions.saveWordSelection(sessionId, wordIds);

    setSessionCookie(context, sessionId);
    return context.redirect(
      `/stage/2?event=stage1_submitted&selected=${wordIds.length}`,
      302,
    );
  });

  return route;
}
