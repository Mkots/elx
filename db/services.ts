import * as ticketsRepo from "./repositories/tickets.ts";
import * as wordsRepo from "./repositories/words.ts";
import * as historyRepo from "./repositories/history.ts";
import * as ticketConfigsRepo from "./repositories/ticket_configs.ts";
import { getKv } from "../session.ts";
import * as sessionHelpers from "../session.ts";

export const defaultSessionsService = {
  async saveWordSelection(sessionId: string, wordIds: number[]) {
    const kv = await getKv();
    await sessionHelpers.saveWordSelection(kv, sessionId, wordIds);
  },
  async saveSessionTicketId(sessionId: string, ticketId: number) {
    const kv = await getKv();
    await sessionHelpers.saveSessionTicketId(kv, sessionId, ticketId);
  },
  async loadSessionTicketId(sessionId: string) {
    const kv = await getKv();
    return await sessionHelpers.loadSessionTicketId(kv, sessionId);
  },
  async loadWordSelection(sessionId: string) {
    const kv = await getKv();
    return await sessionHelpers.loadWordSelection(kv, sessionId);
  },
  async saveStage2Answer(sessionId: string, wordId: number, known: boolean) {
    const kv = await getKv();
    await sessionHelpers.saveStage2Answer(kv, sessionId, wordId, known);
  },
  async loadStage2Answers(sessionId: string) {
    const kv = await getKv();
    return await sessionHelpers.loadStage2Answers(kv, sessionId);
  },
  async saveStage2Result(
    sessionId: string,
    result: { score: number; truthfulness: number },
  ) {
    const kv = await getKv();
    await sessionHelpers.saveStage2Result(kv, sessionId, result);
  },
  async loadStage2Result(sessionId: string) {
    const kv = await getKv();
    return await sessionHelpers.loadStage2Result(kv, sessionId);
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
