import type { Hono } from "@hono/hono";
import { AdminDashboardPage } from "../../ui/pages/AdminDashboardPage.tsx";
import type { Services } from "../../db/services.ts";

/** Registers the dashboard route (`GET /admin`). */
export function registerDashboardRoutes(route: Hono, services: Services) {
  route.get("/", async (context) => {
    const stats = await services.history.getDashboardStats();
    const reviewProg = await services.words.progress();
    return context.html(
      AdminDashboardPage({
        ...stats,
        unreviewedCount: reviewProg.remaining,
      }),
    );
  });
}
