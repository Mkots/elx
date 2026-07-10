import { Hono } from "@hono/hono";
import { analyticsEvent, analyticsProps, safeJson } from "../analytics.ts";
import type { Ticket } from "../db/repositories/tickets.ts";
import type { SynonymSnapshotQuestion } from "../db/schema.ts";
import { setSessionCookie, type Stage3Answers } from "../session.ts";
import {
  type EligibleSynonymQuestion,
  getEligibleSynonymQuestions,
  validateSynonymAnswer,
} from "../domain/stage3_eligibility.ts";
import { Stage3Card, Stage3Page } from "../ui/pages/Stage3Page.tsx";
import type { Services } from "../db/services.ts";
import { requireTestSession } from "./test_session.ts";

function isHtmxRequest(request: Request) {
  return request.headers.get("HX-Request") === "true";
}

function mulberry32(seed: number) {
  let state = seed | 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The prompt/options for a given question index must render identically on
// every GET (so reloading the same card doesn't reshuffle the options), so
// the shuffle is seeded from the question's own index rather than randomized
// per-request.
function shuffledOptions(
  question: SynonymSnapshotQuestion,
  seed: number,
): string[] {
  const options = [question.correctText, ...question.distractors];
  const random = mulberry32(seed);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

async function loadEligibleQuestions(
  services: Services,
  sessionId: string,
  ticket: Ticket,
): Promise<EligibleSynonymQuestion[]> {
  const stage2KnownAnswers = await services.sessions.loadStage2Answers(
    sessionId,
  );
  return getEligibleSynonymQuestions(ticket.questions, stage2KnownAnswers);
}

function getNextEligibleIndex(
  eligible: EligibleSynonymQuestion[],
  answers: Stage3Answers,
): number {
  return eligible.findIndex((item) =>
    answers[String(item.questionIndex)] === undefined
  );
}

export function createStage3Route(services: Services) {
  const route = new Hono();

  route.get("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/stage/1",
      requireConsent: true,
      requireTicket: true,
    });
    if (session instanceof Response) return session;
    const { sessionId, ticket } = session;

    const stage2Result = await services.sessions.loadStage2Result(sessionId);
    if (!stage2Result) return context.redirect("/stage/2", 302);

    const eligible = await loadEligibleQuestions(services, sessionId, ticket);
    if (eligible.length === 0) return context.redirect("/result", 302);

    const answers = await services.sessions.loadStage3Answers(sessionId);
    const currentPosition = getNextEligibleIndex(eligible, answers);
    if (currentPosition === -1) return context.redirect("/result", 302);

    const current = eligible[currentPosition];

    return context.html(
      Stage3Page({
        currentIndex: currentPosition,
        totalQuestions: eligible.length,
        questionIndex: current.questionIndex,
        promptText: current.question.promptText,
        options: shuffledOptions(current.question, current.questionIndex),
        ticketCode: ticket.code,
        pageAnalytics: analyticsProps(context, {
          consentGranted: true,
          events: [
            analyticsEvent("stage3_started", sessionId, ticket.code, {
              question_index: current.questionIndex,
            }),
          ],
        }),
      }),
    );
  });

  route.post("/", async (context) => {
    const session = await requireTestSession(context, services, {
      noSessionRedirect: "/stage/1",
      requireConsent: true,
      requireTicket: true,
    });
    if (session instanceof Response) return session;
    const { sessionId, ticket } = session;

    const stage2Result = await services.sessions.loadStage2Result(sessionId);
    if (!stage2Result) return context.redirect("/stage/2", 302);

    const eligible = await loadEligibleQuestions(services, sessionId, ticket);
    if (eligible.length === 0) return context.redirect("/result", 302);

    const form = await context.req.formData();
    const rawQuestionIndex = form.get("questionIndex");
    const submittedQuestionIndex = rawQuestionIndex !== null
      ? Number(rawQuestionIndex)
      : NaN;
    const submittedAnswer = form.get("answer");

    const current = eligible.find((item) =>
      item.questionIndex === submittedQuestionIndex
    );
    if (!current || typeof submittedAnswer !== "string") {
      return context.text("Invalid Stage 3 answer", 400);
    }

    const validation = validateSynonymAnswer(current.question, submittedAnswer);
    if (!validation.valid) {
      return context.text("Invalid Stage 3 answer", 400);
    }

    await services.sessions.saveStage3Answer(
      sessionId,
      current.questionIndex,
      submittedAnswer,
      validation.isCorrect,
    );

    const answers: Stage3Answers = {
      ...await services.sessions.loadStage3Answers(sessionId),
      [String(current.questionIndex)]: {
        answer: submittedAnswer,
        isCorrect: validation.isCorrect,
      },
    };
    const nextPosition = getNextEligibleIndex(eligible, answers);

    setSessionCookie(context, sessionId);

    if (nextPosition === -1) {
      if (isHtmxRequest(context.req.raw)) {
        const completedEvent = analyticsEvent(
          "stage3_completed",
          sessionId,
          ticket.code,
          { answered_count: eligible.length },
        );
        context.header(
          "HX-Trigger",
          safeJson({ "elx:analytics": completedEvent }),
        );
        context.header("HX-Redirect", "/result");
        return context.body(null, 204);
      }

      return context.redirect("/result", 302);
    }

    const next = eligible[nextPosition];

    if (isHtmxRequest(context.req.raw)) {
      const answeredEvent = analyticsEvent(
        "stage3_answered",
        sessionId,
        ticket.code,
        {
          answer: submittedAnswer,
          question_index: current.questionIndex,
          is_correct: validation.isCorrect,
        },
      );
      context.header(
        "HX-Trigger",
        safeJson({ "elx:analytics": answeredEvent }),
      );
      return context.html(
        Stage3Card({
          analytics: analyticsProps(context, {
            consentGranted: true,
            events: [answeredEvent],
          }),
          currentIndex: nextPosition,
          totalQuestions: eligible.length,
          questionIndex: next.questionIndex,
          promptText: next.question.promptText,
          options: shuffledOptions(next.question, next.questionIndex),
          ticketCode: ticket.code,
        }),
      );
    }

    return context.redirect("/stage/3", 302);
  });

  return route;
}
