import * as ticketsRepo from "./repositories/tickets.ts";
import * as wordsRepo from "./repositories/words.ts";
import * as historyRepo from "./repositories/history.ts";
import * as ticketConfigsRepo from "./repositories/ticket_configs.ts";
import * as adminSessionsRepo from "./repositories/admin_sessions.ts";
import * as sessionHelpers from "../session.ts";

export const defaultSessionsService = {
  async saveWordSelection(sessionId: string, wordIds: number[]) {
    await sessionHelpers.saveWordSelection(sessionId, wordIds);
  },
  async saveSessionTicketId(sessionId: string, ticketId: number) {
    await sessionHelpers.saveSessionTicketId(sessionId, ticketId);
  },
  async loadSessionTicketId(sessionId: string) {
    return await sessionHelpers.loadSessionTicketId(sessionId);
  },
  async loadConsentTimestamp(sessionId: string) {
    return await sessionHelpers.loadConsentTimestamp(sessionId);
  },
  async saveConsentTimestamp(sessionId: string) {
    return await sessionHelpers.saveConsentTimestamp(sessionId);
  },
  async loadWordSelection(sessionId: string) {
    return await sessionHelpers.loadWordSelection(sessionId);
  },
  async saveStage2Answer(sessionId: string, wordId: number, known: boolean) {
    await sessionHelpers.saveStage2Answer(sessionId, wordId, known);
  },
  async loadStage2Answers(sessionId: string) {
    return await sessionHelpers.loadStage2Answers(sessionId);
  },
  async saveStage2Result(
    sessionId: string,
    result: { score: number; truthfulness: number },
  ) {
    await sessionHelpers.saveStage2Result(sessionId, result);
  },
  async completeStage2(
    sessionId: string,
    words: sessionHelpers.Stage2ScoringWord[],
  ) {
    return await sessionHelpers.completeStage2Result(sessionId, words);
  },
  async loadStage2Result(sessionId: string) {
    return await sessionHelpers.loadStage2Result(sessionId);
  },
  async loadStage3Answers(sessionId: string) {
    return await sessionHelpers.loadStage3Answers(sessionId);
  },
  async saveStage3Answer(
    sessionId: string,
    questionIndex: number,
    answer: string,
    isCorrect: boolean,
  ) {
    await sessionHelpers.saveStage3Answer(
      sessionId,
      questionIndex,
      answer,
      isCorrect,
    );
  },
  async loadStage3Summary(sessionId: string) {
    return await sessionHelpers.loadStage3Summary(sessionId);
  },
};

export interface Services {
  tickets: typeof ticketsRepo;
  words: typeof wordsRepo;
  history: typeof historyRepo;
  ticketConfigs: typeof ticketConfigsRepo;
  adminSessions: typeof adminSessionsRepo;
  sessions: typeof defaultSessionsService;
}

export const defaultServices: Services = {
  tickets: ticketsRepo,
  words: wordsRepo,
  history: historyRepo,
  ticketConfigs: ticketConfigsRepo,
  adminSessions: adminSessionsRepo,
  sessions: defaultSessionsService,
};
