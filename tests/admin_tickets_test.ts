import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { getKv } from "../session.ts";
import { createApp } from "../app.ts";
import { generateSpellingCandidates } from "../db/repositories/tickets.ts";
import { db } from "../db/client.ts";
import { ticketConfigs, tickets } from "../db/schema.ts";
import type {
  SnapshotQuestion,
  SynonymSnapshotQuestion,
  tickets as ticketsTable,
  VerificationSnapshotQuestion,
} from "../db/schema.ts";
import { defaultServices, type Services } from "../db/services.ts";
import { databaseAdminTicketsLoader } from "../routes/admin/loaders/tickets.ts";
import { eq } from "drizzle-orm";

// Load environment variables from .env if not present (for local testing)
function populateEnv() {
  try {
    const text = Deno.readTextFileSync(".env");
    for (const line of text.split("\n")) {
      const parts = line.trim().split("=");
      if (parts.length >= 2 && !parts[0].startsWith("#")) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(
          /^["']|["']$/g,
          "",
        );
        if (key && !Deno.env.get(key)) {
          Deno.env.set(key, value);
        }
      }
    }
  } catch {
    // Ignore if .env is missing (e.g. in CI)
  }
}
populateEnv();

// Misspelled word generator utility test
Deno.test("VER-ADMIN-TICKETS: spelling distractor generator heuristic", () => {
  const word = "action";
  const misspellings = generateSpellingCandidates(word);
  assertEquals(misspellings.length, 5);
  // All suggestions should be different from the word itself
  for (const m of misspellings) {
    assertEquals(m !== word, true);
  }
});

// --- Mock Routing Tests ---

