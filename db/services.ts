import * as ticketsRepo from "./repositories/tickets.ts";
import * as wordsRepo from "./repositories/words.ts";
import * as historyRepo from "./repositories/history.ts";
import * as ticketConfigsRepo from "./repositories/ticket_configs.ts";
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
  async loadStage2Result(sessionId: string) {
    return await sessionHelpers.loadStage2Result(sessionId);
  },
};

export interface Services {
  tickets: typeof ticketsRepo;
  words: typeof wordsRepo;
  history: typeof historyRepo;
  ticketConfigs: typeof ticketConfigsRepo;
  sessions: typeof defaultSessionsService;
}

export const defaultServices: Services = {
  tickets: ticketsRepo,
  words: wordsRepo,
  history: historyRepo,
  ticketConfigs: ticketConfigsRepo,
  sessions: defaultSessionsService,
};
