import type { Hono } from "@hono/hono";
import {
  AdminWordsReviewCard,
  AdminWordsReviewEmpty,
  AdminWordsReviewPage,
} from "../../ui/pages/AdminWordsReviewPage.tsx";
import type { Services } from "../../db/services.ts";

/** Registers the one-at-a-time word review routes. */
export function registerReviewRoutes(route: Hono, services: Services) {
  // GET /admin/words/review
  route.get("/words/review", async (context) => {
    const word = await services.words.getNextUnreviewed();
    const prog = await services.words.progress();

    let cardHtml;
    if (!word) {
      cardHtml = AdminWordsReviewEmpty();
    } else {
      cardHtml = AdminWordsReviewCard({
        word,
        reviewed: prog.reviewed,
        total: prog.total,
        remaining: prog.remaining,
      });
    }

    return context.html(AdminWordsReviewPage({ cardHtml }));
  });

  // POST /admin/words/review/:id (Confirm & Next)
  route.post("/words/review/:id", async (context) => {
    const id = Number(context.req.param("id"));
    const body = await context.req.parseBody();
    const value = (body.value || "") as string;
    const isReal = body.isReal === "on" || body.isReal === "true";
    const difficulty = Number(body.difficulty);

    try {
      await services.words.reviewWord(id, { value, isReal, difficulty });

      // Load next card
      const word = await services.words.getNextUnreviewed(id);
      const prog = await services.words.progress();

      if (!word) {
        return context.html(AdminWordsReviewEmpty());
      }

      return context.html(
        AdminWordsReviewCard({
          word,
          reviewed: prog.reviewed,
          total: prog.total,
          remaining: prog.remaining,
        }),
      );
    } catch (err) {
      // Re-render the current card with validation error
      const prog = await services.words.progress();
      const currentWord = await services.words.getWord(id);
      const errMsg = err instanceof Error ? err.message : String(err);

      return context.html(
        AdminWordsReviewCard({
          word: currentWord || { id, value, isReal, difficulty },
          reviewed: prog.reviewed,
          total: prog.total,
          remaining: prog.remaining,
          error: errMsg,
        }),
      );
    }
  });

  // POST /admin/words/review/:id/skip (Skip & Next)
  route.post("/words/review/:id/skip", async (context) => {
    const id = Number(context.req.param("id"));
    const word = await services.words.skipWord(id);
    const prog = await services.words.progress();

    if (!word) {
      return context.html(AdminWordsReviewEmpty());
    }

    return context.html(
      AdminWordsReviewCard({
        word,
        reviewed: prog.reviewed,
        total: prog.total,
        remaining: prog.remaining,
      }),
    );
  });
}
