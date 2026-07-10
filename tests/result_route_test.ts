import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { tickets } from "../db/schema.ts";
import { defaultServices, type Services } from "../db/services.ts";
import type { Stage2Result, Stage3Answers } from "../session.ts";

const baseTicket: typeof tickets.$inferSelect = {
  id: 42,
  code: "ELX-T-0042",
  status: "published",
  title: "Mock Ticket",
  notes: "Notes",
  questions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const synonymTicket: typeof tickets.$inferSelect = {
  ...baseTicket,
  questions: [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    { type: "verification", wordText: "chair", isReal: true, difficulty: 1 },
    { type: "verification", wordText: "blurp", isReal: false, difficulty: 1 },
    {
      type: "synonym",
      promptText: "apple",
      correctText: "fruit",
      distractors: ["rock", "cloud", "shoe"],
      verified: true,
    },
    {
      type: "synonym",
      promptText: "chair",
      correctText: "seat",
      distractors: ["lamp", "spoon", "cloud"],
      verified: true,
    },
  ],
};

function makeServices(options: {
  ticket?: typeof tickets.$inferSelect;
  stage2Result?: Stage2Result | null;
  stage2Answers?: Record<string, boolean>;
  stage3Answers?: Stage3Answers;
} = {}): Services {
  const ticket = options.ticket ?? baseTicket;
  const stage2Result = options.stage2Result === undefined
    ? { score: 42, truthfulness: 87, vocabularySize: 5200 }
    : options.stage2Result;
  const stage2Answers = options.stage2Answers ?? {};
  const stage3Answers = options.stage3Answers ?? {};

  return {
    ...defaultServices,
    sessions: {
      ...defaultServices.sessions,
      loadConsentTimestamp: () =>
        Promise.resolve(new Date("2026-07-05T12:00:00Z")),
      loadSessionTicketId: () => Promise.resolve(42),
      loadStage2Result: () => Promise.resolve(stage2Result),
      loadStage2Answers: () => Promise.resolve({ ...stage2Answers }),
      loadStage3Answers: () => Promise.resolve({ ...stage3Answers }),
      loadStage3Summary: () => {
        const answered = Object.values(stage3Answers);
        return Promise.resolve({
          answeredCount: answered.length,
          correctCount: answered.filter((answer) => answer.isCorrect).length,
        });
      },
    },
    tickets: {
      ...defaultServices.tickets,
      getTicketById: (id) =>
        id === 42 ? Promise.resolve(ticket) : Promise.resolve(null),
      getPublishedTickets: () => Promise.resolve([]),
    },
  };
}

Deno.test("VER-RESULT-ROUTE: GET /result redirects to /stage/1 when no session cookie", async () => {
  const app = createApp(makeServices({ stage2Result: null }));

  const response = await app.request("/result");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-RESULT-ROUTE: GET /result redirects to /stage/2 when no result in session", async () => {
  const app = createApp(makeServices({ stage2Result: null }));

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/2");
});

Deno.test("VER-RESULT-ROUTE: GET /result renders score, truthfulness and vocabulary size", async () => {
  const app = createApp(
    makeServices({
      stage2Result: { score: 42, truthfulness: 87, vocabularySize: 5200 },
    }),
  );

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "42");
  assertStringIncludes(body, "87%");
  assertStringIncludes(body, "High confidence");
  assertStringIncludes(body, 'class="truthfulness-progress"');
  assertStringIncludes(body, 'data-testid="vocabulary-size"');
  assertStringIncludes(body, "5,200");
  assertStringIncludes(body, 'data-testid="cefr-level"');
  assertStringIncludes(body, "B1");
});

Deno.test("VER-RESULT-ROUTE: GET /result renders a link to restart", async () => {
  const app = createApp(
    makeServices({ stage2Result: { score: 10, truthfulness: 100 } }),
  );

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertStringIncludes(body, "/stage/1");
});

Deno.test("VER-RESULT-ROUTE: GET /result shows the Stage 3 CTA when eligible unanswered questions remain", async () => {
  const app = createApp(
    makeServices({
      ticket: synonymTicket,
      stage2Answers: { "0": true, "1": true, "2": false },
    }),
  );

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(body, 'data-testid="stage3-cta"');
  assertStringIncludes(body, 'href="/stage/3"');
});

Deno.test("VER-RESULT-ROUTE: GET /result hides the Stage 3 CTA when no synonym questions are eligible", async () => {
  const app = createApp(
    makeServices({
      ticket: synonymTicket,
      stage2Answers: {},
    }),
  );

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(body.includes('data-testid="stage3-cta"'), false);
  assertEquals(body.includes('data-testid="stage3-summary"'), false);
});

Deno.test("VER-RESULT-ROUTE: GET /result hides the Stage 3 CTA once every eligible question is answered", async () => {
  const app = createApp(
    makeServices({
      ticket: synonymTicket,
      stage2Answers: { "0": true, "1": true, "2": false },
      stage3Answers: {
        "3": { answer: "fruit", isCorrect: true },
        "4": { answer: "seat", isCorrect: true },
      },
    }),
  );

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(body.includes('data-testid="stage3-cta"'), false);
  assertStringIncludes(body, 'data-testid="stage3-summary"');
});

Deno.test("VER-RESULT-ROUTE: GET /result shows the Stage 3 summary once at least one answer is recorded", async () => {
  const app = createApp(
    makeServices({
      ticket: synonymTicket,
      stage2Answers: { "0": true, "1": true, "2": false },
      stage3Answers: {
        "3": { answer: "fruit", isCorrect: true },
      },
    }),
  );

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertStringIncludes(body, 'data-testid="stage3-summary"');
  assertStringIncludes(body, "1");
});

Deno.test("VER-RESULT-ROUTE: GET /result shows no Stage 3 UI when there is nothing eligible to challenge", async () => {
  const app = createApp(makeServices({ ticket: baseTicket }));

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(body.includes('data-testid="stage3-cta"'), false);
  assertEquals(body.includes('data-testid="stage3-summary"'), false);
});
