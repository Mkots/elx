import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "@hono/hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { testAnswers, testSessions, tickets } from "../db/schema.ts";
import {
  completeStage2Result,
  getSessionId,
  saveSessionTicketId,
  saveStage2Answer,
  saveWordSelection,
  setSessionCookie,
} from "../session.ts";

function populateEnv() {
  try {
    const text = Deno.readTextFileSync(".env");
    for (const line of text.split("\n")) {
      const parts = line.trim().split("=");
      if (parts.length >= 2 && !parts[0].startsWith("#")) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(
          /^["']|["']$/g,
          "",
        );
        if (key && !Deno.env.get(key)) {
          Deno.env.set(key, value);
        }
      }
    }
  } catch {
    // Ignore if .env is missing (e.g. in CI unit tests).
  }
}
populateEnv();

function buildTestApp() {
  const app = new Hono();
  app.get("/get", (context) => {
    return context.text(getSessionId(context) ?? "");
  });
  app.get("/set", (context) => {
    setSessionCookie(context, "test-id-42");
    return context.text("ok");
  });
  return app;
}

Deno.test("VER-SESSION-STATE: getSessionId extracts sessionId from a simple cookie header", async () => {
  const app = buildTestApp();
  const response = await app.request("/get", {
    headers: { cookie: "sessionId=abc-123" },
  });
  assertEquals(await response.text(), "abc-123");
});

Deno.test("VER-SESSION-STATE: getSessionId finds sessionId among multiple cookies", async () => {
  const app = buildTestApp();
  const response = await app.request("/get", {
    headers: { cookie: "foo=bar; sessionId=my-session; baz=qux" },
  });
  assertEquals(await response.text(), "my-session");
});

Deno.test("VER-SESSION-STATE: getSessionId returns empty when cookie header is absent", async () => {
  const app = buildTestApp();
  const response = await app.request("/get");
  assertEquals(await response.text(), "");
});

Deno.test("VER-SESSION-STATE: setSessionCookie sets an HttpOnly, Lax, non-Secure cookie by default", async () => {
  const app = buildTestApp();
  const response = await app.request("/set");
  const header = response.headers.get("set-cookie") ?? "";
  assertStringIncludes(header, "sessionId=test-id-42");
  assertStringIncludes(header, "HttpOnly");
  assertStringIncludes(header, "SameSite=Lax");
  assertEquals(header.includes("Secure"), false);
});

Deno.test("VER-SESSION-STATE: setSessionCookie adds Secure when APP_ENV=production", async () => {
  Deno.env.set("APP_ENV", "production");
  try {
    const app = buildTestApp();
    const response = await app.request("/set");
    const header = response.headers.get("set-cookie") ?? "";
    assertStringIncludes(header, "Secure");
  } finally {
    Deno.env.delete("APP_ENV");
  }
});

Deno.test({
  name:
    "VER-SESSION-STATE: completion score matches SQL recompute from test_answers",
  ignore: !Deno.env.get("DATABASE_URL"),
  async fn() {
    const sessionId = crypto.randomUUID();
    let ticketId = 0;

    try {
      const [ticket] = await db.insert(tickets).values({
        code: `ELX-SQL-${crypto.randomUUID().slice(0, 8)}`,
        status: "published",
        title: "SQL recompute fixture",
        questions: [
          { type: "verification", wordText: "apple", isReal: true },
          { type: "verification", wordText: "blorp", isReal: false },
          { type: "verification", wordText: "chair", isReal: true },
        ],
      }).returning();
      ticketId = ticket.id;

      await saveSessionTicketId(sessionId, ticketId);
      await saveWordSelection(sessionId, [0, 1, 2]);
      await saveStage2Answer(sessionId, 0, true);
      await saveStage2Answer(sessionId, 1, true);
      await saveStage2Answer(sessionId, 2, false);

      const result = await completeStage2Result(sessionId, [
        { id: 0, isReal: true },
        { id: 1, isReal: false },
        { id: 2, isReal: true },
      ]);

      const rowCount = await db.execute<{ count: number }>(sql`
        select count(*)::integer as count
        from ${testAnswers}
        where ${testAnswers.sessionId} = ${sessionId}
      `);
      assertEquals(rowCount[0].count, 6);

      const recomputed = await db.execute<
        { score: number; truthfulness: number }
      >(sql`
        with answer_facts as (
          select
            ${testAnswers.answer} as answer,
            ((${tickets.questions} -> ${testAnswers.questionIndex}) ->> 'isReal')::boolean as is_real
          from ${testAnswers}
          join ${testSessions}
            on ${testSessions.id} = ${testAnswers.sessionId}
          join ${tickets}
            on ${tickets.id} = ${testSessions.ticketId}
          where ${testAnswers.sessionId} = ${sessionId}
            and ${testAnswers.stage} = 2
        )
        select
          (
            count(*) filter (where is_real and answer = 'know')
            - count(*) filter (where not is_real and answer = 'know')
          )::integer as score,
          case
            when count(*) filter (where answer = 'know') = 0 then 100
            else round(
              (
                count(*) filter (where is_real and answer = 'know')
              )::numeric
              / (count(*) filter (where answer = 'know'))::numeric
              * 100
            )::integer
          end as truthfulness
        from answer_facts
      `);

      assertEquals(result, recomputed[0]);
    } finally {
      await db.delete(testSessions).where(eq(testSessions.id, sessionId));
      if (ticketId > 0) {
        await db.delete(tickets).where(eq(tickets.id, ticketId));
      }
    }
  },
});
