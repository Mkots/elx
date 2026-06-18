import { assertEquals } from "@std/assert";
import { parseSessionId, sessionCookie } from "../session.ts";

Deno.test("parseSessionId extracts sessionId from a simple cookie header", () => {
  assertEquals(parseSessionId("sessionId=abc-123"), "abc-123");
});

Deno.test("parseSessionId finds sessionId among multiple cookies", () => {
  assertEquals(
    parseSessionId("foo=bar; sessionId=my-session; baz=qux"),
    "my-session",
  );
});

Deno.test("parseSessionId returns undefined when cookie header is null", () => {
  assertEquals(parseSessionId(null), undefined);
});

Deno.test("parseSessionId returns undefined when sessionId cookie is absent", () => {
  assertEquals(parseSessionId("foo=bar; baz=qux"), undefined);
});

Deno.test("parseSessionId returns undefined for an empty sessionId value", () => {
  assertEquals(parseSessionId("sessionId="), undefined);
});

Deno.test("sessionCookie builds a correct Set-Cookie header", () => {
  const header = sessionCookie("test-id-42");
  assertEquals(
    header,
    "sessionId=test-id-42; HttpOnly; Path=/; SameSite=Lax",
  );
});
