import type { Hono } from "@hono/hono";
import {
  AdminWordsReviewCard,
  AdminWordsReviewEmpty,
  AdminWordsReviewPage,
} from "../../ui/pages/AdminWordsReviewPage.tsx";
import type { AdminReviewLoader } from "./loaders/review.ts";
import type { AdminWordsLoader } from "./loaders/words.ts";

/** Registers the one-at-a-time word review routes. */
export function registerReviewRoutes(
  route: Hono,
  reviewLoader: AdminReviewLoader,
  wordsLoader: AdminWordsLoader,
) {
  // GET /admin/words/review
  route.get("/words/review", async (context) => {
    const word = await reviewLoader.getNextUnreviewed();
    const prog = await reviewLoader.progress();

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
      await reviewLoader.reviewWord(id, { value, isReal, difficulty });

      // Load next card
      const word = await reviewLoader.getNextUnreviewed(id);
      const prog = await reviewLoader.progress();

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
      const prog = await reviewLoader.progress();
      const currentWord = await wordsLoader.getWord(id);
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
    const word = await reviewLoader.skipWord(id);
    const prog = await reviewLoader.progress();

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
