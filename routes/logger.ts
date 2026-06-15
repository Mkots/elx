import type { MiddlewareHandler } from "@hono/hono";

export const requestLogger: MiddlewareHandler = async (context, next) => {
  const startedAt = performance.now();

  await next();

  console.log(JSON.stringify({
    level: "info",
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  }));
};
