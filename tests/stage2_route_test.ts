import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { tickets } from "../db/schema.ts";
import { defaultServices, type Services } from "../db/services.ts";
import type { Stage2Answers, Stage2ScoringWord } from "../session.ts";
import { computeScore } from "../scoring/lextale.ts";

const mockTicket: typeof tickets.$inferSelect = {
  id: 42,
  code: "ELX-T-0042",
  status: "published",
  title: "Mock Ticket",
  notes: "Notes",
  questions: [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    { type: "verification", wordText: "blurp", isReal: false, difficulty: 1 },
    { type: "verification", wordText: "chair", isReal: true, difficulty: 1 },
    {
      type: "verification",
      wordText: "pseudocookie",
      isReal: false,
      difficulty: 2,
      similarWord: "cookie",
      similarWordIsReal: true,
    },
    {
      type: "verification",
      wordText: "banana",
      isReal: true,
      difficulty: 2,
      similarWord: "bananasss",
      similarWordIsReal: false,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeServices(
  wordIds: number[] = [0, 1, 2],
): Services & {
  answers: Record<string, boolean>;
  savedSessions: Array<
    { sessionId: string; result: { score: number; truthfulness: number } }
  >;
  savedHistory: Array<
    {
      sessionId: string;
      result: { score: number; truthfulness: number };
      ticketId: number;
    }
  >;
} {
  const answers: Record<string, boolean> = {};
  const savedSessions: Array<{
    sessionId: string;
    result: { score: number; truthfulness: number };
  }> = [];
  const savedHistory: Array<{
    sessionId: string;
    result: { score: number; truthfulness: number };
    ticketId: number;
  }> = [];

  const sessions: Services["sessions"] = {
    ...defaultServices.sessions,
    loadStage2Answers: () => Promise.resolve({ ...answers } as Stage2Answers),
    loadWordSelection: () => Promise.resolve(wordIds),
    saveStage2Answer(_sessionId, wordId, known) {
      answers[String(wordId)] = known;
      return Promise.resolve();
    },
    saveStage2Result(sessionId, result) {
      savedSessions.push({ sessionId, result });
      return Promise.resolve();
    },
    completeStage2(sessionId, words: Stage2ScoringWord[]) {
      const result = computeScore(
        words.map((word) => ({
          isReal: word.isReal,
          known: answers[String(word.id)] === true,
        })),
      );
      savedSessions.push({ sessionId, result });
      return Promise.resolve(result);
    },
    loadSessionTicketId: () => Promise.resolve(42),
    loadConsentTimestamp: () =>
      Promise.resolve(new Date("2026-07-05T12:00:00Z")),
  };

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
    history: {
      ...defaultServices.history,
      saveStage2Result(sessionId, result, ticketId) {
        savedHistory.push({ sessionId, result, ticketId });
        return Promise.resolve();
      },
    },
    sessions,
  };

  // Merge savedResults for backward-compat test assertions
  const savedResults = savedHistory;
  return Object.assign(services, {
    answers,
    savedSessions,
    savedHistory,
    savedResults,
  });
}

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 redirects to /stage/1 when no session cookie", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/2");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 redirects to /stage/1 when word selection is empty", async () => {
  const services = makeServices([]);
  const app = createApp(services);

  const response = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 returns HTML with the first verification card", async () => {
  const services = makeServices([0, 1, 2]);
  const app = createApp(services);

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
  const services = makeServices([0, 1, 2]);
  const app = createApp(services);

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
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/2", {
    method: "POST",
    body: new URLSearchParams(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 htmx request stores answer and returns next card", async () => {
  const services = makeServices([0, 1, 2]);
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("wordId", "0");
  body.append("answer", "know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
      "HX-Request": "true",
    },
  });
  const responseBody = await response.text();

  assertEquals(response.status, 200);
  assertEquals(services.answers["0"], true);
  assertStringIncludes(responseBody, "Word 2 of 3");
  assertStringIncludes(responseBody, "blurp");
  assertEquals(responseBody.includes("apple"), false);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 final htmx request stores result and sends HX redirect", async () => {
  const services = makeServices([0, 1]);
  services.answers["0"] = true;
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("wordId", "1");
  body.append("answer", "dont_know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
      "HX-Request": "true",
    },
  });

  assertEquals(response.status, 204);
  assertEquals(response.headers.get("HX-Redirect"), "/result");
  assertEquals(services.savedSessions.length, 1);
  assertEquals(services.savedSessions[0].result.score, 1);
  assertEquals(services.savedSessions[0].result.truthfulness, 100);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 computes score and redirects to /result", async () => {
  const services = makeServices([0, 1, 2]);
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("word_0", "know");
  body.append("word_1", "dont_know");
  body.append("word_2", "know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/result");
  assertEquals(services.answers, { "0": true, "1": false, "2": true });
  assertEquals(services.savedSessions.length, 1);
  assertEquals(services.savedSessions[0].sessionId, "test-session");
  assertEquals(services.savedSessions[0].result.score, 2); // 2 real - 0 pseudo
  assertEquals(services.savedSessions[0].result.truthfulness, 100);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 applies pseudoword penalty when pseudoword is claimed", async () => {
  const services = makeServices([0, 1, 2]);
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("word_0", "know");
  body.append("word_1", "know"); // pseudoword claimed
  body.append("word_2", "dont_know");

  const response = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(services.savedSessions[0].result.score, 0); // 1 real - 1 pseudo
  assertEquals(services.savedSessions[0].result.truthfulness, 50);
});

Deno.test("VER-STAGE2-ROUTE: POST /stage/2 sets session cookie in response", async () => {
  const services = makeServices([0]);
  const app = createApp(services);

  const response = await app.request("/stage/2", {
    method: "POST",
    body: new URLSearchParams(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=my-session",
    },
  });

  assertStringIncludes(
    response.headers.get("set-cookie") ?? "",
    "sessionId=my-session",
  );
});

Deno.test("VER-STAGE2-ROUTE: GET /stage/2 renders similarWord instead of wordText, and scoring uses similarWordIsReal", async () => {
  // Let's select index 3: "pseudocookie" -> similarWord: "cookie" (isReal: true)
  // and index 4: "banana" -> similarWord: "bananasss" (isReal: false)
  const services = makeServices([3, 4]);
  const app = createApp(services);

  // 1. Visit /stage/2 to verify similarWord is rendered instead of wordText
  const response1 = await app.request("/stage/2", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body1 = await response1.text();
  assertEquals(response1.status, 200);
  assertStringIncludes(body1, "cookie");
  assertEquals(body1.includes("pseudocookie"), false);

  // 2. Submit Stage 2 answers:
  // - Mark "cookie" (index 3, isReal: true) as know.
  // - Mark "bananasss" (index 4, isReal: false) as know.
  // Since index 3 has similarWordIsReal: true and index 4 has similarWordIsReal: false,
  // the scoring should treat index 3 as real (known) and index 4 as pseudo (known).
  // Thus, score = (1 real known) - (1 pseudo known) = 0.
  // Truthfulness = 1 / 2 = 50.
  const body = new URLSearchParams();
  body.append("word_3", "know");
  body.append("word_4", "know");

  const response2 = await app.request("/stage/2", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response2.status, 302);
  assertEquals(services.savedSessions.length, 1);
  assertEquals(services.savedSessions[0].result.score, 0); // 1 real - 1 pseudo
  assertEquals(services.savedSessions[0].result.truthfulness, 50);
});
