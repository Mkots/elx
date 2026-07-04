import { desc, eq, sql } from "drizzle-orm";
import { db } from "../client.ts";
import { ticketConfigs, tickets, words } from "../schema.ts";
import type { SnapshotQuestion } from "../schema.ts";

export type Ticket = typeof tickets.$inferSelect;

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateSpellingCandidates(word: string): string[] {
  const candidates = new Set<string>();
  const lower = word.toLowerCase();

  if (lower.length > 3) {
    for (let i = 0; i < lower.length - 1; i++) {
      const arr = lower.split("");
      const temp = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = temp;
      candidates.add(arr.join(""));
    }
    for (let i = 0; i < lower.length; i++) {
      candidates.add(lower.slice(0, i + 1) + lower[i] + lower.slice(i + 1));
    }
    for (let i = 0; i < lower.length; i++) {
      candidates.add(lower.slice(0, i) + lower.slice(i + 1));
    }
  } else {
    candidates.add(lower + "e");
    candidates.add(lower + "s");
  }

  candidates.delete(lower);
  return Array.from(candidates).slice(0, 5);
}

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
  // 1. Get active config
  const activeConfigs = await db
    .select()
    .from(ticketConfigs)
    .where(eq(ticketConfigs.isActive, true))
    .limit(1);

  let config = activeConfigs[0];
  if (!config) {
    config = {
      id: 0,
      name: "Default Config",
      isActive: true,
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
      randomizeOrder: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // 2. Query available word counts grouped by difficulty and isReal
  const poolRows = await db
    .select({
      difficulty: words.difficulty,
      isReal: words.isReal,
      count: sql<number>`count(${words.id})::integer`,
    })
    .from(words)
    .groupBy(words.difficulty, words.isReal);

  const available: Record<number, { real: number; pseudo: number }> = {};
  for (let d = 1; d <= 5; d++) {
    available[d] = { real: 0, pseudo: 0 };
  }
  for (const row of poolRows) {
    const d = row.difficulty;
    if (d >= 1 && d <= 5) {
      if (row.isReal) {
        available[d].real = row.count;
      } else {
        available[d].pseudo = row.count;
      }
    }
  }

  // 3. Find valid partition of real/pseudo counts per difficulty level using backtracking
  function findPartition(
    diffIdx: number,
    remReal: number,
    remPseudo: number,
    current: { real: number; pseudo: number }[],
  ): { real: number; pseudo: number }[] | null {
    if (diffIdx > 5) {
      return remReal === 0 && remPseudo === 0 ? current : null;
    }

    const targetDiffCount = Number(
      config[`difficulty${diffIdx}Count` as keyof typeof config] ?? 0,
    );
    const availReal = available[diffIdx].real;
    const availPseudo = available[diffIdx].pseudo;

    const possibleReals: number[] = [];
    for (let r = 0; r <= targetDiffCount; r++) {
      const p = targetDiffCount - r;
      if (
        r <= availReal && p <= availPseudo && r <= remReal && p <= remPseudo
      ) {
        possibleReals.push(r);
      }
    }

    const shuffledReals = shuffle(possibleReals);
    for (const r of shuffledReals) {
      const p = targetDiffCount - r;
      const res = findPartition(diffIdx + 1, remReal - r, remPseudo - p, [
        ...current,
        { real: r, pseudo: p },
      ]);
      if (res) return res;
    }

    return null;
  }

  const partition = findPartition(
    1,
    config.realCount,
    config.pseudoCount,
    [],
  );
  if (!partition) {
    throw new Error(
      "Database words pool does not have a valid combinations of words to satisfy the active configuration. Adjust counts or seed more words.",
    );
  }

  let attempts = 0;
  let finalRealWords: (typeof words.$inferSelect)[] = [];
  let finalPseudoWords: (typeof words.$inferSelect)[] = [];
  let success = false;

  while (attempts < 20) {
    attempts++;
    finalRealWords = [];
    finalPseudoWords = [];

    for (let d = 1; d <= 5; d++) {
      const part = partition[d - 1];
      const realRows = await db
        .select()
        .from(words)
        .where(sql`difficulty = ${d} AND is_real = true`);
      const pseudoRows = await db
        .select()
        .from(words)
        .where(sql`difficulty = ${d} AND is_real = false`);

      if (realRows.length < part.real || pseudoRows.length < part.pseudo) {
        continue;
      }

      finalRealWords.push(...shuffle(realRows).slice(0, part.real));
      finalPseudoWords.push(...shuffle(pseudoRows).slice(0, part.pseudo));
    }

    const synCandidates = finalRealWords.filter((w) =>
      w.synonyms && w.synonyms.length > 0
    );
    const defCandidates = finalRealWords.filter((w) =>
      w.definition && w.definition.trim() !== ""
    );

    if (
      synCandidates.length >= config.synonymsCount &&
      defCandidates.length >= config.definitionCount &&
      finalRealWords.length >= config.spellingCount
    ) {
      success = true;
      break;
    }
  }

  if (!success) {
    throw new Error(
      "Failed to select a word set with enough synonyms or definitions. Try seeding more words or lowering challenge counts.",
    );
  }

  const maxIdResult = await db.select({
    maxId: sql<number>`max(${tickets.id})`,
  }).from(tickets);
  const maxId = maxIdResult[0]?.maxId ?? 0;
  const code = `ELX-T-${String(maxId + 1).padStart(4, "0")}`;

  const synonymWords = shuffle(
    finalRealWords.filter((w) => w.synonyms && w.synonyms.length > 0),
  ).slice(0, config.synonymsCount);

  const definitionWords = shuffle(
    finalRealWords.filter((w) => w.definition && w.definition.trim() !== ""),
  ).slice(0, config.definitionCount);

  const spellingWords = shuffle(finalRealWords).slice(
    0,
    config.spellingCount,
  );

  const usedWordValues = [
    ...finalRealWords.map((w) => w.value),
    ...finalPseudoWords.map((w) => w.value),
  ];

  const allRealWordsResult = await db.select({ value: words.value }).from(
    words,
  ).where(eq(words.isReal, true));
  const poolRealWords = allRealWordsResult.map((w) => w.value).filter((
    val,
  ) => !usedWordValues.includes(val));

  function getProposedDistractors(
    count: number,
    correct: string,
    exclude: string[] = [],
  ): string[] {
    const candidates = poolRealWords.filter((w) =>
      w !== correct && !exclude.includes(w)
    );
    return shuffle(candidates).slice(0, count);
  }

  const questions: SnapshotQuestion[] = [];

  const allSelectedWords = shuffle([
    ...finalRealWords,
    ...finalPseudoWords,
  ]);
  for (const w of allSelectedWords) {
    questions.push({
      type: "verification",
      wordText: w.value,
      isReal: w.isReal,
    });
  }

  for (const w of synonymWords) {
    const correctSynonym = w.synonyms[0] || "";
    const proposedDistractors = getProposedDistractors(3, correctSynonym, [
      w.value,
    ]);
    questions.push({
      type: "synonym",
      promptText: w.value,
      correctText: correctSynonym,
      distractors: proposedDistractors,
      verified: false,
    });
  }

  for (const w of definitionWords) {
    const proposedDistractors = getProposedDistractors(3, w.value);
    questions.push({
      type: "definition",
      definitionText: w.definition || "",
      correctText: w.value,
      distractors: proposedDistractors,
      verified: false,
    });
  }

  for (const w of spellingWords) {
    const spellingCandidates = generateSpellingCandidates(w.value);
    while (spellingCandidates.length < 3) {
      spellingCandidates.push(w.value + "x");
    }
    questions.push({
      type: "spelling",
      contextSentence: `Example sentence with ___ for word ${w.value}.`,
      correctText: w.value,
      distractors: spellingCandidates.slice(0, 3),
      verified: false,
    });
  }

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
