import { desc, sql } from "drizzle-orm";
import { db } from "../../../db/client.ts";
import { testHistory } from "../../../db/schema.ts";
import type { TestRun } from "../../../ui/pages/AdminDashboardPage.tsx";

export interface AdminDashboardLoader {
  getDashboardStats(): Promise<{
    totalRuns: number;
    avgScore: number;
    avgTruthfulness: number;
    recentRuns: TestRun[];
  }>;
}

export const databaseAdminDashboardLoader: AdminDashboardLoader = {
  async getDashboardStats() {
    const stats = await db
      .select({
        totalRuns: sql<number>`count(${testHistory.id})::integer`,
        avgScore: sql<
          number
        >`coalesce(avg(${testHistory.score}), 0)::numeric`,
        avgTruthfulness: sql<
          number
        >`coalesce(avg(${testHistory.truthfulness}), 0)::numeric`,
      })
      .from(testHistory);

    const totalRuns = stats[0]?.totalRuns ?? 0;
    const avgScore = Math.round(Number(stats[0]?.avgScore ?? 0) * 10) / 10;
    const avgTruthfulness =
      Math.round(Number(stats[0]?.avgTruthfulness ?? 0) * 10) / 10;

    const recentRuns = await db
      .select()
      .from(testHistory)
      .orderBy(desc(testHistory.completedAt))
      .limit(10);

    return {
      totalRuns,
      avgScore,
      avgTruthfulness,
      recentRuns,
    };
  },
};
