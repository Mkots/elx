import { Hono } from "@hono/hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { tickets } from "../db/schema.ts";
import type { VerificationSnapshotQuestion } from "../db/schema.ts";
import {
  getKv,
  loadSessionTicketId,
  parseSessionId,
  saveSessionTicketId,
  saveWordSelection,
  sessionCookie,
} from "../session.ts";
import { Stage1Page } from "../ui/pages/Stage1Page.tsx";

export interface Stage1TicketLoader {
  getTicketById(id: number): Promise<typeof tickets.$inferSelect | null>;
}

export interface Stage1SessionStore {
  saveWordSelection(sessionId: string, wordIds: number[]): Promise<void>;
  saveSessionTicketId(sessionId: string, ticketId: number): Promise<void>;
  loadSessionTicketId(sessionId: string): Promise<number | null>;
}

export const databaseStage1TicketLoader: Stage1TicketLoader = {
  async getTicketById(id) {
    const result = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);
    return result[0] || null;
  },
};

export const kvStage1SessionStore: Stage1SessionStore = {
  async saveWordSelection(sessionId, wordIds) {
    const kv = await getKv();
    await saveWordSelection(kv, sessionId, wordIds);
  },
  async saveSessionTicketId(sessionId, ticketId) {
    const kv = await getKv();
    await saveSessionTicketId(kv, sessionId, ticketId);
  },
  async loadSessionTicketId(sessionId) {
    const kv = await getKv();
    return await loadSessionTicketId(kv, sessionId);
  },
};

export function createStage1Route(
  loader: Stage1TicketLoader = databaseStage1TicketLoader,
  store: Stage1SessionStore = kvStage1SessionStore,
) {
  const route = new Hono();

  // Route to initialize session with selected ticket
  route.post("/start", async (context) => {
    const form = await context.req.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!ticketId) return context.redirect("/", 302);

    const sessionId = crypto.randomUUID();
    await store.saveSessionTicketId(sessionId, ticketId);
    await store.saveWordSelection(sessionId, []);

    context.header("Set-Cookie", sessionCookie(sessionId));
    return context.redirect("/stage/1", 302);
  });

  route.get("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/", 302);

    const ticketId = await store.loadSessionTicketId(sessionId);
    if (!ticketId) return context.redirect("/", 302);

    const ticket = await loader.getTicketById(ticketId);
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
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/", 302);

    const form = await context.req.formData();
    const wordIds = form.getAll("word").map((v) => Number(v));

    await store.saveWordSelection(sessionId, wordIds);

    context.header("Set-Cookie", sessionCookie(sessionId));
    return context.redirect("/stage/2", 302);
  });

  return route;
}
