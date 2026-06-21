import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { tickets } from "../db/schema.ts";
import type {
  Stage2SessionStore,
  Stage2TicketLoader,
} from "../routes/stage2.ts";

const mockTicket: typeof tickets.$inferSelect = {
  id: 42,
  code: "ELX-T-0042",
  status: "published",
  title: "Mock Ticket",
  notes: "Notes",
  questions: [
    { type: "verification", wordText: "apple", isReal: true },
    { type: "verification", wordText: "blurp", isReal: false },
    { type: "verification", wordText: "chair", isReal: true },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createLoader(): Stage2TicketLoader {
  return {
    getTicketById: (id) => {
      if (id === 42) return Promise.resolve(mockTicket);
      return Promise.resolve(null);
    },
  };
}

function createStore(
  wordIds: number[] = [0, 1, 2],
): Stage2SessionStore & {
  answers: Record<string, boolean>;
  savedResults: Array<{
    sessionId: string;
    result: { score: number; truthfulness: number };
    ticketId: number;
  }>;
} {
  const answers: Record<string, boolean> = {};
  const savedResults: Array<{
    sessionId: string;
    result: { score: number; truthfulness: number };
    ticketId: number;
  }> = [];
  return {
    answers,
    loadStage2Answers: () => Promise.resolve({ ...answers }),
    savedResults,
    loadWordSelection: () => Promise.resolve(wordIds),
    saveStage2Answer(_sessionId, wordId, known) {
      answers[String(wordId)] = known;
      return Promise.resolve();
    },
    saveStage2Result(sessionId, result, ticketId) {
      savedResults.push({ sessionId, result, ticketId });
      return Promise.resolve();
    },
    loadSessionTicketId: () => Promise.resolve(42),
  };
}

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 redirects to /stage/1 when no session cookie", async () => {
  const store = createStore();
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 redirects to /stage/1 when word selection is empty", async () => {
  const store = createStore([]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 returns HTML with the first verification card", async () => {
  const store = createStore([0, 1, 2]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "Stage 2: Verification");
  assertStringIncludes(body, "ELX-T-0042");
  assertStringIncludes(body, "Word 1 of 3");
  assertStringIncludes(body, 'class="verification-progress"');
  assertStringIncludes(body, 'value="1"');
  assertStringIncludes(body, 'max="3"');
  assertStringIncludes(body, "apple");
  assertEquals(body.includes("blurp"), false);
  assertEquals(body.includes("chair"), false);
  assertStringIncludes(body, "/static/htmx.min.js");
});

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 renders htmx Know/Don't know buttons", async () => {
  const store = createStore([0, 1, 2]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertStringIncludes(body, 'hx-post="/stage/2"');
  assertStringIncludes(body, 'hx-target="#stage2-card-shell"');
  assertStringIncludes(body, 'name="answer"');
  assertStringIncludes(body, 'value="know"');
  assertStringIncludes(body, 'value="dont_know"');
  assertStringIncludes(body, 'method="post"');
  assertStringIncludes(body, 'action="/stage/2"');
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 redirects to /stage/1 when no session cookie", async () => {
  const store = createStore();
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    method: "POST",
    body: new URLSearchParams(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 htmx request stores answer and returns next card", async () => {
  const store = createStore([0, 1, 2]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("wordId", "0");
  body.append("answer", "know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=test-session",
      "HX-Request": "true",
    },
  });
  const responseBody = await response.text();

  assertEquals(response.status, 200);
  assertEquals(store.answers["0"], true);
  assertStringIncludes(responseBody, "Word 2 of 3");
  assertStringIncludes(responseBody, "blurp");
  assertEquals(responseBody.includes("apple"), false);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 final htmx request stores result and sends HX redirect", async () => {
  const store = createStore([0, 1]);
  store.answers["0"] = true;
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("wordId", "1");
  body.append("answer", "dont_know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=test-session",
      "HX-Request": "true",
    },
  });

  assertEquals(response.status, 204);
  assertEquals(response.headers.get("HX-Redirect"), "/result");
  assertEquals(store.savedResults.length, 1);
  assertEquals(store.savedResults[0].result.score, 1);
  assertEquals(store.savedResults[0].result.truthfulness, 100);
  assertEquals(store.savedResults[0].ticketId, 42);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 computes score and redirects to /result", async () => {
  const store = createStore([0, 1, 2]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("word_0", "know");
  body.append("word_1", "dont_know");
  body.append("word_2", "know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/result");
  assertEquals(store.savedResults.length, 1);
  assertEquals(store.savedResults[0].sessionId, "test-session");
  assertEquals(store.savedResults[0].result.score, 2); // 2 real - 0 pseudo
  assertEquals(store.savedResults[0].result.truthfulness, 100);
  assertEquals(store.savedResults[0].ticketId, 42);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 applies pseudoword penalty when pseudoword is claimed", async () => {
  const store = createStore([0, 1, 2]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("word_0", "know");
  body.append("word_1", "know"); // pseudoword claimed
  body.append("word_2", "dont_know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(store.savedResults[0].result.score, 0); // 1 real - 1 pseudo
  assertEquals(store.savedResults[0].result.truthfulness, 50);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 sets session cookie in response", async () => {
  const store = createStore([0]);
  const app = createApp({
    stage2TicketLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    method: "POST",
    body: new URLSearchParams(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": "sessionId=my-session",
    },
  });

  assertStringIncludes(
    response.headers.get("set-cookie") ?? "",
    "sessionId=my-session",
  );
});
