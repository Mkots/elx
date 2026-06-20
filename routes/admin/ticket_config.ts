import type { Hono } from "@hono/hono";
import { AdminTicketConfigPage } from "../../ui/pages/AdminTicketConfigPage.tsx";
import type { AdminTicketConfigLoader } from "./loaders/ticket_config.ts";

export function registerTicketConfigRoutes(
  route: Hono,
  loader: AdminTicketConfigLoader,
) {
  route.get("/ticket-config", async (context) => {
    const config = await loader.getActiveConfig();
    const stats = await loader.getDatabaseWordStats();

    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    return context.html(
      AdminTicketConfigPage({
        config,
        stats,
        success: successMsg,
        error: errorMsg,
      }),
    );
  });

  route.post("/ticket-config/edit", async (context) => {
    const body = await context.req.parseBody();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    const difficulty1Count = Number(body.difficulty1Count ?? 0);
    const difficulty2Count = Number(body.difficulty2Count ?? 0);
    const difficulty3Count = Number(body.difficulty3Count ?? 0);
    const difficulty4Count = Number(body.difficulty4Count ?? 0);
    const difficulty5Count = Number(body.difficulty5Count ?? 0);

    const realCount = Number(body.realCount ?? 0);
    const pseudoCount = Number(body.pseudoCount ?? 0);

    const synonymsCount = Number(body.synonymsCount ?? 0);
    const spellingCount = Number(body.spellingCount ?? 0);
    const definitionCount = Number(body.definitionCount ?? 0);

    const randomizeOrder = body.randomizeOrder === "on";

    const config = {
      name: name || "Default Config",
      isActive: true,
      difficulty1Count,
      difficulty2Count,
      difficulty3Count,
      difficulty4Count,
      difficulty5Count,
      realCount,
      pseudoCount,
      synonymsCount,
      spellingCount,
      definitionCount,
      randomizeOrder,
    };

    try {
      if (!name) {
        throw new Error("Configuration name is required");
      }

      if (
        difficulty1Count < 0 || difficulty2Count < 0 || difficulty3Count < 0 ||
        difficulty4Count < 0 || difficulty5Count < 0 ||
        realCount < 0 || pseudoCount < 0 || synonymsCount < 0 ||
        spellingCount < 0 || definitionCount < 0
      ) {
        throw new Error("Counts cannot be negative");
      }

      const totalDiff = difficulty1Count + difficulty2Count + difficulty3Count +
        difficulty4Count + difficulty5Count;
      const totalRealPseudo = realCount + pseudoCount;
      if (totalDiff !== totalRealPseudo) {
        throw new Error(
          `Total difficulty counts (${totalDiff}) must equal real + pseudoword counts (${totalRealPseudo})`,
        );
      }

      const stats = await loader.getDatabaseWordStats();
      if (realCount > stats.totalReal) {
        throw new Error(
          `Requested real words (${realCount}) exceeds available in database (${stats.totalReal})`,
        );
      }
      if (pseudoCount > stats.totalPseudo) {
        throw new Error(
          `Requested pseudowords (${pseudoCount}) exceeds available in database (${stats.totalPseudo})`,
        );
      }
      if (difficulty1Count > stats.diffCounts[1]) {
        throw new Error(
          `Difficulty 1 count (${difficulty1Count}) exceeds available in database (${
            stats.diffCounts[1]
          })`,
        );
      }
      if (difficulty2Count > stats.diffCounts[2]) {
        throw new Error(
          `Difficulty 2 count (${difficulty2Count}) exceeds available in database (${
            stats.diffCounts[2]
          })`,
        );
      }
      if (difficulty3Count > stats.diffCounts[3]) {
        throw new Error(
          `Difficulty 3 count (${difficulty3Count}) exceeds available in database (${
            stats.diffCounts[3]
          })`,
        );
      }
      if (difficulty4Count > stats.diffCounts[4]) {
        throw new Error(
          `Difficulty 4 count (${difficulty4Count}) exceeds available in database (${
            stats.diffCounts[4]
          })`,
        );
      }
      if (difficulty5Count > stats.diffCounts[5]) {
        throw new Error(
          `Difficulty 5 count (${difficulty5Count}) exceeds available in database (${
            stats.diffCounts[5]
          })`,
        );
      }

      if (synonymsCount > stats.realSynonyms) {
        throw new Error(
          `Requested synonyms challenge count (${synonymsCount}) exceeds available real words with synonyms (${stats.realSynonyms})`,
        );
      }
      if (definitionCount > stats.realDefinitions) {
        throw new Error(
          `Requested definitions challenge count (${definitionCount}) exceeds available real words with definitions (${stats.realDefinitions})`,
        );
      }

      await loader.updateActiveConfig(config);
      return context.redirect(
        "/admin/ticket-config?success=" +
          encodeURIComponent("Configuration saved successfully"),
      );
    } catch (err) {
      const stats = await loader.getDatabaseWordStats();
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminTicketConfigPage({
          config,
          stats,
          error: errMsg,
        }),
      );
    }
  });
}
