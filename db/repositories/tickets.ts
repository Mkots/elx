import { desc, eq, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { ticketConfigs, tickets, words } from "../schema.ts";
import type { SnapshotQuestion } from "../schema.ts";
import { buildQuestions } from "../../domain/ticket_generation.ts";
import type { TicketGenerationConfig } from "../../domain/ticket_generation.ts";

export type Ticket = typeof tickets.$inferSelect;

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DEFAULT_TICKET_CONFIG: TicketGenerationConfig & { name: string } = {
  name: "Default Config",
  difficulty1Count: 8,
  difficulty2Count: 10,
  difficulty3Count: 10,
  difficulty4Count: 9,
  difficulty5Count: 8,
  realCount: 30,
  pseudoCount: 15,
  synonymsCount: 5,
  spellingCount: 5,
  definitionCount: 5,
};

export async function getTickets(): Promise<Ticket[]> {
  return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function getTicketById(id: number): Promise<Ticket | null> {
  const result = await db.select().from(tickets).where(eq(tickets.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getPublishedTickets(): Promise<
  { id: number; code: string; title: string | null }[]
> {
  let publishedTickets = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      title: tickets.title,
    })
    .from(tickets)
    .where(eq(tickets.status, "published"));

  if (publishedTickets.length === 0) {
    try {
      const baseTicket = await generateBaseTicket(
        "Default E2E assessment ticket",
        "Auto-generated to ensure immediate usability",
      );
      const verifiedQuestions = baseTicket.questions.map((q) => {
        if (q.type !== "verification") {
          return { ...q, verified: true };
        }
        return q;
      });

      await db
        .update(tickets)
        .set({ questions: verifiedQuestions, status: "published" })
        .where(eq(tickets.id, baseTicket.id));

      publishedTickets = [
        {
          id: baseTicket.id,
          code: baseTicket.code,
          title: "Default E2E assessment ticket",
        },
      ];
    } catch (err) {
      console.error(
        "Failed to auto-generate default published ticket:",
        err,
      );
    }
  }

  return publishedTickets;
}

export async function getRandomRealWords(
  count: number,
  exclude: string[],
): Promise<string[]> {
  const query = db
    .select({ value: words.value })
    .from(words)
    .where(eq(words.isReal, true));

  const rows = await query;
  const filtered = rows
    .map((r) => r.value)
    .filter((val) => !exclude.includes(val));

  return shuffle(filtered).slice(0, count);
}

export async function generateBaseTicket(
  title?: string,
  notes?: string,
): Promise<Ticket> {
  // 1. Get active config (falls back to a hardcoded default).
  const activeConfigs = await db
    .select()
    .from(ticketConfigs)
    .where(eq(ticketConfigs.isActive, true))
    .limit(1);
  const config = activeConfigs[0] ?? DEFAULT_TICKET_CONFIG;

  // 2. Fetch the entire word pool in a single query.
  const wordPool = await db
    .select({
      value: words.value,
      isReal: words.isReal,
      difficulty: words.difficulty,
      synonyms: words.synonyms,
      definition: words.definition,
    })
    .from(words);

  const questions = buildQuestions(config, wordPool, Math.random);

  // 3. Generate the human-readable ticket code.
  const maxIdResult = await db.select({
    maxId: sql<number>`max(${tickets.id})`,
  }).from(tickets);
  const maxId = maxIdResult[0]?.maxId ?? 0;
  const code = `ELX-T-${String(maxId + 1).padStart(4, "0")}`;

  const [newTicket] = await db
    .insert(tickets)
    .values({
      code,
      status: "base",
      title: title || `Auto-generated ticket ${code}`,
      notes: notes || `Created under active config: ${config.name}`,
      questions,
    })
    .returning();

  return newTicket;
}

export async function updateQuestion(
  ticketId: number,
  questionIndex: number,
  updatedQuestion: SnapshotQuestion,
): Promise<void> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const qs = [...ticket.questions];
  if (questionIndex < 0 || questionIndex >= qs.length) {
    throw new Error("Invalid question index");
  }

  qs[questionIndex] = updatedQuestion;

  const challenges = qs.filter((q) => q.type !== "verification");
  const allVerified = challenges.every((c) => c.verified === true);
  const newStatus = allVerified ? "complete" : "base";

  await db
    .update(tickets)
    .set({
      questions: qs,
      status: ticket.status === "published" ? "published" : newStatus,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));
}

export async function publishTicket(ticketId: number): Promise<void> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const challenges = ticket.questions.filter((q) => q.type !== "verification");

  for (let i = 0; i < challenges.length; i++) {
    const q = challenges[i];
    if (!q.verified) {
      throw new Error(
        `Cannot publish: Question #${i + 1} (${q.type}) is unverified.`,
      );
    }
    if (!q.correctText || q.correctText.trim() === "") {
      throw new Error(
        `Cannot publish: Question #${i + 1} (${q.type}) has no correct text.`,
      );
    }
    if (!q.distractors || q.distractors.length !== 3) {
      throw new Error(
        `Cannot publish: Question #${
          i + 1
        } (${q.type}) must have exactly 3 distractors.`,
      );
    }
    if (
      q.type === "spelling" &&
      (!q.contextSentence || !q.contextSentence.includes("___"))
    ) {
      throw new Error(
        `Cannot publish: Question #${
          i + 1
        } (spelling) context sentence must contain '___'.`,
      );
    }
    if (
      q.type === "definition" &&
      (!q.definitionText || q.definitionText.trim() === "")
    ) {
      throw new Error(
        `Cannot publish: Question #${
          i + 1
        } (definition) has no definition text.`,
      );
    }
  }

  await db
    .update(tickets)
    .set({
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));
}

export async function deleteTicket(ticketId: number): Promise<void> {
  await db.delete(tickets).where(eq(tickets.id, ticketId));
}
