import { and, desc, ilike, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { testSessions } from "../schema.ts";

export type TestRun = typeof testSessions.$inferSelect;

export async function listHistory(params: {
  search?: string;
  orderBy: string;
  orderDir: "asc" | "desc";
  page: number;
  limit: number;
}): Promise<{ history: TestRun[]; totalCount: number }> {
  const { search, orderBy, orderDir, page, limit } = params;
  // deno-lint-ignore no-explicit-any
  const conditions: any[] = [];
  if (search) {
    conditions.push(ilike(sql`${testSessions.id}::text`, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const totalCountResult = await db
    .select({ count: sql<number>`count(${testSessions.id})::integer` })
    .from(testSessions)
    .where(whereClause);
  const totalCount = totalCountResult[0]?.count ?? 0;

  // deno-lint-ignore no-explicit-any
  let orderByClause: any;
  if (orderBy === "score") {
    orderByClause = orderDir === "asc"
      ? testSessions.score
      : desc(testSessions.score);
  } else {
    orderByClause = orderDir === "asc"
      ? testSessions.completedAt
      : desc(testSessions.completedAt);
  }

  const result = await db
    .select()
    .from(testSessions)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return { history: result, totalCount };
}

export async function exportAllHistory(): Promise<TestRun[]> {
  return await db.select().from(testSessions).orderBy(
    desc(testSessions.completedAt),
  );
}

export async function saveStage2Result(
  sessionId: string,
  result: { score: number; truthfulness: number },
  ticketId: number,
  stage1Selection: number[],
): Promise<void> {
  await db.insert(testSessions).values({
    id: sessionId,
    score: result.score,
    truthfulness: result.truthfulness,
    ticketId,
    completedAt: new Date(),
    stage1Selection,
  });
}

export async function getDashboardStats(): Promise<{
  totalRuns: number;
  avgScore: number;
  avgTruthfulness: number;
  recentRuns: TestRun[];
}> {
  const stats = await db
    .select({
      totalRuns: sql<number>`count(${testSessions.id})::integer`,
      avgScore: sql<number>`coalesce(avg(${testSessions.score}), 0)::numeric`,
      avgTruthfulness: sql<
        number
      >`coalesce(avg(${testSessions.truthfulness}), 0)::numeric`,
    })
    .from(testSessions);

  const totalRuns = stats[0]?.totalRuns ?? 0;
  const avgScore = Math.round(Number(stats[0]?.avgScore ?? 0) * 10) / 10;
  const avgTruthfulness =
    Math.round(Number(stats[0]?.avgTruthfulness ?? 0) * 10) / 10;

  const recentRuns = await db
    .select()
    .from(testSessions)
    .orderBy(desc(testSessions.completedAt))
    .limit(10);

  return {
    totalRuns,
    avgScore,
    avgTruthfulness,
    recentRuns,
  };
}
