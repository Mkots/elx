import type { Hono } from "@hono/hono";
import { AdminHistoryPage } from "../../ui/pages/AdminHistoryPage.tsx";
import type { AdminHistoryLoader } from "./loaders/history.ts";

/** Registers the test-history list + export routes. */
export function registerHistoryRoutes(
  route: Hono,
  historyLoader: AdminHistoryLoader,
) {
  // GET /admin/history
  route.get("/history", async (context) => {
    const page = Number(context.req.query("page") || 1);
    const search = context.req.query("q") || "";
    const orderBy = context.req.query("orderBy") || "completedAt";
    const orderDir = (context.req.query("orderDir") || "desc") as
      | "asc"
      | "desc";

    const limit = 20;
    try {
      const { history: historyList, totalCount } = await historyLoader
        .listHistory({
          search,
          orderBy,
          orderDir,
          page,
          limit,
        });

      const totalPages = Math.ceil(totalCount / limit);

      const successMsg = context.req.query("success") || undefined;
      const errorMsg = context.req.query("error") || undefined;

      return context.html(
        AdminHistoryPage({
          history: historyList,
          totalCount,
          page,
          totalPages,
          search,
          orderBy,
          orderDir,
          success: successMsg,
          error: errorMsg,
        }),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminHistoryPage({
          history: [],
          totalCount: 0,
          page: 1,
          totalPages: 0,
          search,
          orderBy,
          orderDir,
          error: "Failed to load test history: " + errMsg,
        }),
      );
    }
  });

  // GET /admin/history/export
  route.get("/history/export", async (context) => {
    const format = context.req.query("format") || "csv";
    if (format !== "csv" && format !== "json") {
      return context.text("Invalid format. Must be csv or json.", 400);
    }

    try {
      const allHistory = await historyLoader.exportAllHistory();

      if (format === "csv") {
        let csvContent = "id,session_id,score,truthfulness,completed_at\n";
        for (const run of allHistory) {
          const dateStr = run.completedAt instanceof Date
            ? run.completedAt.toISOString()
            : new Date(run.completedAt).toISOString();
          let safeSessionId = run.sessionId;
          if (
            safeSessionId.includes(",") || safeSessionId.includes('"') ||
            safeSessionId.includes("\n")
          ) {
            safeSessionId = `"${safeSessionId.replace(/"/g, '""')}"`;
          }
          csvContent +=
            `${run.id},${safeSessionId},${run.score},${run.truthfulness},${dateStr}\n`;
        }

        context.header("Content-Type", "text/csv");
        context.header(
          "Content-Disposition",
          "attachment; filename=elx-test-history.csv",
        );
        return context.body(csvContent);
      } else {
        context.header("Content-Type", "application/json");
        context.header(
          "Content-Disposition",
          "attachment; filename=elx-test-history.json",
        );
        return context.json(allHistory);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.text("Failed to export test history: " + errMsg, 500);
    }
  });
}
