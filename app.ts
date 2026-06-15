import { Hono } from "@hono/hono";
import { healthRoute } from "./routes/health.ts";
import { homeRoute } from "./routes/home.ts";
import { requestLogger } from "./routes/logger.ts";

export const app = new Hono();

app.use("*", requestLogger);
app.route("/", homeRoute);
app.route("/health", healthRoute);

app.notFound((context) => context.json({ error: "Not found" }, 404));

app.onError((error, context) => {
  console.error(JSON.stringify({
    level: "error",
    message: error.message,
    stack: error.stack,
  }));

  return context.json({ error: "Internal server error" }, 500);
});
