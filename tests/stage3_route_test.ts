import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { tickets } from "../db/schema.ts";
import { defaultServices, type Services } from "../db/services.ts";
import type { Stage2Result, Stage3Answers } from "../session.ts";

const mockTicket: typeof tickets.$inferSelect = {
  id: 42,
  code: "ELX-T-0042",
  status: "published",
  title: "Mock Ticket",
  notes: "Notes",
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
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTicketWithAntonym: typeof tickets.$inferSelect = {
  ...mockTicket,
  questions: [
    { type: "verification", wordText: "apple", isReal: true, difficulty: 1 },
    {
      type: "antonym",
      promptText: "apple",
      correctText: "nothing",
      distractors: ["rock", "cloud", "shoe"],
      verified: true,
    },
  ],
};

const defaultStage2Answers = { "0": true, "1": true, "2": false };
const defaultStage2Result: Stage2Result = { score: 2, truthfulness: 100 };

function makeServices(options: {
  ticket?: typeof tickets.$inferSelect;
  stage2Answers?: Record<string, boolean>;
  stage2Result?: Stage2Result | null;
  stage3Answers?: Stage3Answers;
} = {}): Services & {
  savedAnswers: Array<
    {
      sessionId: string;
      questionIndex: number;
      questionType: "synonym" | "antonym";
      answer: string;
      isCorrect: boolean;
    }
  >;
} {
  const ticket = options.ticket ?? mockTicket;
  const stage2Answers = options.stage2Answers ?? defaultStage2Answers;
  const stage2Result = options.stage2Result === undefined
    ? defaultStage2Result
    : options.stage2Result;
  const stage3Answers: Stage3Answers = { ...(options.stage3Answers ?? {}) };
  const savedAnswers: Array<
    {
      sessionId: string;
      questionIndex: number;
      questionType: "synonym" | "antonym";
      answer: string;
      isCorrect: boolean;
    }
  > = [];

  const sessions: Services["sessions"] = {
    ...defaultServices.sessions,
    loadStage2Result: () => Promise.resolve(stage2Result),
    loadStage2Answers: () => Promise.resolve({ ...stage2Answers }),
    loadStage3Answers: () => Promise.resolve({ ...stage3Answers }),
    saveStage3Answer(
      sessionId,
      questionIndex,
      questionType,
      answer,
      isCorrect,
    ) {
      stage3Answers[String(questionIndex)] = { answer, isCorrect };
      savedAnswers.push({
        sessionId,
        questionIndex,
        questionType,
        answer,
        isCorrect,
      });
      return Promise.resolve();
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
        if (id === 42) return Promise.resolve(ticket);
        return Promise.resolve(null);
      },
    },
    sessions,
  };

  return Object.assign(services, { savedAnswers });
}

