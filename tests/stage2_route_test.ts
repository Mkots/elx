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
    { type: "verification", wordText: "apple", isReal: true },
    { type: "verification", wordText: "blurp", isReal: false },
    { type: "verification", wordText: "chair", isReal: true },
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
