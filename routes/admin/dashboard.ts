import type { Hono } from "@hono/hono";
import { AdminDashboardPage } from "../../ui/pages/AdminDashboardPage.tsx";
import type { AdminDashboardLoader } from "./loaders/dashboard.ts";
import type { AdminReviewLoader } from "./loaders/review.ts";

/** Registers the dashboard route (`GET /admin`). */
export function registerDashboardRoutes(
  route: Hono,
  dashboardLoader: AdminDashboardLoader,
  reviewLoader: AdminReviewLoader,
) {
  route.get("/", async (context) => {
    const stats = await dashboardLoader.getDashboardStats();
    const reviewProg = await reviewLoader.progress();
    return context.html(
      AdminDashboardPage({
        ...stats,
        unreviewedCount: reviewProg.remaining,
      }),
    );
  });
}
