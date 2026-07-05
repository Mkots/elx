import type { Context } from "@hono/hono";
import { and, asc, eq } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import { db } from "./db/client.ts";
import { testAnswers, testSessions } from "./db/schema.ts";
import { computeScore, computeVocabularySize } from "./scoring/lextale.ts";

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
  const now = new Date();
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

  await db.delete(testAnswers).where(eq(testAnswers.sessionId, sessionId));

  if (wordIds.length > 0) {
    await db.insert(testAnswers).values(
      wordIds.map((wordId) => ({
        sessionId,
        questionIndex: wordId,
        questionType: "verification",
        stage: 1,
        answer: "selected",
        isCorrect: null,
        answeredAt: now,
      })),
    );
  }
}

export async function loadWordSelection(
  sessionId: string,
): Promise<number[]> {
  const answerRows = await db.select({
    questionIndex: testAnswers.questionIndex,
  })
    .from(testAnswers)
    .where(
      and(
        eq(testAnswers.sessionId, sessionId),
        eq(testAnswers.stage, 1),
      ),
    )
    .orderBy(asc(testAnswers.id));

  if (answerRows.length > 0) {
    return answerRows.map((row) => row.questionIndex);
  }

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
  const now = new Date();
  await db.insert(testAnswers).values({
    sessionId,
    questionIndex: wordId,
    questionType: "verification",
    stage: 2,
    answer,
    isCorrect: null,
    answeredAt: now,
  }).onConflictDoUpdate({
    target: [
      testAnswers.sessionId,
      testAnswers.stage,
      testAnswers.questionIndex,
    ],
    set: {
      answer,
      answeredAt: now,
    },
  });
}

export interface Stage2Result {
  score: number;
  truthfulness: number;
  vocabularySize?: number | null;
}

export async function saveStage2Result(
  sessionId: string,
  result: Stage2Result,
): Promise<void> {
  await db.update(testSessions)
    .set({
      score: result.score,
      truthfulness: result.truthfulness,
      vocabularySize: result.vocabularySize,
      completedAt: new Date(),
    })
    .where(eq(testSessions.id, sessionId));
}

export interface Stage2ScoringWord {
  id: number;
  isReal: boolean;
  difficulty?: number;
}

export async function completeStage2Result(
  sessionId: string,
  words: Stage2ScoringWord[],
): Promise<Stage2Result> {
  const answers = await loadStage2Answers(sessionId);
  const result: Stage2Result = computeScore(
    words.map((word) => ({
      isReal: word.isReal,
      known: answers[String(word.id)] === true,
    })),
  );
  const vocabularySize = computeVocabularySize(
    words.map((word) => ({
      isReal: word.isReal,
      difficulty: word.difficulty ?? 3, // fallback to 3
      known: answers[String(word.id)] === true,
    })),
  );
  result.vocabularySize = vocabularySize;
  await saveStage2Result(sessionId, result);
  return result;
}

export async function loadStage2Result(
  sessionId: string,
): Promise<Stage2Result | null> {
  const rows = await db.select({
    score: testSessions.score,
    truthfulness: testSessions.truthfulness,
    vocabularySize: testSessions.vocabularySize,
  })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row || row.score === null || row.truthfulness === null) return null;
  return {
    score: row.score,
    truthfulness: row.truthfulness,
    vocabularySize: row.vocabularySize,
  };
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

export async function loadConsentTimestamp(
  sessionId: string,
): Promise<Date | null> {
  const rows = await db.select({ consentedAt: testSessions.consentedAt })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId))
    .limit(1);
  return rows[0]?.consentedAt ?? null;
}

export async function saveConsentTimestamp(
  sessionId: string,
): Promise<Date> {
  const existing = await loadConsentTimestamp(sessionId);
  if (existing) return existing;

  const consentedAt = new Date();
  await db.insert(testSessions).values({
    id: sessionId,
    consentedAt,
  }).onConflictDoUpdate({
    target: testSessions.id,
    set: { consentedAt },
  });
  return await loadConsentTimestamp(sessionId) ?? consentedAt;
}
