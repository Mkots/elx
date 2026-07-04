import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import { defaultServices, type Services } from "../db/services.ts";
import type { Stage2Result } from "../session.ts";

function makeServices(result: Stage2Result | null): Services {
  return {
    ...defaultServices,
    sessions: {
      ...defaultServices.sessions,
      loadStage2Result: () => Promise.resolve(result),
    },
    tickets: {
      ...defaultServices.tickets,
      getPublishedTickets: () => Promise.resolve([]),
    },
  };
}

Deno.test("VER-RESULT-ROUTE: GET /result redirects to /stage/1 when no session cookie", async () => {
  const app = createApp(makeServices(null));

  const response = await app.request("/result");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/1");
});

Deno.test("VER-RESULT-ROUTE: GET /result redirects to /stage/2 when no result in session", async () => {
  const app = createApp(makeServices(null));

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/stage/2");
});

Deno.test("VER-RESULT-ROUTE: GET /result renders score and truthfulness", async () => {
  const app = createApp(makeServices({ score: 42, truthfulness: 87 }));

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
});

Deno.test("VER-RESULT-ROUTE: GET /result renders a link to restart", async () => {
  const app = createApp(makeServices({ score: 10, truthfulness: 100 }));

  const response = await app.request("/result", {
    headers: { "cookie": "sessionId=test-session" },
  });
  const body = await response.text();

  assertStringIncludes(body, "/stage/1");
});
