import { Hono } from "@hono/hono";

export const healthRoute = new Hono();

healthRoute.get("/", (context) => {
  return context.json({
    status: "ok",
    service: "elx",
  });
});
