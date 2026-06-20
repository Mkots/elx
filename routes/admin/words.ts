import type { Hono } from "@hono/hono";
import { AdminWordsPage } from "../../ui/pages/AdminWordsPage.tsx";
import { AdminWordEditPage } from "../../ui/pages/AdminWordEditPage.tsx";
import { AdminWordsImportPage } from "../../ui/pages/AdminWordsImportPage.tsx";
import type { AdminWordsLoader } from "./loaders/words.ts";

/** Registers the words CRUD + import routes. */
export function registerWordsRoutes(
  route: Hono,
  wordsLoader: AdminWordsLoader,
) {
  // GET /admin/words
  route.get("/words", async (context) => {
    const page = Number(context.req.query("page") || 1);
    const search = context.req.query("q") || "";
    const difficultyStr = context.req.query("difficulty");
    const isRealStr = context.req.query("isReal");

    const difficulty = difficultyStr ? Number(difficultyStr) : undefined;
    const isReal = isRealStr === "true"
      ? true
      : isRealStr === "false"
      ? false
      : undefined;

    const limit = 20;
    const { words: wordList, totalCount } = await wordsLoader.listWords({
      search,
      difficulty,
      isReal,
      page,
      limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    return context.html(
      AdminWordsPage({
        words: wordList,
        totalCount,
        page,
        totalPages,
        search,
        difficulty,
        isReal,
        success: successMsg,
        error: errorMsg,
      }),
    );
  });

  // GET /admin/words/new
  route.get("/words/new", (context) => {
    return context.html(AdminWordEditPage({}));
  });

  // POST /admin/words/new
  route.post("/words/new", async (context) => {
    const body = await context.req.parseBody();
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const difficulty = Number(body.difficulty);
    const isReal = body.isReal === "true";

    if (!value) {
      return context.html(
        AdminWordEditPage({ error: "Word value is required." }),
      );
    }
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return context.html(
        AdminWordEditPage({ error: "Difficulty must be between 1 and 5." }),
      );
    }

    try {
      await wordsLoader.createWord({ value, isReal, difficulty });
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent(`Word "${value}" was successfully created.`),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        return context.html(
          AdminWordEditPage({ error: `The word "${value}" already exists.` }),
        );
      }
      return context.html(
        AdminWordEditPage({ error: "Failed to create word: " + errMsg }),
      );
    }
  });

  // GET /admin/words/import
  route.get("/words/import", (context) => {
    return context.html(AdminWordsImportPage({}));
  });

  // POST /admin/words/import
  route.post("/words/import", async (context) => {
    let configStr = "";
    try {
      const body = await context.req.parseBody();
      configStr = (body.config || "") as string;
      const fileObj = body.file;
      const dryRun = body.dryRun === "true";

      if (!fileObj || !(fileObj instanceof File)) {
        return context.html(
          AdminWordsImportPage({
            error: "Please upload a valid CSV or JSON file.",
            configString: configStr,
          }),
        );
      }

      const fileContent = await fileObj.text();

      const result = await wordsLoader.importWords(
        fileContent,
        configStr,
        dryRun,
      );

      const successMsg = dryRun
        ? "Dry run completed successfully. View the preview summary below."
        : "Import completed successfully.";

      return context.html(
        AdminWordsImportPage({
          result,
          success: successMsg,
          configString: configStr,
        }),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminWordsImportPage({
          error: errMsg,
          configString: configStr,
        }),
      );
    }
  });

  // GET /admin/words/:id/edit
  route.get("/words/:id/edit", async (context) => {
    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }
    const word = await wordsLoader.getWord(id);
    if (!word) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Word not found."),
      );
    }
    return context.html(AdminWordEditPage({ word }));
  });

  // POST /admin/words/:id/edit
  route.post("/words/:id/edit", async (context) => {
    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }

    const word = await wordsLoader.getWord(id);
    if (!word) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Word not found."),
      );
    }

    const body = await context.req.parseBody();
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const difficulty = Number(body.difficulty);
    const isReal = body.isReal === "true";

    if (!value) {
      return context.html(
        AdminWordEditPage({
          word: { id, value, isReal, difficulty },
          error: "Word value is required.",
        }),
      );
    }
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return context.html(
        AdminWordEditPage({
          word: { id, value, isReal, difficulty },
          error: "Difficulty must be between 1 and 5.",
        }),
      );
    }

    try {
      await wordsLoader.updateWord(id, { value, isReal, difficulty });
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent(`Word "${value}" was successfully updated.`),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        return context.html(
          AdminWordEditPage({
            word: { id, value, isReal, difficulty },
            error: `The word "${value}" already exists.`,
          }),
        );
      }
      return context.html(
        AdminWordEditPage({
          word: { id, value, isReal, difficulty },
          error: "Failed to update word: " + errMsg,
        }),
      );
    }
  });

  // POST /admin/words/:id/delete
  route.post("/words/:id/delete", async (context) => {
    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }

    const res = await wordsLoader.deleteWord(id);
    if (res.success) {
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent("Word successfully deleted."),
      );
    } else {
      return context.redirect(
        "/admin/words?error=" +
          encodeURIComponent(res.error || "Failed to delete word."),
      );
    }
  });
}
