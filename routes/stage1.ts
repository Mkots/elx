import { Hono } from "@hono/hono";
import type { VerificationSnapshotQuestion } from "../db/schema.ts";
import { setSessionCookie } from "../session.ts";
import { Stage1Page } from "../ui/pages/Stage1Page.tsx";
import type { Services } from "../db/services.ts";
import { requireTestSession } from "./test_session.ts";

export function createStage1Route(services: Services) {
  const route = new Hono();

  route.post("/start", async (context) => {
    const form = await context.req.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!ticketId) return context.redirect("/", 302);

    const sessionId = crypto.randomUUID();
    await services.sessions.saveSessionTicketId(sessionId, ticketId);
    await services.sessions.saveWordSelection(sessionId, []);

    setSessionCookie(context, sessionId);
    return context.redirect("/stage/1", 302);
  });

  route.get("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/",
      requireTicket: true,
    });
    if (session instanceof Response) return session;
    const { ticket } = session;

    const verificationWords = ticket.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.type === "verification")
      .map(({ q, idx }) => ({
        id: idx,
        value: (q as VerificationSnapshotQuestion).wordText,
      }));

    return context.html(
      Stage1Page({
        words: verificationWords,
        ticketCode: ticket.code,
      }),
    );
  });

  route.post("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/",
    });
    if (session instanceof Response) return session;
    const { sessionId } = session;

    const form = await context.req.formData();
    const wordIds = form.getAll("word").map((v) => Number(v));

    await services.sessions.saveWordSelection(sessionId, wordIds);

    setSessionCookie(context, sessionId);
    return context.redirect("/stage/2", 302);
  });

  return route;
}
