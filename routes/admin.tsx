import { type Context, Hono } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { desc, sql } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { testHistory } from "../db/schema.ts";
import { LoginPage } from "../ui/pages/LoginPage.tsx";
import {
  AdminDashboardPage,
  type TestRun,
} from "../ui/pages/AdminDashboardPage.tsx";
import { getKv } from "../session.ts";

export interface AdminDashboardLoader {
  getDashboardStats(): Promise<{
    totalRuns: number;
    avgScore: number;
    avgTruthfulness: number;
    recentRuns: TestRun[];
  }>;
}

export const databaseAdminDashboardLoader: AdminDashboardLoader = {
  async getDashboardStats() {
    const { client, db } = createDatabase();
    try {
      const stats = await db
        .select({
          totalRuns: sql<number>`count(${testHistory.id})::integer`,
          avgScore: sql<
            number
          >`coalesce(avg(${testHistory.score}), 0)::numeric`,
          avgTruthfulness: sql<
            number
          >`coalesce(avg(${testHistory.truthfulness}), 0)::numeric`,
        })
        .from(testHistory);

      const totalRuns = stats[0]?.totalRuns ?? 0;
      const avgScore = Math.round(Number(stats[0]?.avgScore ?? 0) * 10) / 10;
      const avgTruthfulness =
        Math.round(Number(stats[0]?.avgTruthfulness ?? 0) * 10) / 10;

      const recentRuns = await db
        .select()
        .from(testHistory)
        .orderBy(desc(testHistory.completedAt))
        .limit(10);

      return {
        totalRuns,
        avgScore,
        avgTruthfulness,
        recentRuns,
      };
    } finally {
      await client.end();
    }
  },
};

// Helper to check credentials from env
function getAdminCredentials() {
  const username = Deno.env.get("ADMIN_USERNAME") || "admin";
  const password = Deno.env.get("ADMIN_PASSWORD") || "admin";
  return { username, password };
}

// Authentication middleware
export async function adminAuthMiddleware(
  context: Context,
  next: () => Promise<void>,
) {
  const path = context.req.path;
  // Exclude login endpoint from auth check
  if (path === "/admin/login") {
    return await next();
  }

  const sessionId = getCookie(context, "admin_session");
  if (!sessionId) {
    return context.redirect("/admin/login");
  }

  const kv = await getKv();
  const sessionEntry = await kv.get(["admin_session", sessionId]);
  if (!sessionEntry.value) {
    // Session expired or invalid
    deleteCookie(context, "admin_session");
    return context.redirect("/admin/login");
  }

  // Session is valid
  context.set("adminSession", sessionEntry.value);
  await next();
}

export function createAdminRoute(
  dashboardLoader: AdminDashboardLoader = databaseAdminDashboardLoader,
) {
  const route = new Hono();

  // Apply middleware to all /admin routes
  route.use("*", adminAuthMiddleware);

  // GET /admin/login
  route.get("/login", (context) => {
    const sessionId = getCookie(context, "admin_session");
    if (sessionId) {
      return context.redirect("/admin");
    }
    return context.html(LoginPage());
  });

  // POST /admin/login
  route.post("/login", async (context) => {
    const body = await context.req.parseBody();
    const usernameInput = body.username;
    const passwordInput = body.password;

    const { username, password } = getAdminCredentials();

    if (usernameInput === username && passwordInput === password) {
      const sessionId = crypto.randomUUID();
      const kv = await getKv();

      // Store session in Deno KV (24 hours expiry)
      await kv.set(["admin_session", sessionId], { username }, {
        expireIn: 24 * 60 * 60 * 1000,
      });

      // Set secure cookie
      setCookie(context, "admin_session", sessionId, {
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
      });

      return context.redirect("/admin");
    }

    return context.html(LoginPage({ error: "Invalid username or password" }));
  });

  // POST /admin/logout
  route.post("/logout", async (context) => {
    const sessionId = getCookie(context, "admin_session");
    if (sessionId) {
      const kv = await getKv();
      await kv.delete(["admin_session", sessionId]);
      deleteCookie(context, "admin_session");
    }
    return context.redirect("/admin/login");
  });

  // GET /admin
  route.get("/", async (context) => {
    const stats = await dashboardLoader.getDashboardStats();
    return context.html(AdminDashboardPage(stats));
  });

  return route;
}

export const adminRoute = createAdminRoute();
