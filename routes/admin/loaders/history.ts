import { and, desc, ilike, sql } from "drizzle-orm";
import { withDb } from "../../../db/client.ts";
import { testHistory } from "../../../db/schema.ts";

export interface AdminHistoryLoader {
  listHistory(params: {
    search?: string;
    orderBy: string;
    orderDir: "asc" | "desc";
    page: number;
    limit: number;
  }): Promise<
    { history: (typeof testHistory.$inferSelect)[]; totalCount: number }
  >;
  exportAllHistory(): Promise<(typeof testHistory.$inferSelect)[]>;
}

export const databaseAdminHistoryLoader: AdminHistoryLoader = {
  listHistory({ search, orderBy, orderDir, page, limit }) {
    return withDb(async (db) => {
      // deno-lint-ignore no-explicit-any
      const conditions: any[] = [];
      if (search) {
        conditions.push(ilike(testHistory.sessionId, `%${search}%`));
      }

      const whereClause = conditions.length > 0
        ? and(...conditions)
        : undefined;
      const offset = (page - 1) * limit;

      const totalCountResult = await db
        .select({ count: sql<number>`count(${testHistory.id})::integer` })
        .from(testHistory)
        .where(whereClause);
      const totalCount = totalCountResult[0]?.count ?? 0;

      // deno-lint-ignore no-explicit-any
      let orderByClause: any;
      if (orderBy === "score") {
        orderByClause = orderDir === "asc"
          ? testHistory.score
          : desc(testHistory.score);
      } else {
        orderByClause = orderDir === "asc"
          ? testHistory.completedAt
          : desc(testHistory.completedAt);
      }

      const result = await db
        .select()
        .from(testHistory)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return { history: result, totalCount };
    });
  },

  exportAllHistory() {
    return withDb((db) =>
      db.select().from(testHistory).orderBy(desc(testHistory.completedAt))
    );
  },
};
