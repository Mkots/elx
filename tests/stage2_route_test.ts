import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { Stage2SessionStore, Stage2WordLoader } from "../routes/stage2.ts";

type Word = { id: number; value: string; isReal: boolean };

function makeWords(): Word[] {
  return [
    { id: 1, value: "apple", isReal: true },
    { id: 2, value: "blurp", isReal: false },
    { id: 3, value: "chair", isReal: true },
  ];
}

function createLoader(wordList = makeWords()): Stage2WordLoader {
  return {
    loadWords: (_ids) => Promise.resolve(wordList),
  };
}

function createStore(
  wordIds: number[] = [1, 2, 3],
): Stage2SessionStore & {
  savedResults: Array<
    { sessionId: string; result: { score: number; truthfulness: number } }
  >;
} {
  const savedResults: Array<
    { sessionId: string; result: { score: number; truthfulness: number } }
  > = [];
  return {
    savedResults,
    loadWordSelection: () => Promise.resolve(wordIds),
    saveStage2Result(sessionId, result) {
      savedResults.push({ sessionId, result });
      return Promise.resolve();
    },
  };
}

Deno.test("GET /stage/2 redirects to /stage/1 when no session cookie", async () => {
  const store = createStore();
  const app = createApp({
    stage2WordLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("GET /stage/2 redirects to /stage/1 when word selection is empty", async () => {
  const store = createStore([]);
  const app = createApp({
    stage2WordLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("GET /stage/2 returns HTML with verification cards", async () => {
  const words = makeWords();
  const store = createStore([1, 2, 3]);
  const app = createApp({
    stage2WordLoader: createLoader(words),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "Stage 2: Verification");
  assertStringIncludes(body, "apple");
  assertStringIncludes(body, "blurp");
  assertStringIncludes(body, "chair");
});

Deno.test("GET /stage/2 renders Know/Don't Know radio buttons", async () => {
  const store = createStore([1, 2, 3]);
  const app = createApp({
    stage2WordLoader: createLoader(),
    stage2SessionStore: store,
  });

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertStringIncludes(body, 'type="radio"');
  assertStringIncludes(body, 'value="know"');
  assertStringIncludes(body, 'value="dont_know"');
  assertStringIncludes(body, 'method="post"');
  assertStringIncludes(body, 'action="/stage/2"');
});

Deno.test("POST /stage/2 redirects to /stage/1 when no session cookie", async () => {
  const store = createStore();
  const app = createApp({
    stage2WordLoader: createLoader(),
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

Deno.test("POST /stage/2 computes score and redirects to /result", async () => {
  const store = createStore([1, 2, 3]);
  const words = makeWords();
  const app = createApp({
    stage2WordLoader: createLoader(words),
    stage2SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("word_1", "know");
  body.append("word_2", "dont_know");
  body.append("word_3", "know");

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
  assertEquals(store.savedResults[0].result.score, 2); // 2 real - 0 pseudo (blurp not known)
  assertEquals(store.savedResults[0].result.truthfulness, 100);
});

Deno.test("POST /stage/2 applies pseudoword penalty when pseudoword is claimed", async () => {
  const store = createStore([1, 2, 3]);
  const words = makeWords();
  const app = createApp({
    stage2WordLoader: createLoader(words),
    stage2SessionStore: store,
  });

  const body = new URLSearchParams();
  body.append("word_1", "know");
  body.append("word_2", "know"); // pseudoword claimed
  body.append("word_3", "dont_know");

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

Deno.test("POST /stage/2 sets session cookie in response", async () => {
  const store = createStore([1]);
  const app = createApp({
    stage2WordLoader: createLoader([{ id: 1, value: "word", isReal: true }]),
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
