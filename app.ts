import { Hono } from "@hono/hono";
import { healthRoute } from "./routes/health.ts";
import { homeRoute } from "./routes/home.ts";
import { requestLogger } from "./routes/logger.ts";
import {
  createSeedVerificationRoute,
  type SeedVerificationLoader,
} from "./routes/seed_verification.ts";

interface CreateAppOptions {
  seedVerificationLoader?: SeedVerificationLoader;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();

  app.use("*", requestLogger);
  app.route("/", homeRoute);
  app.route("/health", healthRoute);
  app.route(
    "/health/seeds",
    createSeedVerificationRoute(options.seedVerificationLoader),
  );

  app.notFound((context) => context.json({ error: "Not found" }, 404));

  app.onError((error, context) => {
    console.error(JSON.stringify({
      level: "error",
      message: error.message,
      stack: error.stack,
    }));

    return context.json({ error: "Internal server error" }, 500);
  });

  return app;
}

export const app = createApp();
