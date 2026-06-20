import { app } from "../app.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("VER-APP-ROUTE: GET / returns server-rendered HTML", async () => {
  const response = await app.request("/");
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "ELX Vocabulary Assessment");
});

Deno.test("VER-APP-ROUTE: GET /health returns service status", async () => {
  const response = await app.request("/health");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    status: "ok",
    service: "elx",
  });
});
