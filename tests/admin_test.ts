import { assertEquals, assertStringIncludes } from "@std/assert";
import { getKv } from "../session.ts";
import { createApp } from "../app.ts";
import type { AdminDashboardLoader } from "../routes/admin.tsx";
import type { TestRun } from "../ui/pages/AdminDashboardPage.tsx";

const mockDashboardLoader: AdminDashboardLoader = {
  async getDashboardStats() {
    await Promise.resolve();
    const recentRuns: TestRun[] = [
      {
        id: 1,
        sessionId: "mock-session-1",
        score: 80,
        truthfulness: 90,
        completedAt: new Date("2026-06-19T12:00:00Z"),
      },
      {
        id: 2,
        sessionId: "mock-session-2",
        score: 60,
        truthfulness: 80,
        completedAt: new Date("2026-06-19T13:00:00Z"),
      },
    ];
    return {
      totalRuns: 2,
      avgScore: 70,
      avgTruthfulness: 85,
      recentRuns,
    };
  },
};

const app = createApp({
  adminDashboardLoader: mockDashboardLoader,
});

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

  try {
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

    // 4. Test authenticated request to /admin (verifying it returns mocked dashboard)
    const authenticatedResponse = await app.request("/admin", {
      headers: { "Cookie": `admin_session=${sessionId}` },
    });
    const authBody = await authenticatedResponse.text();
    assertEquals(authenticatedResponse.status, 200);
    assertStringIncludes(authBody, "Total Runs");
    assertStringIncludes(authBody, "2");
    assertStringIncludes(authBody, "Average Score");
    assertStringIncludes(authBody, "70%");
    assertStringIncludes(authBody, "Avg Truthfulness");
    assertStringIncludes(authBody, "85%");
    assertStringIncludes(authBody, "mock-session-1");
    assertStringIncludes(authBody, "mock-session-2");

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
  } finally {
    // Clean up env
    Deno.env.delete("ADMIN_USERNAME");
    Deno.env.delete("ADMIN_PASSWORD");
  }
});
