import { Hono } from "@hono/hono";
import { adminAuthMiddleware, registerAuthRoutes } from "./auth.ts";
import { registerDashboardRoutes } from "./dashboard.ts";
import { registerWordsRoutes } from "./words.ts";
import { registerReviewRoutes } from "./review.ts";
import { registerHistoryRoutes } from "./history.ts";
import { registerTicketConfigRoutes } from "./ticket_config.ts";
import { registerTicketsRoutes } from "./tickets.ts";
import {
  type AdminDashboardLoader,
  databaseAdminDashboardLoader,
} from "./loaders/dashboard.ts";
import {
  type AdminWordsLoader,
  databaseAdminWordsLoader,
} from "./loaders/words.ts";
import {
  type AdminReviewLoader,
  databaseAdminReviewLoader,
} from "./loaders/review.ts";
import {
  type AdminHistoryLoader,
  databaseAdminHistoryLoader,
} from "./loaders/history.ts";
import {
  type AdminTicketConfigLoader,
  databaseAdminTicketConfigLoader,
} from "./loaders/ticket_config.ts";
import {
  type AdminTicketsLoader,
  databaseAdminTicketsLoader,
} from "./loaders/tickets.ts";

// Re-export the admin public surface so `app.ts` and tests have a single
// import entry point.
export { adminAuthMiddleware };
export type {
  AdminDashboardLoader,
  AdminHistoryLoader,
  AdminReviewLoader,
  AdminTicketConfigLoader,
  AdminTicketsLoader,
  AdminWordsLoader,
};
export {
  databaseAdminDashboardLoader,
  databaseAdminHistoryLoader,
  databaseAdminReviewLoader,
  databaseAdminTicketConfigLoader,
  databaseAdminTicketsLoader,
  databaseAdminWordsLoader,
};

/**
 * Composition root for the admin panel. Each concern (auth, dashboard, words,
 * review, challenges, history) lives in its own module and registers its
 * handlers onto a single shared Hono router, behind the auth middleware.
 */
export function createAdminRoute(
  dashboardLoader: AdminDashboardLoader = databaseAdminDashboardLoader,
  wordsLoader: AdminWordsLoader = databaseAdminWordsLoader,
  historyLoader: AdminHistoryLoader = databaseAdminHistoryLoader,
  reviewLoader: AdminReviewLoader = databaseAdminReviewLoader,
  ticketConfigLoader: AdminTicketConfigLoader = databaseAdminTicketConfigLoader,
  ticketsLoader: AdminTicketsLoader = databaseAdminTicketsLoader,
) {
  const route = new Hono();

  // Apply middleware to all /admin routes
  route.use("*", adminAuthMiddleware);

  registerAuthRoutes(route);
  registerDashboardRoutes(route, dashboardLoader, reviewLoader);
  registerWordsRoutes(route, wordsLoader);
  registerReviewRoutes(route, reviewLoader, wordsLoader);
  registerHistoryRoutes(route, historyLoader);
  registerTicketConfigRoutes(route, ticketConfigLoader);
  registerTicketsRoutes(route, ticketsLoader);

  return route;
}

export const adminRoute = createAdminRoute();
