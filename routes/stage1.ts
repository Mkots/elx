import { Hono } from "@hono/hono";
import type { VerificationSnapshotQuestion } from "../db/schema.ts";
import { getSessionId, setSessionCookie } from "../session.ts";
import { Stage1Page } from "../ui/pages/Stage1Page.tsx";
import type { Services } from "../db/services.ts";

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
    const sessionId = getSessionId(context);

    if (!sessionId) return context.redirect("/", 302);

    const ticketId = await services.sessions.loadSessionTicketId(sessionId);
    if (!ticketId) return context.redirect("/", 302);

    const ticket = await services.tickets.getTicketById(ticketId);
    if (!ticket) return context.redirect("/", 302);

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
    const sessionId = getSessionId(context);

    if (!sessionId) return context.redirect("/", 302);

    const form = await context.req.formData();
    const wordIds = form.getAll("word").map((v) => Number(v));

    await services.sessions.saveWordSelection(sessionId, wordIds);

    setSessionCookie(context, sessionId);
    return context.redirect("/stage/2", 302);
  });

  return route;
}
