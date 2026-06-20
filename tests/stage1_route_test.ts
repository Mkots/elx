import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { Stage1SessionStore, Stage1WordLoader } from "../routes/stage1.ts";

function makeWords(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: i % 2 === 0 ? `realword${i}` : `pseudoword${i}`,
  }));
}

function createLoader(
  words = makeWords(60),
): Stage1WordLoader {
  return {
    loadWords: () => Promise.resolve(words),
  };
}

function createStore(): Stage1SessionStore & {
  calls: Array<{ sessionId: string; wordIds: number[] }>;
} {
  const calls: Array<{ sessionId: string; wordIds: number[] }> = [];
  return {
    calls,
    saveWordSelection(sessionId, wordIds) {
      calls.push({ sessionId, wordIds });
      return Promise.resolve();
    },
  };
}

Deno.test("VER-STAGE1-ROUTE: GET /stage/1 returns HTML with word grid", async () => {
  const words = makeWords(60);
  const app = createApp({ stage1WordLoader: createLoader(words) });

  const response = await app.request("/stage/1");
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(
    response.headers.get("content-type") ?? "",
    "text/html",
  );
  assertStringIncludes(body, "Stage 1: Word Selection");
  assertStringIncludes(body, words[0].value);
  assertStringIncludes(body, words[59].value);
});

Deno.test("VER-STAGE1-ROUTE: GET /stage/1 renders a form that POSTs to /stage/1", async () => {
  const app = createApp({ stage1WordLoader: createLoader() });

  const response = await app.request("/stage/1");
  const body = await response.text();

  assertStringIncludes(body, 'method="post"');
  assertStringIncludes(body, 'action="/stage/1"');
  assertStringIncludes(body, 'type="checkbox"');
  assertStringIncludes(body, 'name="word"');
  assertStringIncludes(body, 'type="submit"');
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 saves selection and redirects to /stage/2", async () => {
  const store = createStore();
  const app = createApp({
    stage1WordLoader: createLoader(),
    stage1SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("word", "1");
  body.append("word", "3");
  body.append("word", "5");

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
  assertEquals(store.calls[0].wordIds, [1, 3, 5]);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 creates a new session cookie when none present", async () => {
  const store = createStore();
  const app = createApp({
    stage1WordLoader: createLoader(),
    stage1SessionStore: store,
  });

  const response = await app.request("/stage/1", {
    method: "POST",
    body: new URLSearchParams(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });

  assertEquals(response.status, 302);
  const cookie = response.headers.get("set-cookie") ?? "";
  assertStringIncludes(cookie, "sessionId=");
  assertStringIncludes(cookie, "HttpOnly");
  assertEquals(store.calls.length, 1);
  assertEquals(store.calls[0].wordIds, []);
});

Deno.test("VER-STAGE1-ROUTE: POST /stage/1 handles empty selection (no words checked)", async () => {
  const store = createStore();
  const app = createApp({
    stage1WordLoader: createLoader(),
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