let mockTicketsList: (typeof ticketsTable.$inferSelect)[] = [
  {
    id: 1,
    code: "ELX-T-0001",
    status: "base",
    title: "Mock Ticket 1",
    notes: "Notes 1",
    questions: [
      { type: "verification", wordText: "hello", isReal: true },
      {
        type: "synonym",
        promptText: "hello",
        correctText: "hi",
        distractors: [],
        verified: false,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTicketsLoader: Services["tickets"] = {
  ...defaultServices.tickets,
  async getTickets() {
    await Promise.resolve();
    return mockTicketsList;
  },
  async getTicketById(id) {
    await Promise.resolve();
    return mockTicketsList.find((t) => t.id === id) || null;
  },
  async generateBaseTicket(title, notes) {
    await Promise.resolve();
    const newT: typeof ticketsTable.$inferSelect = {
      id: mockTicketsList.length + 1,
      code: `ELX-T-${String(mockTicketsList.length + 1).padStart(4, "0")}`,
      status: "base",
      title: title || "New Gen",
      notes: notes || "Notes",
      questions: [{ type: "verification", wordText: "random", isReal: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockTicketsList.push(newT);
    return newT;
  },
  async updateQuestion(ticketId, questionIndex, updatedQuestion) {
    await Promise.resolve();
    const t = mockTicketsList.find((x) => x.id === ticketId);
    if (t) {
      t.questions[questionIndex] = updatedQuestion;
    }
  },
  async publishTicket(ticketId) {
    await Promise.resolve();
    const t = mockTicketsList.find((x) => x.id === ticketId);
    if (t) {
      t.status = "published";
    }
  },
  async deleteTicket(ticketId) {
    await Promise.resolve();
    mockTicketsList = mockTicketsList.filter((x) => x.id !== ticketId);
  },
  async getRandomRealWords(count, _exclude) {
    await Promise.resolve();
    return Array(count).fill("random-word");
  },
};

const app = createApp({
  ...defaultServices,
  tickets: mockTicketsLoader,
  sessions: {
    ...defaultServices.sessions,
    loadStage2Result: () => Promise.resolve(null),
  },
});

async function createAdminSession() {
  const kv = await getKv();
  const sessionId = crypto.randomUUID();
  await kv.set(["admin_session", sessionId], { username: "admin" }, {
    expireIn: 60 * 1000,
  });
  return sessionId;
}

Deno.test("VER-ADMIN-TICKETS-ROUTES: GET /admin/tickets renders tickets list", async () => {
  const sessionId = await createAdminSession();
  const response = await app.request("/admin/tickets", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(body, "Ticket Builder &amp; Curation");
  assertStringIncludes(body, "ELX-T-0001");
  assertStringIncludes(body, "Mock Ticket 1");
});

Deno.test("VER-ADMIN-TICKETS-ROUTES: POST /admin/tickets/generate creates a new ticket", async () => {
  const sessionId = await createAdminSession();
  const form = new URLSearchParams();
  form.append("title", "Post generated");
  form.append("notes", "Automated E2E");

  const response = await app.request("/admin/tickets/generate", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  assertEquals(response.status, 302);
  const created = mockTicketsList.find((t) => t.title === "Post generated");
  assertEquals(created !== undefined, true);
  assertEquals(created?.code, "ELX-T-0002");
});

Deno.test("VER-ADMIN-TICKETS-ROUTES: GET /admin/tickets/:id renders details page", async () => {
  const sessionId = await createAdminSession();
  const response = await app.request("/admin/tickets/1", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(body, "Edit Ticket: ELX-T-0001");
  assertStringIncludes(body, "Mock Ticket 1");
  assertStringIncludes(body, "hello");
});

Deno.test("VER-ADMIN-TICKETS-ROUTES: POST /admin/tickets/:id/edit-question/:index updates question", async () => {
  const sessionId = await createAdminSession();
  const form = new URLSearchParams();
  form.append("correctText", "super-hi");
  form.append("distractors[0]", "dist1");
  form.append("distractors[1]", "dist2");
  form.append("distractors[2]", "dist3");

  const response = await app.request("/admin/tickets/1/edit-question/1", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  assertEquals(response.status, 302);
  const q = mockTicketsList[0].questions[1] as SynonymSnapshotQuestion;
  assertEquals(q.correctText, "super-hi");
  assertEquals(q.verified, true);
  assertEquals(q.distractors.length, 3);
});

Deno.test("VER-ADMIN-TICKETS-ROUTES: POST /admin/tickets/:id/publish updates status", async () => {
  const sessionId = await createAdminSession();
  const response = await app.request("/admin/tickets/1/publish", {
    method: "POST",
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertEquals(response.status, 302);
  assertEquals(mockTicketsList[0].status, "published");
});

Deno.test("VER-ADMIN-TICKETS-ROUTES: POST /admin/tickets/:id/delete removes ticket", async () => {
  const sessionId = await createAdminSession();
  const response = await app.request("/admin/tickets/1/delete", {
    method: "POST",
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertEquals(response.status, 302);
  const deleted = mockTicketsList.find((t) => t.id === 1);
  assertEquals(deleted, undefined);
});

// --- Database Integration Tests ---

Deno.test({
  name: "VER-ADMIN-TICKETS-DB: base ticket generation and publish guardrails",
  ignore: !Deno.env.get("DATABASE_URL"),
  async fn() {
    // Setup a custom config with small counts to run safely on seeded pool
    const testConfigName = "Test Curation Config";
    let configId = 0;
    let ticketId = 0;

    try {
      // Clear existing active configs
      await db.update(ticketConfigs).set({ isActive: false });

      // Delete any leftover config from aborted tests to avoid uniqueness violations
      await db.delete(ticketConfigs).where(
        eq(ticketConfigs.name, testConfigName),
      );

      // Insert custom config matching seeded words
      const [cfg] = await db
        .insert(ticketConfigs)
        .values({
          name: testConfigName,
          isActive: true,
          difficulty1Count: 2,
          difficulty2Count: 2,
          difficulty3Count: 2,
          difficulty4Count: 2,
          difficulty5Count: 2,
          realCount: 6,
          pseudoCount: 4,
          synonymsCount: 1,
          spellingCount: 1,
          definitionCount: 1,
          randomizeOrder: true,
        })
        .returning();

      configId = cfg.id;

      // 1. Generate base ticket
      const ticket = await databaseAdminTicketsLoader.generateBaseTicket(
        "Integration Ticket",
        "Notes from integration test",
      );
      ticketId = ticket.id;

      assertEquals(ticket.status, "base");
      assertStringIncludes(ticket.code, "ELX-T-");

      // Verification question counts should match config counts
      const verifications = ticket.questions.filter((q) =>
        q.type === "verification"
      );
      assertEquals(verifications.length, 10); // 6 real + 4 pseudo = 10 total

      const reals = verifications.filter(
        (q) => (q as VerificationSnapshotQuestion).isReal,
      );
      assertEquals(reals.length, 6);

      const pseudos = verifications.filter(
        (q) => !(q as VerificationSnapshotQuestion).isReal,
      );
      assertEquals(pseudos.length, 4);

      // Should have 3 challenge questions (1 synonym, 1 spelling, 1 definition)
      const challenges = ticket.questions.filter((q) =>
        q.type !== "verification"
      );
      assertEquals(challenges.length, 3);

      const synonymCount = challenges.filter((q) =>
        q.type === "synonym"
      ).length;
      assertEquals(synonymCount, 1);

      const spellingCount = challenges.filter((q) =>
        q.type === "spelling"
      ).length;
      assertEquals(spellingCount, 1);

      const definitionCount = challenges.filter((q) =>
        q.type === "definition"
      ).length;
      assertEquals(definitionCount, 1);

      // 2. Try to publish base ticket immediately -> should throw error (guardrail check)
      await assertRejects(
        async () => {
          await databaseAdminTicketsLoader.publishTicket(ticketId);
        },
        Error,
        "Cannot publish",
      );

      // 3. Randomization Check: generating a second ticket should produce a different set of verification words
      const ticket2 = await databaseAdminTicketsLoader.generateBaseTicket(
        "Second Integration Ticket",
      );
      const verifications2 = ticket2.questions.filter((q) =>
        q.type === "verification"
      );

      // Cleanup ticket2 immediately
      await databaseAdminTicketsLoader.deleteTicket(ticket2.id);

      const words1 = verifications
        .map((q) => (q as VerificationSnapshotQuestion).wordText)
        .sort();
      const words2 = verifications2
        .map((q) => (q as VerificationSnapshotQuestion).wordText)
        .sort();

      // Shuffled selections are highly likely to have different word contents
      // or different permutations. Let's check that they differ.
      let identical = true;
      for (let i = 0; i < words1.length; i++) {
        if (words1[i] !== words2[i]) {
          identical = false;
          break;
        }
      }
      // With 75 seeded words and selecting 10, the likelihood of choosing the exact same subset twice is ~1 in 25 billion.
      assertEquals(identical, false);

      // 4. Enrich/Verify all challenges
      const ticketDetails = await databaseAdminTicketsLoader.getTicketById(
        ticketId,
      );
      assertEquals(ticketDetails !== null, true);

      const originalQs = ticketDetails!.questions;
      for (let i = 0; i < originalQs.length; i++) {
        const q = originalQs[i];
        if (q.type === "verification") continue;

        let updatedQ: SnapshotQuestion;
        if (q.type === "synonym") {
          updatedQ = {
            type: "synonym",
            promptText: q.promptText,
            correctText: q.correctText || "correct-syn",
            distractors: ["d1", "d2", "d3"],
            verified: true,
          };
        } else if (q.type === "spelling") {
          updatedQ = {
            type: "spelling",
            contextSentence: "This is a ___ sentence.",
            correctText: q.correctText,
            distractors: ["d1", "d2", "d3"],
            verified: true,
          };
        } else {
          // definition
          updatedQ = {
            type: "definition",
            definitionText: q.definitionText || "some definition",
            correctText: q.correctText,
            distractors: ["d1", "d2", "d3"],
            verified: true,
          };
        }

        await databaseAdminTicketsLoader.updateQuestion(ticketId, i, updatedQ);
      }

      // 5. Verify status auto-changed to "complete"
      const enrichedTicket = await databaseAdminTicketsLoader.getTicketById(
        ticketId,
      );
      assertEquals(enrichedTicket?.status, "complete");

      // 6. Publish ticket -> should succeed
      await databaseAdminTicketsLoader.publishTicket(ticketId);
      const publishedTicket = await databaseAdminTicketsLoader.getTicketById(
        ticketId,
      );
      assertEquals(publishedTicket?.status, "published");
    } finally {
      // Cleanup db changes
      if (ticketId > 0) {
        await db.delete(tickets).where(eq(tickets.id, ticketId));
      }
      if (configId > 0) {
        await db.delete(ticketConfigs).where(eq(ticketConfigs.id, configId));
      }
      // Re-enable the first default config as active
      const firstConfig = await db.select().from(ticketConfigs).limit(1);
      if (firstConfig[0]) {
        await db.update(ticketConfigs).set({ isActive: true }).where(
          eq(ticketConfigs.id, firstConfig[0].id),
        );
      }
    }
  },
});

Deno.test({
  name:
    "VER-ADMIN-TICKETS: generateBaseTicket retry loop 20th attempt success regression",
  ignore: !Deno.env.get("DATABASE_URL"),
  fn: async () => {
    let configId = 0;
    let ticketId = 0;
    const testConfigName = "20th Attempt Config";

    // Clear existing active configs
    await db.update(ticketConfigs).set({ isActive: false });

    // Delete any leftover config
    await db.delete(ticketConfigs).where(
      eq(ticketConfigs.name, testConfigName),
    );

    // Insert custom config requiring 5 synonyms, 5 spellings, 5 definitions
    const [cfg] = await db
      .insert(ticketConfigs)
      .values({
        name: testConfigName,
        isActive: true,
        difficulty1Count: 2,
        difficulty2Count: 2,
        difficulty3Count: 2,
        difficulty4Count: 2,
        difficulty5Count: 2,
        realCount: 6,
        pseudoCount: 4,
        synonymsCount: 1,
        spellingCount: 1,
        definitionCount: 1,
        randomizeOrder: true,
      })
      .returning();

    configId = cfg.id;

    const originalFilter = Array.prototype.filter;
    let loopFilterCalls = 0;

    // deno-lint-ignore no-explicit-any
    const filterMock = function (this: any, callback: any, thisArg?: any) {
      const callbackStr = callback.toString();
      const isSynOrDefFilter = callbackStr.includes("synonyms") ||
        callbackStr.includes("definition");

      if (isSynOrDefFilter) {
        loopFilterCalls++;
        // The loop does 2 filter calls per attempt (one for synonyms, one for definitions).
        // Return empty array for the first 19 attempts (38 calls) to force retry.
        if (loopFilterCalls <= 38) {
          return [];
        }
        // Mutate the elements to guarantee synonyms and definitions exist for the 20th attempt
        for (const w of this) {
          if (!w.synonyms || w.synonyms.length === 0) {
            w.synonyms = ["mock_synonym"];
          }
          if (!w.definition || w.definition.trim() === "") {
            w.definition = "mock definition";
          }
        }
      }

      return originalFilter.call(this, callback, thisArg);
    };
    Array.prototype.filter = filterMock;

    try {
      // Generate base ticket. It should retry 19 times (failing) and succeed on the 20th attempt.
      let ticket;
      try {
        ticket = await databaseAdminTicketsLoader.generateBaseTicket(
          "Retry Loop Test Ticket",
          "Notes",
        );
      } catch (err) {
        throw err;
      }
      ticketId = ticket.id;

      assertEquals(ticket.status, "base");
      // Verify that it reached the 20th attempt (loopFilterCalls > 38)
      assertEquals(loopFilterCalls > 38, true);
    } finally {
      // Restore original filter
      Array.prototype.filter = originalFilter;

      // Cleanup db changes
      if (ticketId > 0) {
        await db.delete(tickets).where(eq(tickets.id, ticketId));
      }
      if (configId > 0) {
        await db.delete(ticketConfigs).where(eq(ticketConfigs.id, configId));
      }
      // Re-enable the first default config as active
      const firstConfig = await db.select().from(ticketConfigs).limit(1);
      if (firstConfig[0]) {
        await db.update(ticketConfigs).set({ isActive: true }).where(
          eq(ticketConfigs.id, firstConfig[0].id),
        );
      }
    }
  },
});
