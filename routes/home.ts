import { Hono } from "@hono/hono";
import { HomePage } from "../ui/pages/HomePage.tsx";
import type { Services } from "../db/services.ts";

export function createHomeRoute(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    try {
      const publishedTickets = await services.tickets.getPublishedTickets();
      return context.html(HomePage({ publishedTickets }));
    } catch (err) {
      console.error("Failed to load published tickets on home page:", err);
      return context.html(HomePage({ publishedTickets: [] }));
    }
  });

  return route;
}
