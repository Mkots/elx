import { app } from "../app.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { getKv } from "../session.ts";
import { createDatabase } from "../db/client.ts";
import { testHistory } from "../db/schema.ts";
import { sql } from "drizzle-orm";

// Ensure DATABASE_URL is set for tests
Deno.env.set(
  "DATABASE_URL",
  Deno.env.get("DATABASE_URL") || "postgres://elx:elx@127.0.0.1:5432/elx",
);

Deno.test("GET /admin redirects unauthenticated user to login", async () => {
  const response = await app.request("/admin");
  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/admin/login");
});

Deno.test("GET /admin/login renders login page", async () => {
  const response = await app.request("/admin/login");
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "ELX Admin Portal");
});

Deno.test("POST /admin/login handles authentication and session creation", async () => {
  // Set credentials in environment (matching fallback/env checks)
  Deno.env.set("ADMIN_USERNAME", "testadmin");
  Deno.env.set("ADMIN_PASSWORD", "testpass");

  // 1. Test invalid login
  const invalidFormData = new URLSearchParams();
  invalidFormData.append("username", "testadmin");
  invalidFormData.append("password", "wrongpass");

  const failResponse = await app.request("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: invalidFormData.toString(),
  });
  const failBody = await failResponse.text();
  assertEquals(failResponse.status, 200);
  assertStringIncludes(failBody, "Invalid username or password");

  // 2. Test valid login
  const validFormData = new URLSearchParams();
  validFormData.append("username", "testadmin");
  validFormData.append("password", "testpass");

  const successResponse = await app.request("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: validFormData.toString(),
  });
  assertEquals(successResponse.status, 302);
  assertEquals(successResponse.headers.get("location"), "/admin");

  const cookieHeader = successResponse.headers.get("set-cookie") ?? "";
  assertStringIncludes(cookieHeader, "admin_session=");

  // Extract session ID from cookie header
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  const sessionId = match ? match[1] : "";
  assertEquals(sessionId !== "", true);

  // 3. Verify session in Deno KV
  const kv = await getKv();
  const sessionEntry = await kv.get(["admin_session", sessionId]);
  assertEquals(sessionEntry.value !== null, true);

  // 4. Test authenticated request to /admin
  const authenticatedResponse = await app.request("/admin", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const authBody = await authenticatedResponse.text();
  assertEquals(authenticatedResponse.status, 200);
  assertStringIncludes(authBody, "Recent Test Activity");
  assertStringIncludes(authBody, "Total Runs");

  // 5. Test logout
  const logoutResponse = await app.request("/admin/logout", {
    method: "POST",
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertEquals(logoutResponse.status, 302);
  assertEquals(logoutResponse.headers.get("location"), "/admin/login");

  // Check KV entry deleted
  const deletedEntry = await kv.get(["admin_session", sessionId]);
  assertEquals(deletedEntry.value, null);

  // Clean up env
  Deno.env.delete("ADMIN_USERNAME");
  Deno.env.delete("ADMIN_PASSWORD");
});

Deno.test("GET /admin aggregates metrics from database and displays them", async () => {
  Deno.env.set("ADMIN_USERNAME", "testadmin");
  Deno.env.set("ADMIN_PASSWORD", "testpass");

  const { client, db } = createDatabase();

  // Insert mock test runs
  const testSessionId = `test-session-${crypto.randomUUID()}`;
  await db.insert(testHistory).values([
    { sessionId: testSessionId, score: 80, truthfulness: 90 },
    { sessionId: testSessionId, score: 60, truthfulness: 80 },
  ]);

  try {
    const loginData = new URLSearchParams();
    loginData.append("username", "testadmin");
    loginData.append("password", "testpass");

    const loginRes = await app.request("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: loginData.toString(),
    });

    const cookieHeader = loginRes.headers.get("set-cookie") ?? "";
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    const sessionId = match ? match[1] : "";

    const dashboardRes = await app.request("/admin", {
      headers: { "Cookie": `admin_session=${sessionId}` },
    });

    const body = await dashboardRes.text();
    assertEquals(dashboardRes.status, 200);
    assertStringIncludes(body, "Total Runs");
    assertStringIncludes(body, "Average Score");
    assertStringIncludes(body, "Avg Truthfulness");
    assertStringIncludes(body, testSessionId);
    assertStringIncludes(body, "80%");
    assertStringIncludes(body, "90%");
  } finally {
    // Clean up DB records
    await db.delete(testHistory).where(sql`session_id = ${testSessionId}`);
    await client.end();

    Deno.env.delete("ADMIN_USERNAME");
    Deno.env.delete("ADMIN_PASSWORD");
  }
});
