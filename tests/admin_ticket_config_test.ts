import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import type { ticketConfigs } from "../db/schema.ts";
import { defaultServices, type Services } from "../db/services.ts";
import type {
  DatabaseWordStats,
  TicketConfigData,
} from "../db/repositories/ticket_configs.ts";

let mockConfig: typeof ticketConfigs.$inferSelect = {
  id: 1,
  name: "Mock Default Config",
  isActive: true,
  difficulty1Count: 8,
  difficulty2Count: 10,
  difficulty3Count: 10,
  difficulty4Count: 9,
  difficulty5Count: 8,
  realCount: 30,
  pseudoCount: 15,
  synonymsCount: 5,
  antonymsCount: 5,
  spellingCount: 5,
  definitionCount: 5,
  randomizeOrder: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats: DatabaseWordStats = {
  totalReal: 100,
  totalPseudo: 50,
  diffCounts: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30 },
  realSynonyms: 20,
  realAntonyms: 15,
  realDefinitions: 25,
};

const mockTicketConfigLoader: Services["ticketConfigs"] = {
  ...defaultServices.ticketConfigs,
  async getActiveConfig() {
    await Promise.resolve();
    return mockConfig;
  },
  async updateActiveConfig(data: TicketConfigData) {
    await Promise.resolve();
    mockConfig = { ...mockConfig, ...data };
  },
  async getDatabaseWordStats() {
    await Promise.resolve();
    return mockStats;
  },
};

const mockAdminSessionRows = new Map<
  string,
  { id: string; username: string; createdAt: Date; expiresAt: Date }
>();

async function purgeMockAdminSessions(now = new Date()) {
  await Promise.resolve();
  for (const [id, session] of mockAdminSessionRows) {
    if (session.expiresAt < now) mockAdminSessionRows.delete(id);
  }
}

const mockAdminSessions: Services["adminSessions"] = {
  purgeExpired: purgeMockAdminSessions,
  async getAdminSession(sessionId) {
    await purgeMockAdminSessions();
    return mockAdminSessionRows.get(sessionId) ?? null;
  },
  async createAdminSession(sessionId, username, expiresAt) {
    await Promise.resolve();
    mockAdminSessionRows.set(sessionId, {
      id: sessionId,
      username,
      createdAt: new Date(),
      expiresAt,
    });
  },
  async deleteAdminSession(sessionId) {
    await Promise.resolve();
    mockAdminSessionRows.delete(sessionId);
  },
};

const app = createApp({
  ...defaultServices,
  adminSessions: mockAdminSessions,
  ticketConfigs: mockTicketConfigLoader,
  tickets: {
    ...defaultServices.tickets,
    getPublishedTickets: () => Promise.resolve([]),
  },
  sessions: {
    ...defaultServices.sessions,
    loadStage2Result: () => Promise.resolve(null),
  },
});

async function createAdminSession() {
  const sessionId = crypto.randomUUID();
  await mockAdminSessions.createAdminSession(
    sessionId,
    "admin",
    new Date(Date.now() + 60 * 1000),
  );
  return sessionId;
}

Deno.test("VER-ADMIN-TICKET-CONFIG: GET /admin/ticket-config renders configuration page", async () => {
  const sessionId = await createAdminSession();
  const response = await app.request("/admin/ticket-config", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(body, "Ticket Composition Config");
  assertStringIncludes(body, "Mock Default Config");
  assertStringIncludes(body, "Real Words Count");
  assertStringIncludes(body, "100"); // stats totalReal
});

Deno.test("VER-ADMIN-TICKET-CONFIG: POST /admin/ticket-config/edit updates configuration successfully", async () => {
  const sessionId = await createAdminSession();

  const validForm = new URLSearchParams();
  validForm.append("name", "Updated Preset");
  validForm.append("difficulty1Count", "10");
  validForm.append("difficulty2Count", "10");
  validForm.append("difficulty3Count", "10");
  validForm.append("difficulty4Count", "10");
  validForm.append("difficulty5Count", "10");
  validForm.append("realCount", "35");
  validForm.append("pseudoCount", "15");
  validForm.append("synonymsCount", "5");
  validForm.append("antonymsCount", "5");
  validForm.append("spellingCount", "5");
  validForm.append("definitionCount", "5");
  validForm.append("randomizeOrder", "on");

  const response = await app.request("/admin/ticket-config/edit", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: validForm.toString(),
  });

  assertEquals(response.status, 302);
  assertEquals(mockConfig.name, "Updated Preset");
  assertEquals(mockConfig.realCount, 35);
  assertEquals(mockConfig.antonymsCount, 5);
  assertEquals(mockConfig.randomizeOrder, true);
});

Deno.test("VER-ADMIN-TICKET-CONFIG: POST /admin/ticket-config/edit validates antonymsCount exceeds available real words with antonyms", async () => {
  const sessionId = await createAdminSession();

  const invalidForm = new URLSearchParams();
  invalidForm.append("name", "Too Many Antonyms Config");
  invalidForm.append("difficulty1Count", "10");
  invalidForm.append("difficulty2Count", "10");
  invalidForm.append("difficulty3Count", "10");
  invalidForm.append("difficulty4Count", "10");
  invalidForm.append("difficulty5Count", "10");
  invalidForm.append("realCount", "35");
  invalidForm.append("pseudoCount", "15");
  invalidForm.append("synonymsCount", "5");
  invalidForm.append("antonymsCount", "50"); // stats say only 15 real words have antonyms
  invalidForm.append("spellingCount", "5");
  invalidForm.append("definitionCount", "5");

  const response = await app.request("/admin/ticket-config/edit", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: invalidForm.toString(),
  });

  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(
    body,
    "Requested antonyms challenge count (50) exceeds available real words with antonyms (15)",
  );
});

Deno.test("VER-ADMIN-TICKET-CONFIG: POST /admin/ticket-config/edit validates mismatch in total counts", async () => {
  const sessionId = await createAdminSession();

  const invalidForm = new URLSearchParams();
  invalidForm.append("name", "Bad Total Config");
  // Total diff counts = 50, but real + pseudo = 40 (mismatch!)
  invalidForm.append("difficulty1Count", "10");
  invalidForm.append("difficulty2Count", "10");
  invalidForm.append("difficulty3Count", "10");
  invalidForm.append("difficulty4Count", "10");
  invalidForm.append("difficulty5Count", "10");
  invalidForm.append("realCount", "30");
  invalidForm.append("pseudoCount", "10");

  const response = await app.request("/admin/ticket-config/edit", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: invalidForm.toString(),
  });

  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(
    body,
    "Total difficulty counts (50) must equal real + pseudoword counts (40)",
  );
});

Deno.test("VER-ADMIN-TICKET-CONFIG: POST /admin/ticket-config/edit validates exceeds db pool limits", async () => {
  const sessionId = await createAdminSession();

  const invalidForm = new URLSearchParams();
  invalidForm.append("name", "Too Big Config");
  invalidForm.append("difficulty1Count", "50"); // stats says difficulty 1 has only 30 words!
  invalidForm.append("difficulty2Count", "10");
  invalidForm.append("difficulty3Count", "10");
  invalidForm.append("difficulty4Count", "10");
  invalidForm.append("difficulty5Count", "10");
  // total = 90
  invalidForm.append("realCount", "80");
  invalidForm.append("pseudoCount", "10");

  const response = await app.request("/admin/ticket-config/edit", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: invalidForm.toString(),
  });

  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(
    body,
    "Difficulty 1 count (50) exceeds available in database (30)",
  );
});
