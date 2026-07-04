import { app, createApp } from "../app.ts";
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

Deno.test("VER-APP-ROUTE: POST with a forged Origin is rejected by CSRF protection", async () => {
  const response = await app.request("/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "https://evil.example.com",
    },
    body: "username=x&password=y",
  });

  assertEquals(response.status, 403);
});

Deno.test("VER-APP-ROUTE: responses include the standard secure headers", async () => {
  const response = await app.request("/health");

  assertEquals(response.headers.get("x-content-type-options"), "nosniff");
  assertEquals(response.headers.get("x-frame-options"), "SAMEORIGIN");
});

Deno.test("VER-ANALYTICS: GTM script is omitted when GTM_CONTAINER_ID is unset", async () => {
  const previous = Deno.env.get("GTM_CONTAINER_ID");
  Deno.env.delete("GTM_CONTAINER_ID");
  try {
    const response = await createApp().request("/");
    const body = await response.text();

    assertEquals(body.includes("googletagmanager.com/gtm.js"), false);
  } finally {
    if (previous) Deno.env.set("GTM_CONTAINER_ID", previous);
  }
});

Deno.test("VER-ANALYTICS: GTM consent defaults to denied when container id is set", async () => {
  const previous = Deno.env.get("GTM_CONTAINER_ID");
  Deno.env.set("GTM_CONTAINER_ID", "GTM-TEST123");
  try {
    const response = await createApp().request("/");
    const body = await response.text();

    assertStringIncludes(body, "googletagmanager.com/gtm.js");
    assertStringIncludes(body, "GTM-TEST123");
    assertStringIncludes(body, '"analytics_storage":"denied"');
    assertStringIncludes(body, '"ad_user_data":"denied"');
  } finally {
    if (previous) Deno.env.set("GTM_CONTAINER_ID", previous);
    else Deno.env.delete("GTM_CONTAINER_ID");
  }
});

Deno.test("VER-APP-ROUTE: unknown route returns an HTML 404 page", async () => {
  const response = await app.request("/this-route-does-not-exist");
  const body = await response.text();

  assertEquals(response.status, 404);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "404");
});

Deno.test("VER-APP-ROUTE: unknown /health route returns a JSON 404", async () => {
  const response = await app.request("/health/does-not-exist");

  assertEquals(response.status, 404);
  assertEquals(await response.json(), { error: "Not found" });
});
