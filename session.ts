import type { Context } from "@hono/hono";
import { and, eq } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import { db } from "./db/client.ts";
import { testAnswers, testSessions } from "./db/schema.ts";

const COOKIE_NAME = "sessionId";

export function getSessionId(context: Context): string | undefined {
  return getCookie(context, COOKIE_NAME);
}

export function setSessionCookie(context: Context, sessionId: string): void {
  setCookie(context, COOKIE_NAME, sessionId, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: Deno.env.get("APP_ENV") === "production",
  });
}

export async function saveWordSelection(
  sessionId: string,
  wordIds: number[],
): Promise<void> {
  await db.insert(testSessions).values({
    id: sessionId,
    stage1Selection: wordIds,
    completedAt: null,
    score: null,
    truthfulness: null,
  }).onConflictDoUpdate({
    target: testSessions.id,
    set: {
      stage1Selection: wordIds,
      completedAt: null,
      score: null,
      truthfulness: null,
    },
  });

  await db.delete(testAnswers).where(
    and(
      eq(testAnswers.sessionId, sessionId),
      eq(testAnswers.stage, 2),
    ),
  );
}

export async function loadWordSelection(
  sessionId: string,
): Promise<number[]> {
  const rows = await db.select({
    stage1Selection: testSessions.stage1Selection,
  })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId))
    .limit(1);
  return rows[0]?.stage1Selection ?? [];
}

export type Stage2Answers = Record<string, boolean>;

export async function loadStage2Answers(
  sessionId: string,
): Promise<Stage2Answers> {
  const rows = await db.select({
    questionIndex: testAnswers.questionIndex,
    answer: testAnswers.answer,
  })
    .from(testAnswers)
    .where(
      and(
        eq(testAnswers.sessionId, sessionId),
        eq(testAnswers.stage, 2),
      ),
    );

  return Object.fromEntries(
    rows.map((row) => [String(row.questionIndex), row.answer === "know"]),
  );
}

export async function saveStage2Answer(
  sessionId: string,
  wordId: number,
  known: boolean,
): Promise<void> {
  const answer = known ? "know" : "dont_know";
  await db.insert(testAnswers).values({
    sessionId,
    questionIndex: wordId,
    questionType: "verification",
    stage: 2,
    answer,
    isCorrect: null,
    answeredAt: new Date(),
  }).onConflictDoUpdate({
    target: [
      testAnswers.sessionId,
      testAnswers.stage,
      testAnswers.questionIndex,
    ],
    set: {
      answer,
      answeredAt: new Date(),
    },
  });
}

export interface Stage2Result {
  score: number;
  truthfulness: number;
}

export async function saveStage2Result(
  sessionId: string,
  result: Stage2Result,
): Promise<void> {
  await db.update(testSessions)
    .set({
      score: result.score,
      truthfulness: result.truthfulness,
      completedAt: new Date(),
    })
    .where(eq(testSessions.id, sessionId));
}

export async function loadStage2Result(
  sessionId: string,
): Promise<Stage2Result | null> {
  const rows = await db.select({
    score: testSessions.score,
    truthfulness: testSessions.truthfulness,
  })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row || row.score === null || row.truthfulness === null) return null;
  return { score: row.score, truthfulness: row.truthfulness };
}

export async function saveSessionTicketId(
  sessionId: string,
  ticketId: number,
): Promise<void> {
  await db.insert(testSessions).values({
    id: sessionId,
    ticketId,
  }).onConflictDoUpdate({
    target: testSessions.id,
    set: { ticketId },
  });
}

export async function loadSessionTicketId(
  sessionId: string,
): Promise<number | null> {
  const rows = await db.select({ ticketId: testSessions.ticketId })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId))
    .limit(1);
  return rows[0]?.ticketId ?? null;
}
