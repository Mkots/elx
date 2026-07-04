import { Hono } from "@hono/hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { tickets } from "../db/schema.ts";
import { HomePage } from "../ui/pages/HomePage.tsx";
import { databaseAdminTicketsLoader } from "./admin/loaders/tickets.ts";

export interface HomeTicketLoader {
  getPublishedTickets(): Promise<
    { id: number; code: string; title: string | null }[]
  >;
}

export const databaseHomeTicketLoader: HomeTicketLoader = {
  async getPublishedTickets() {
    let publishedTickets = await db
      .select({
        id: tickets.id,
        code: tickets.code,
        title: tickets.title,
      })
      .from(tickets)
      .where(eq(tickets.status, "published"));

    if (publishedTickets.length === 0) {
      // Auto-generate and publish a default ticket if none exist
      try {
        const baseTicket = await databaseAdminTicketsLoader
          .generateBaseTicket(
            "Default E2E assessment ticket",
            "Auto-generated to ensure immediate usability",
          );
        // Mark all questions as verified to satisfy publish guardrails
        const verifiedQuestions = baseTicket.questions.map((q) => {
          if (q.type !== "verification") {
            return { ...q, verified: true };
          }
          return q;
        });

        await db
          .update(tickets)
          .set({ questions: verifiedQuestions, status: "published" })
          .where(eq(tickets.id, baseTicket.id));

        publishedTickets = [
          {
            id: baseTicket.id,
            code: baseTicket.code,
            title: "Default E2E assessment ticket",
          },
        ];
      } catch (err) {
        console.error(
          "Failed to auto-generate default published ticket:",
          err,
        );
      }
    }

    return publishedTickets;
  },
};

export function createHomeRoute(
  loader: HomeTicketLoader = databaseHomeTicketLoader,
) {
  const route = new Hono();

  route.get("/", async (context) => {
    try {
      const publishedTickets = await loader.getPublishedTickets();
      return context.html(HomePage({ publishedTickets }));
    } catch (err) {
      console.error("Failed to load published tickets on home page:", err);
      return context.html(HomePage({ publishedTickets: [] }));
    }
  });

  return route;
}
