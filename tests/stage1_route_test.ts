import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { tickets } from "../db/schema.ts";
import type {
  Stage1SessionStore,
  Stage1TicketLoader,
} from "../routes/stage1.ts";

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
  })),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createLoader(): Stage1TicketLoader {
  return {
    getTicketById: (id) => {
      if (id === 42) return Promise.resolve(mockTicket);
      return Promise.resolve(null);
    },
  };
}

function createStore(): Stage1SessionStore & {
  calls: Array<{ sessionId: string; wordIds: number[] }>;
  startedTicketId: number | null;
} {
  const calls: Array<{ sessionId: string; wordIds: number[] }> = [];
  return {
    calls,
    startedTicketId: null,
    saveWordSelection(sessionId, wordIds) {
      calls.push({ sessionId, wordIds });
      return Promise.resolve();
    },
    saveSessionTicketId(_sessionId, ticketId) {
      this.startedTicketId = ticketId;
      return Promise.resolve();
    },
    loadSessionTicketId(_sessionId) {
      return Promise.resolve(42);
    },
  };
}

Deno.test("VER-STAGE1-ROUTE: GET /stage/1 returns HTML with word grid", async () => {
  const app = createApp({
    stage1TicketLoader: createLoader(),
    stage1SessionStore: createStore(),
  });

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
  const app = createApp({
    stage1TicketLoader: createLoader(),
    stage1SessionStore: createStore(),
  });

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

Deno.test("VER-STAGE1-ROUTE: POST /stage/1/start initializes session with ticket id", async () => {
  const store = createStore();
  const app = createApp({
    stage1TicketLoader: createLoader(),
    stage1SessionStore: store,
  });

  const form = new URLSearchParams();
  form.append("ticketId", "42");

  const response = await app.request("/stage/1/start", {
    method: "POST",
    body: form.toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
  assertEquals(store.startedTicketId, 42);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 saves selection and redirects to /stage/2", async () => {
  const store = createStore();
  const app = createApp({
    stage1TicketLoader: createLoader(),
    stage1SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("word", "0");
  body.append("word", "2");
  body.append("word", "4");

  const response = await app.request("/stage/1", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=test-session-123",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/2");
  assertEquals(store.calls.length, 1);
  assertEquals(store.calls[0].sessionId, "test-session-123");
  assertEquals(store.calls[0].wordIds, [0, 2, 4]);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 handles empty selection (no words checked)", async () => {
  const store = createStore();
  const app = createApp({
    stage1TicketLoader: createLoader(),
    stage1SessionStore: store,
  });

  const response = await app.request("/stage/1", {
    method: "POST",
    body: new URLSearchParams(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=empty-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(store.calls[0].wordIds, []);
});
