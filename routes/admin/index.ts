import { Hono } from "@hono/hono";
import { adminAuthMiddleware, registerAuthRoutes } from "./auth.ts";
import { registerDashboardRoutes } from "./dashboard.ts";
import { registerWordsRoutes } from "./words.ts";
import { registerReviewRoutes } from "./review.ts";
import { registerHistoryRoutes } from "./history.ts";
import { registerTicketConfigRoutes } from "./ticket_config.ts";
import { registerTicketsRoutes } from "./tickets.ts";
import { defaultServices, type Services } from "../../db/services.ts";

export { adminAuthMiddleware };

/**
 * Composition root for the admin panel. Each concern (auth, dashboard, words,
 * review, challenges, history) lives in its own module and registers its
 * handlers onto a single shared Hono router, behind the auth middleware.
 */
export function createAdminRoute(services: Services = defaultServices) {
  const route = new Hono();

  // Apply middleware to all /admin routes
  route.use("*", adminAuthMiddleware);

  registerAuthRoutes(route);
  registerDashboardRoutes(route, services);
  registerWordsRoutes(route, services);
  registerReviewRoutes(route, services);
  registerHistoryRoutes(route, services);
  registerTicketConfigRoutes(route, services);
  registerTicketsRoutes(route, services);

  return route;
}

export const adminRoute = createAdminRoute();
