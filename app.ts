import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { healthRoute } from "./routes/health.ts";
import { homeRoute } from "./routes/home.ts";
import { requestLogger } from "./routes/logger.ts";
import { createResultRoute, type ResultSessionStore } from "./routes/result.ts";
import {
  createSeedVerificationRoute,
  type SeedVerificationLoader,
} from "./routes/seed_verification.ts";
import {
  createStage1Route,
  type Stage1SessionStore,
  type Stage1WordLoader,
} from "./routes/stage1.ts";
import {
  createStage2Route,
  type Stage2SessionStore,
  type Stage2WordLoader,
} from "./routes/stage2.ts";
import {
  type AdminChallengesLoader,
  type AdminDashboardLoader,
  type AdminHistoryLoader,
  type AdminReviewLoader,
  type AdminWordsLoader,
  createAdminRoute,
} from "./routes/admin.tsx";

interface CreateAppOptions {
  seedVerificationLoader?: SeedVerificationLoader;
  stage1WordLoader?: Stage1WordLoader;
  stage1SessionStore?: Stage1SessionStore;
  stage2WordLoader?: Stage2WordLoader;
  stage2SessionStore?: Stage2SessionStore;
  resultSessionStore?: ResultSessionStore;
  adminDashboardLoader?: AdminDashboardLoader;
  adminWordsLoader?: AdminWordsLoader;
  adminChallengesLoader?: AdminChallengesLoader;
  adminHistoryLoader?: AdminHistoryLoader;
  adminReviewLoader?: AdminReviewLoader;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();

  app.use("*", requestLogger);
  app.use("/static/*", serveStatic({ root: "./" }));
  app.route("/", homeRoute);
  app.route("/health", healthRoute);
  app.route(
    "/health/seeds",
    createSeedVerificationRoute(options.seedVerificationLoader),
  );
  app.route(
    "/stage/1",
    createStage1Route(options.stage1WordLoader, options.stage1SessionStore),
  );
  app.route(
    "/stage/2",
    createStage2Route(options.stage2WordLoader, options.stage2SessionStore),
  );
  app.route("/result", createResultRoute(options.resultSessionStore));
  app.route(
    "/admin",
    createAdminRoute(
      options.adminDashboardLoader,
      options.adminWordsLoader,
      options.adminChallengesLoader,
      options.adminHistoryLoader,
      options.adminReviewLoader,
    ),
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
