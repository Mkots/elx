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
        recentRuns: stats.recentRuns.map((run) => ({
          id: run.id,
          score: run.score ?? 0,
          truthfulness: run.truthfulness ?? 0,
          completedAt: run.completedAt ?? run.createdAt,
          ticketId: run.ticketId,
        })),
        unreviewedCount: reviewProg.remaining,
      }),
    );
  });
}