Deno.test("VER-STAGE3-ROUTE: GET /stage/3 redirects to /stage/1 when no session cookie", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/3");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-STAGE3-ROUTE: GET /stage/3 redirects to /stage/2 when there's no Stage 2 result", async () => {
  const services = makeServices({ stage2Result: null });
  const app = createApp(services);

  const response = await app.request("/stage/3", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/2");
});

Deno.test("VER-STAGE3-ROUTE: GET /stage/3 redirects to /result when there are no eligible synonym questions", async () => {
  const services = makeServices({ stage2Answers: {} });
  const app = createApp(services);

  const response = await app.request("/stage/3", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/result");
});

Deno.test("VER-STAGE3-ROUTE: GET /stage/3 redirects to /result when every eligible question is already answered", async () => {
  const services = makeServices({
    stage3Answers: {
      "3": { answer: "fruit", isCorrect: true },
      "4": { answer: "seat", isCorrect: true },
    },
  });
  const app = createApp(services);

  const response = await app.request("/stage/3", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/result");
});

Deno.test("VER-STAGE3-ROUTE: GET /stage/3 renders the first eligible synonym question", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/3", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "Stage 3: Synonym Challenge");
  assertStringIncludes(body, "ELX-T-0042");
  assertStringIncludes(body, "Question 1 of 2");
  assertStringIncludes(body, ">apple<");
  assertStringIncludes(body, "fruit");
  assertStringIncludes(body, 'name="questionIndex"');
  assertStringIncludes(body, 'value="3"');
  assertStringIncludes(body, "/static/htmx.min.js");
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 htmx request stores one answer and returns the next card", async () => {
  const services = makeServices();
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "3");
  body.append("answer", "fruit");

  const response = await app.request("/stage/3", {
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
  assertEquals(services.savedAnswers.length, 1);
  assertEquals(services.savedAnswers[0], {
    sessionId: "test-session",
    questionIndex: 3,
    questionType: "synonym",
    answer: "fruit",
    isCorrect: true,
  });
  assertStringIncludes(responseBody, "Question 2 of 2");
  assertStringIncludes(responseBody, ">chair<");
  assertStringIncludes(responseBody, "seat");
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 final htmx submission stores the answer and sends an HX redirect to /result", async () => {
  const services = makeServices({
    stage3Answers: { "3": { answer: "fruit", isCorrect: true } },
  });
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "4");
  body.append("answer", "lamp");

  const response = await app.request("/stage/3", {
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
  assertEquals(services.savedAnswers.length, 1);
  assertEquals(services.savedAnswers[0], {
    sessionId: "test-session",
    questionIndex: 4,
    questionType: "synonym",
    answer: "lamp",
    isCorrect: false,
  });
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 final non-htmx submission stores the answer and redirects to /result", async () => {
  const services = makeServices({
    stage3Answers: { "3": { answer: "fruit", isCorrect: true } },
  });
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "4");
  body.append("answer", "seat");

  const response = await app.request("/stage/3", {
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
  assertEquals(services.savedAnswers.length, 1);
  assertEquals(services.savedAnswers[0].isCorrect, true);
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 non-htmx intermediate submission redirects back to /stage/3", async () => {
  const services = makeServices();
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "3");
  body.append("answer", "rock");

  const response = await app.request("/stage/3", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/3");
  assertEquals(services.savedAnswers.length, 1);
  assertEquals(services.savedAnswers[0].isCorrect, false);
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 redirects to /stage/1 when no session cookie", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/stage/3", {
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

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 with an invalid question index returns 400 and saves nothing", async () => {
  const services = makeServices();
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "999");
  body.append("answer", "fruit");

  const response = await app.request("/stage/3", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 400);
  assertEquals(services.savedAnswers.length, 0);
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 with an option that doesn't belong to the question returns 400 and saves nothing", async () => {
  const services = makeServices();
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "3");
  body.append("answer", "nonsense");

  const response = await app.request("/stage/3", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(response.status, 400);
  assertEquals(services.savedAnswers.length, 0);
});

Deno.test("VER-STAGE3-ROUTE: POST /stage/3 sets session cookie in response", async () => {
  const services = makeServices();
  const app = createApp(services);

  const body = new URLSearchParams();
  body.append("questionIndex", "3");
  body.append("answer", "fruit");

  const response = await app.request("/stage/3", {
    method: "POST",
    body,
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

Deno.test("VER-STAGE3-ROUTE: GET and POST /stage/3 render and answer an antonym question", async () => {
  const services = makeServices({
    ticket: mockTicketWithAntonym,
    stage2Answers: { "0": true },
  });
  const app = createApp(services);

  const getResponse = await app.request("/stage/3", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const getBody = await getResponse.text();

  assertEquals(getResponse.status, 200);
  assertStringIncludes(getBody, ">apple<");
  assertStringIncludes(getBody, "nothing");
  assertStringIncludes(getBody, 'value="1"');

  const body = new URLSearchParams();
  body.append("questionIndex", "1");
  body.append("answer", "nothing");

  const postResponse = await app.request("/stage/3", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "http://localhost",
      "cookie": "sessionId=test-session",
    },
  });

  assertEquals(postResponse.status, 302);
  assertEquals(postResponse.headers.get("location"), "/result");
  assertEquals(services.savedAnswers.length, 1);
  assertEquals(services.savedAnswers[0], {
    sessionId: "test-session",
    questionIndex: 1,
    questionType: "antonym",
    answer: "nothing",
    isCorrect: true,
  });
});
