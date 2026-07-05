import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { tickets } from "../db/schema.ts";
import { defaultServices, type Services } from "../db/services.ts";

const mockTicket: typeof tickets.$inferSelect = {
  id: 42,
  code: "ELX-T-0042",
  status: "published",
  title: "Mock Ticket",
  notes: "Notes",
  questions: Array.from({ length: 60 }, (_, i) => ({
    type: "verification" as const,
    wordText: i % 2 === 0 ? `realword${i}` : `pseudoword${i}`,
    isReal: i % 2 === 0,
    difficulty: 1,
  })),
  createdAt: new Date(),
  updatedAt: new Date(),
};

type SessionStore = Services["sessions"];

function makeServices(
  sessionOverrides: Partial<SessionStore> & {
    calls?: Array<{ sessionId: string; wordIds: number[] }>;
    startedTicketId?: number | null;
  } = {},
): Services & { store: typeof sessionOverrides } {
  const calls: Array<{ sessionId: string; wordIds: number[] }> = [];
  let startedTicketId: number | null = null;

  const sessions: SessionStore = {
    ...defaultServices.sessions,
    saveWordSelection(sessionId, wordIds) {
      calls.push({ sessionId, wordIds });
      return Promise.resolve();
    },
    saveSessionTicketId(_sessionId, ticketId) {
      startedTicketId = ticketId;
      return Promise.resolve();
    },
    loadSessionTicketId(_sessionId) {
      return Promise.resolve(42);
    },
    loadConsentTimestamp() {
      return Promise.resolve(new Date("2026-07-05T12:00:00Z"));
    },
    ...sessionOverrides,
  };

  const store = { calls, startedTicketId, ...sessionOverrides };

  const services: Services = {
    ...defaultServices,
    tickets: {
      ...defaultServices.tickets,
      getTicketById: (id) => {
        if (id === 42) return Promise.resolve(mockTicket);
        return Promise.resolve(null);
      },
      getPublishedTickets: () => Promise.resolve([]),
    },
    sessions,
  };

  return Object.assign(services, { store: store as typeof sessionOverrides });
}

Deno.test("VER-STAGE1-ROUTE: GET /stage/1 returns HTML with word grid", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/1", {
    headers: { "cookie": "sessionId=test-session-123" },
  });
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(
    response.headers.get("content-type") ?? "",
    "text/html",
  );
  assertStringIncludes(body, "Stage 1: Word Selection");
  assertStringIncludes(body, "ELX-T-0042");
  assertStringIncludes(body, "realword0");
  assertStringIncludes(body, "pseudoword59");
});

Deno.test("VER-STAGE1-ROUTE: GET /stage/1 renders a form that POSTs to /stage/1", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/1", {
    headers: { "cookie": "sessionId=test-session-123" },
  });
  const body = await response.text();

  assertStringIncludes(body, 'method="post"');
  assertStringIncludes(body, 'action="/stage/1"');
  assertStringIncludes(body, 'type="checkbox"');
  assertStringIncludes(body, 'name="word"');
  assertStringIncludes(body, 'type="submit"');
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1/start redirects to consent without accepted consent", async () => {
  let startedTicketId: number | null = null;
  const services = makeServices({
    loadConsentTimestamp() {
      return Promise.resolve(null);
    },
    saveSessionTicketId(_sessionId, ticketId) {
      startedTicketId = ticketId;
      return Promise.resolve();
    },
  });
  const app = createApp(services);

  const form = new URLSearchParams();
  form.append("ticketId", "42");

  const response = await app.request("/stage/1/start", {
    method: "POST",
    body: form.toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/consent");
  assertEquals(startedTicketId, 42);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1/start initializes consented session", async () => {
  let startedTicketId: number | null = null;
  const services = makeServices({
    saveSessionTicketId(_sessionId, ticketId) {
      startedTicketId = ticketId;
      return Promise.resolve();
    },
  });
  const app = createApp(services);

  const form = new URLSearchParams();
  form.append("ticketId", "42");

  const response = await app.request("/stage/1/start", {
    method: "POST",
    body: form.toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session-123",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1?event=test_started");
  assertEquals(startedTicketId, 42);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 saves selection and redirects to /stage/2", async () => {
  const calls: Array<{ sessionId: string; wordIds: number[] }> = [];
  const services = makeServices({
    saveWordSelection(sessionId, wordIds) {
      calls.push({ sessionId, wordIds });
      return Promise.resolve();
    },
  });
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("word", "0");
  body.append("word", "2");
  body.append("word", "4");

  const response = await app.request("/stage/1", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session-123",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(
    response.headers.get("location"),
    "/stage/2?event=stage1_submitted&selected=3",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].sessionId, "test-session-123");
  assertEquals(calls[0].wordIds, [0, 2, 4]);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 handles empty selection (no words checked)", async () => {
  const calls: Array<{ sessionId: string; wordIds: number[] }> = [];
  const services = makeServices({
    saveWordSelection(sessionId, wordIds) {
      calls.push({ sessionId, wordIds });
      return Promise.resolve();
    },
  });
  const app = createApp(services);

  const response = await app.request("/stage/1", {
    method: "POST",
    body: new URLSearchParams(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=empty-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(
    response.headers.get("location"),
    "/stage/2?event=stage1_submitted&selected=0",
  );
  assertEquals(calls[0].wordIds, []);
});
