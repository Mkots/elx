import { Hono } from "@hono/hono";
import type { VerificationSnapshotQuestion } from "../db/schema.ts";
import { computeScore } from "../scoring/lextale.ts";
import {
  parseSessionId,
  sessionCookie,
  type Stage2Answers,
} from "../session.ts";
import { Stage2Card, Stage2Page } from "../ui/pages/Stage2Page.tsx";
import type { Services } from "../db/services.ts";

type Stage2Word = { id: number; value: string; isReal: boolean };

function orderWordsBySelection(wordList: Stage2Word[], wordIds: number[]) {
  const order = new Map(wordIds.map((id, index) => [id, index]));
  return [...wordList].sort((a, b) =>
    (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

function getNextWordIndex(wordList: Stage2Word[], answers: Stage2Answers) {
  return wordList.findIndex((word) => answers[String(word.id)] === undefined);
}

function computeStage2Result(
  wordList: Stage2Word[],
  answers: Stage2Answers,
) {
  return computeScore(
    wordList.map((word) => ({
      isReal: word.isReal,
      known: answers[String(word.id)] === true,
    })),
  );
}

function isHtmxRequest(request: Request) {
  return request.headers.get("HX-Request") === "true";
}

export function createStage2Route(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const ticketId = await services.sessions.loadSessionTicketId(sessionId);
    if (!ticketId) return context.redirect("/", 302);

    const ticket = await services.tickets.getTicketById(ticketId);
    if (!ticket) return context.redirect("/", 302);

    const selectedIndices = await services.sessions.loadWordSelection(
      sessionId,
    );
    if (selectedIndices.length === 0) return context.redirect("/stage/1", 302);

    const wordList = orderWordsBySelection(
      selectedIndices.map((idx) => {
        const q = ticket.questions[idx] as VerificationSnapshotQuestion;
        return {
          id: idx,
          value: q.wordText,
          isReal: q.isReal,
        };
      }),
      selectedIndices,
    );

    const answers = await services.sessions.loadStage2Answers(sessionId);
    const currentIndex = getNextWordIndex(wordList, answers);

    if (currentIndex === -1) {
      const result = computeStage2Result(wordList, answers);
      await services.sessions.saveStage2Result(sessionId, result);
      await services.history.saveStage2Result(sessionId, result, ticketId);
      context.header("Set-Cookie", sessionCookie(sessionId));
      return context.redirect("/result", 302);
    }

    return context.html(
      Stage2Page({
        currentIndex,
        totalWords: wordList.length,
        word: wordList[currentIndex],
        ticketCode: ticket.code,
      }),
    );
  });

  route.post("/", async (context) => {
    const cookieHeader = context.req.raw.headers.get("cookie");
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) return context.redirect("/stage/1", 302);

    const ticketId = await services.sessions.loadSessionTicketId(sessionId);
    if (!ticketId) return context.redirect("/", 302);

    const ticket = await services.tickets.getTicketById(ticketId);
    if (!ticket) return context.redirect("/", 302);

    const selectedIndices = await services.sessions.loadWordSelection(
      sessionId,
    );
    if (selectedIndices.length === 0) return context.redirect("/stage/1", 302);

    const wordList = orderWordsBySelection(
      selectedIndices.map((idx) => {
        const q = ticket.questions[idx] as VerificationSnapshotQuestion;
        return {
          id: idx,
          value: q.wordText,
          isReal: q.isReal,
        };
      }),
      selectedIndices,
    );

    const form = await context.req.formData();
    const submittedWordId = form.get("wordId")
      ? Number(form.get("wordId"))
      : null;
    const submittedAnswer = form.get("answer");

    if (submittedWordId === null && submittedAnswer === null) {
      const answers = Object.fromEntries(
        wordList.map((word) => [
          String(word.id),
          form.get(`word_${word.id}`) === "know",
        ]),
      );
      const result = computeStage2Result(wordList, answers);
      await services.sessions.saveStage2Result(sessionId, result);
      await services.history.saveStage2Result(sessionId, result, ticketId);

      context.header("Set-Cookie", sessionCookie(sessionId));
      return context.redirect("/result", 302);
    }

    if (
      submittedWordId === null ||
      (submittedAnswer !== "know" && submittedAnswer !== "dont_know")
    ) {
      return context.text("Invalid Stage 2 answer", 400);
    }

    await services.sessions.saveStage2Answer(
      sessionId,
      submittedWordId,
      submittedAnswer === "know",
    );

    const answers = {
      ...await services.sessions.loadStage2Answers(sessionId),
      [String(submittedWordId)]: submittedAnswer === "know",
    };
    const currentIndex = getNextWordIndex(wordList, answers);

    context.header("Set-Cookie", sessionCookie(sessionId));

    if (currentIndex === -1) {
      const result = computeStage2Result(wordList, answers);
      await services.sessions.saveStage2Result(sessionId, result);
      await services.history.saveStage2Result(sessionId, result, ticketId);

      if (isHtmxRequest(context.req.raw)) {
        context.header("HX-Redirect", "/result");
        return context.body(null, 204);
      }

      return context.redirect("/result", 302);
    }

    if (isHtmxRequest(context.req.raw)) {
      return context.html(
        Stage2Card({
          currentIndex,
          totalWords: wordList.length,
          word: wordList[currentIndex],
          ticketCode: ticket.code,
        }),
      );
    }

    return context.redirect("/stage/2", 302);
  });

  return route;
}
