import type { Hono } from "@hono/hono";
import { AdminWordsPage } from "../../ui/pages/AdminWordsPage.tsx";
import { AdminWordEditPage } from "../../ui/pages/AdminWordEditPage.tsx";
import { AdminWordsImportPage } from "../../ui/pages/AdminWordsImportPage.tsx";
import type { Services } from "../../db/services.ts";

/** Parses a `"true" | "false" | undefined` query/form value into a boolean. */
function parseTriState(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/** Registers the words CRUD + import routes. */
export function registerWordsRoutes(
  route: Hono,
  services: Services,
) {
  // GET /admin/words
  route.get("/words", async (context) => {
    const page = Number(context.req.query("page") || 1);
    const search = context.req.query("q") || "";
    const difficultyStr = context.req.query("difficulty");

    const difficulty = difficultyStr ? Number(difficultyStr) : undefined;
    const isReal = parseTriState(context.req.query("isReal"));
    const reviewed = parseTriState(context.req.query("reviewed"));

    const limit = 20;
    const { words: wordList, totalCount } = await services.words.listWords({
      search,
      difficulty,
      isReal,
      reviewed,
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
        reviewed,
        success: successMsg,
        error: errorMsg,
      }),
    );
  });

  // POST /admin/words/bulk
  route.post("/words/bulk", async (context) => {
    const body = await context.req.parseBody({ all: true });

    const search = typeof body.q === "string" ? body.q : "";
    const difficultyStr = typeof body.difficulty === "string"
      ? body.difficulty
      : undefined;
    const difficulty = difficultyStr ? Number(difficultyStr) : undefined;
    const isReal = parseTriState(
      typeof body.isReal === "string" ? body.isReal : undefined,
    );
    const reviewed = parseTriState(
      typeof body.reviewed === "string" ? body.reviewed : undefined,
    );
    const filter = { search, difficulty, isReal, reviewed };

    // Preserve the active filter on the redirect back to the list.
    const redirectParams = new URLSearchParams();
    if (search) redirectParams.set("q", search);
    if (difficulty !== undefined) {
      redirectParams.set("difficulty", String(difficulty));
    }
    if (isReal !== undefined) redirectParams.set("isReal", String(isReal));
    if (reviewed !== undefined) {
      redirectParams.set("reviewed", String(reviewed));
    }
    const backTo = (key: "success" | "error", message: string) => {
      redirectParams.set(key, message);
      return context.redirect("/admin/words?" + redirectParams.toString());
    };

    const action = typeof body.action === "string" ? body.action : "";

    // Resolve target ids: either every word matching the filter, or the
    // explicitly checked rows.
    let ids: number[];
    if (body.selectAllMatching === "true") {
      ids = await services.words.findWordIds(filter);
    } else {
      const raw = body.ids;
      const rawList = Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
      ids = rawList
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n));
    }

    if (ids.length === 0) {
      return backTo("error", "No words selected.");
    }

    try {
      switch (action) {
        case "delete": {
          const { deleted, skipped } = await services.words.bulkDelete(ids);
          let msg = `Deleted ${deleted} word(s).`;
          if (skipped.length > 0) {
            msg += ` Skipped ${skipped.length} still referenced elsewhere.`;
          }
          return backTo("success", msg);
        }
        case "set_real": {
          const n = await services.words.bulkSetIsReal(ids, true);
          return backTo("success", `Marked ${n} word(s) as Real.`);
        }
        case "set_pseudo": {
          const n = await services.words.bulkSetIsReal(ids, false);
          return backTo("success", `Marked ${n} word(s) as Pseudoword.`);
        }
        case "mark_reviewed": {
          const n = await services.words.bulkSetReviewed(ids, true);
          return backTo("success", `Marked ${n} word(s) as reviewed.`);
        }
        case "mark_unreviewed": {
          const n = await services.words.bulkSetReviewed(ids, false);
          return backTo("success", `Marked ${n} word(s) as unreviewed.`);
        }
        default:
          return backTo("error", "Unknown bulk action.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return backTo("error", "Bulk action failed: " + errMsg);
    }
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

    const rawSynonyms = typeof body.synonyms === "string" ? body.synonyms : "";
    const synonyms = rawSynonyms
      .split(/[;,]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const rawAntonyms = typeof body.antonyms === "string" ? body.antonyms : "";
    const antonyms = rawAntonyms
      .split(/[;,]/)
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    const rawDefinition = typeof body.definition === "string"
      ? body.definition.trim()
      : "";
    const definition = rawDefinition !== "" ? rawDefinition : null;

    const wordData = {
      value,
      isReal,
      difficulty,
      synonyms,
      antonyms,
      definition,
    };

    if (!value) {
      return context.html(
        AdminWordEditPage({
          word: wordData,
          error: "Word value is required.",
        }),
      );
    }
    if (Number.isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return context.html(
        AdminWordEditPage({
          word: wordData,
          error: "Difficulty must be between 1 and 5.",
        }),
      );
    }

    try {
      await services.words.createWord(wordData);
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent(`Word "${value}" was successfully created.`),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        return context.html(
          AdminWordEditPage({
            word: wordData,
            error: `The word "${value}" already exists.`,
          }),
        );
      }
      return context.html(
        AdminWordEditPage({
          word: wordData,
          error: "Failed to create word: " + errMsg,
        }),
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

      const result = await services.words.importWords(
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
    if (Number.isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }
    const word = await services.words.getWord(id);
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
    if (Number.isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }

    const word = await services.words.getWord(id);
    if (!word) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Word not found."),
      );
    }

    const body = await context.req.parseBody();
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const difficulty = Number(body.difficulty);
    const isReal = body.isReal === "true";

    const rawSynonyms = typeof body.synonyms === "string" ? body.synonyms : "";
    const synonyms = rawSynonyms
      .split(/[;,]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const rawAntonyms = typeof body.antonyms === "string" ? body.antonyms : "";
    const antonyms = rawAntonyms
      .split(/[;,]/)
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    const rawDefinition = typeof body.definition === "string"
      ? body.definition.trim()
      : "";
    const definition = rawDefinition !== "" ? rawDefinition : null;

    const wordData = {
      id,
      value,
      isReal,
      difficulty,
      synonyms,
      antonyms,
      definition,
    };

    if (!value) {
      return context.html(
        AdminWordEditPage({
          word: wordData,
          error: "Word value is required.",
        }),
      );
    }
    if (Number.isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return context.html(
        AdminWordEditPage({
          word: wordData,
          error: "Difficulty must be between 1 and 5.",
        }),
      );
    }

    try {
      await services.words.updateWord(id, wordData);
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent(`Word "${value}" was successfully updated.`),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        return context.html(
          AdminWordEditPage({
            word: wordData,
            error: `The word "${value}" already exists.`,
          }),
        );
      }
      return context.html(
        AdminWordEditPage({
          word: wordData,
          error: "Failed to update word: " + errMsg,
        }),
      );
    }
  });

  // POST /admin/words/:id/delete
  route.post("/words/:id/delete", async (context) => {
    const id = Number(context.req.param("id"));
    if (Number.isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }

    const res = await services.words.deleteWord(id);
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
