import { Hono } from "@hono/hono";
import { analyticsProps } from "../analytics.ts";
import { HomePage } from "../ui/pages/HomePage.tsx";
import type { Services } from "../db/services.ts";

export function createHomeRoute(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    try {
      const publishedTickets = await services.tickets.getPublishedTickets();
      return context.html(
        HomePage({ analytics: analyticsProps(context), publishedTickets }),
      );
    } catch (err) {
      console.error("Failed to load published tickets on home page:", err);
      return context.html(
        HomePage({ analytics: analyticsProps(context), publishedTickets: [] }),
      );
    }
  });

  return route;
}
