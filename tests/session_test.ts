import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "@hono/hono";
import { getSessionId, setSessionCookie } from "../session.ts";

function buildTestApp() {
  const app = new Hono();
  app.get("/get", (context) => {
    return context.text(getSessionId(context) ?? "");
  });
  app.get("/set", (context) => {
    setSessionCookie(context, "test-id-42");
    return context.text("ok");
  });
  return app;
}

Deno.test("VER-SESSION-STATE: getSessionId extracts sessionId from a simple cookie header", async () => {
  const app = buildTestApp();
  const response = await app.request("/get", {
    headers: { cookie: "sessionId=abc-123" },
  });
  assertEquals(await response.text(), "abc-123");
});

Deno.test("VER-SESSION-STATE: getSessionId finds sessionId among multiple cookies", async () => {
  const app = buildTestApp();
  const response = await app.request("/get", {
    headers: { cookie: "foo=bar; sessionId=my-session; baz=qux" },
  });
  assertEquals(await response.text(), "my-session");
});

Deno.test("VER-SESSION-STATE: getSessionId returns empty when cookie header is absent", async () => {
  const app = buildTestApp();
  const response = await app.request("/get");
  assertEquals(await response.text(), "");
});

Deno.test("VER-SESSION-STATE: setSessionCookie sets an HttpOnly, Lax, non-Secure cookie by default", async () => {
  const app = buildTestApp();
  const response = await app.request("/set");
  const header = response.headers.get("set-cookie") ?? "";
  assertStringIncludes(header, "sessionId=test-id-42");
  assertStringIncludes(header, "HttpOnly");
  assertStringIncludes(header, "SameSite=Lax");
  assertEquals(header.includes("Secure"), false);
});

Deno.test("VER-SESSION-STATE: setSessionCookie adds Secure when APP_ENV=production", async () => {
  Deno.env.set("APP_ENV", "production");
  try {
    const app = buildTestApp();
    const response = await app.request("/set");
    const header = response.headers.get("set-cookie") ?? "";
    assertStringIncludes(header, "Secure");
  } finally {
    Deno.env.delete("APP_ENV");
  }
});
