import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { NONCE, secureHeaders } from "hono/secure-headers";
import { healthRoute } from "./routes/health.ts";
import { createHomeRoute } from "./routes/home.ts";
import { requestLogger } from "./routes/logger.ts";
import { createResultRoute } from "./routes/result.ts";
import { createSeedVerificationRoute } from "./routes/seed_verification.ts";
import { createStage1Route } from "./routes/stage1.ts";
import { createStage2Route } from "./routes/stage2.ts";
import { createStage3Route } from "./routes/stage3.ts";
import { createAdminRoute } from "./routes/admin/index.ts";
import { createConsentRoute } from "./routes/consent.ts";
import { legalRoute } from "./routes/legal.ts";
import { defaultServices, type Services } from "./db/services.ts";
import { NotFoundPage } from "./ui/pages/NotFoundPage.tsx";

export function createApp(services: Services = defaultServices) {
  const app = new Hono();

  app.use("*", requestLogger);
  const appOrigin = Deno.env.get("APP_ORIGIN");
  app.use("*", csrf(appOrigin ? { origin: appOrigin } : undefined));
  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'", "https://www.googletagmanager.com"],
        frameAncestors: ["'self'"],
        frameSrc: ["'self'", "https://www.googletagmanager.com"],
        imgSrc: ["'self'", "data:", "https://www.googletagmanager.com"],
        objectSrc: ["'none'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          NONCE,
          "https://www.googletagmanager.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    }),
  );
  app.use("/static/*", serveStatic({ root: "./" }));
  app.route("/", createHomeRoute(services));
  app.route("/health", healthRoute);
  app.route("/health/seeds", createSeedVerificationRoute(services));
  app.route("/", legalRoute());
  app.route("/consent", createConsentRoute(services));
  app.route("/stage/1", createStage1Route(services));
  app.route("/stage/2", createStage2Route(services));
  app.route("/stage/3", createStage3Route(services));
  app.route("/result", createResultRoute(services));
  app.route("/admin", createAdminRoute(services));

  app.notFound((context) => {
    if (context.req.path.startsWith("/health")) {
      return context.json({ error: "Not found" }, 404);
    }
    return context.html(NotFoundPage(), 404);
  });

  app.onError((error, context) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

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
