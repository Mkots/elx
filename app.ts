import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { healthRoute } from "./routes/health.ts";
import { createHomeRoute } from "./routes/home.ts";
import { requestLogger } from "./routes/logger.ts";
import { createResultRoute } from "./routes/result.ts";
import { createSeedVerificationRoute } from "./routes/seed_verification.ts";
import { createStage1Route } from "./routes/stage1.ts";
import { createStage2Route } from "./routes/stage2.ts";
import { createAdminRoute } from "./routes/admin/index.ts";
import { defaultServices, type Services } from "./db/services.ts";

export function createApp(services: Services = defaultServices) {
  const app = new Hono();

  app.use("*", requestLogger);
  app.use("/static/*", serveStatic({ root: "./" }));
  app.route("/", createHomeRoute(services));
  app.route("/health", healthRoute);
  app.route("/health/seeds", createSeedVerificationRoute(services));
  app.route("/stage/1", createStage1Route(services));
  app.route("/stage/2", createStage2Route(services));
  app.route("/result", createResultRoute(services));
  app.route("/admin", createAdminRoute(services));

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
