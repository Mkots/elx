import { assertEquals, assertStringIncludes } from "@std/assert";
import { eq } from "drizzle-orm";
import { createApp } from "../app.ts";
import { db } from "../db/client.ts";
import { defaultServices, type Services } from "../db/services.ts";
import { adminSessions } from "../db/schema.ts";
import { executeImport, validateConfig } from "../scripts/importer_core.ts";
import type { TestRun } from "../db/repositories/history.ts";

const mockDashboardLoader: Pick<Services["history"], "getDashboardStats"> = {
  async getDashboardStats() {
    await Promise.resolve();
    const recentRuns: TestRun[] = [
      {
        id: "mock-session-1",
        ticketId: null,
        createdAt: new Date("2026-06-19T12:00:00Z"),
        completedAt: new Date("2026-06-19T12:00:00Z"),
        score: 80,
        truthfulness: 90,
        stage1Selection: null,
      },
      {
        id: "mock-session-2",
        ticketId: null,
        createdAt: new Date("2026-06-19T13:00:00Z"),
        completedAt: new Date("2026-06-19T13:00:00Z"),
        score: 60,
        truthfulness: 80,
        stage1Selection: null,
      },
    ];
    return {
      totalRuns: 2,
      avgScore: 70,
      avgTruthfulness: 85,
      recentRuns,
    };
  },
};

const mockWordsList = [
  {
    id: 1,
    value: "apple",
    isReal: true,
    difficulty: 2,
    reviewed: false,
    reviewedAt: null as Date | null,
    synonyms: [] as string[],
    antonyms: [] as string[],
    definition: null as string | null,
  },
  {
    id: 2,
    value: "banana",
    isReal: true,
    difficulty: 3,
    reviewed: false,
    reviewedAt: null as Date | null,
    synonyms: [] as string[],
    antonyms: [] as string[],
    definition: null as string | null,
  },
  {
    id: 3,
    value: "blarg",
    isReal: false,
    difficulty: 1,
    reviewed: false,
    reviewedAt: null as Date | null,
    synonyms: [] as string[],
    antonyms: [] as string[],
    definition: null as string | null,
  },
];

const mockReviewLoader: Services["words"] = {
  ...defaultServices.words,
  async getNextUnreviewed(afterId?: number) {
    await Promise.resolve();
    if (afterId !== undefined) {
      const nextWord = mockWordsList.find((w) =>
        w.reviewed === false && w.id > afterId
      );
      if (nextWord) return nextWord;
    }
    return mockWordsList.find((w) => w.reviewed === false) ?? null;
  },

  async skipWord(id: number) {
    return await this.getNextUnreviewed(id);
  },

  async reviewWord(id, { value, isReal, difficulty }) {
    await Promise.resolve();
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) throw new Error("Word value cannot be empty");
    if (difficulty < 1 || difficulty > 5) {
      throw new Error("Difficulty must be between 1 and 5");
    }

    if (mockWordsList.some((w) => w.value === trimmed && w.id !== id)) {
      throw new Error(`Word '${trimmed}' already exists`);
    }

    const word = mockWordsList.find((w) => w.id === id);
    if (word) {
      word.value = trimmed;
      word.isReal = isReal;
      word.difficulty = difficulty;
      word.reviewed = true;
      word.reviewedAt = new Date();
    }
  },

  async progress() {
    await Promise.resolve();
    const total = mockWordsList.length;
    const reviewed = mockWordsList.filter((w) => w.reviewed).length;
    const remaining = total - reviewed;
    return { reviewed, total, remaining };
  },
};

const mockWordsLoader: Services["words"] = {
  ...defaultServices.words,
  async listWords({ search, difficulty, isReal, reviewed, page, limit }) {
    await Promise.resolve();
    let filtered = [...mockWordsList];
    if (search) {
      filtered = filtered.filter((w) => w.value.includes(search));
    }
    if (difficulty !== undefined) {
      filtered = filtered.filter((w) => w.difficulty === difficulty);
    }
    if (isReal !== undefined) {
      filtered = filtered.filter((w) => w.isReal === isReal);
    }
    if (reviewed !== undefined) {
      filtered = filtered.filter((w) => w.reviewed === reviewed);
    }
    const totalCount = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    return { words: paginated, totalCount };
  },

  async findWordIds({ search, difficulty, isReal, reviewed }) {
    await Promise.resolve();
    return mockWordsList
      .filter((w) => !search || w.value.includes(search))
      .filter((w) => difficulty === undefined || w.difficulty === difficulty)
      .filter((w) => isReal === undefined || w.isReal === isReal)
      .filter((w) => reviewed === undefined || w.reviewed === reviewed)
      .map((w) => w.id);
  },

  async getWord(id) {
    await Promise.resolve();
    return mockWordsList.find((w) => w.id === id) ?? null;
  },

  async createWord({ value, isReal, difficulty }) {
    await Promise.resolve();
    if (mockWordsList.some((w) => w.value === value)) {
      throw new Error("duplicate key value violates unique constraint");
    }
    const nextId =
      mockWordsList.reduce((max, w) => (w.id > max ? w.id : max), 0) + 1;
    mockWordsList.push({
      id: nextId,
      value,
      isReal,
      difficulty,
      reviewed: false,
      reviewedAt: null,
      synonyms: [],
      antonyms: [],
      definition: null,
    });
  },

  async updateWord(id, { value, isReal, difficulty }) {
    await Promise.resolve();
    const index = mockWordsList.findIndex((w) => w.id === id);
    if (index !== -1) {
      const existing = mockWordsList[index];
      mockWordsList[index] = {
        ...existing,
        value,
        isReal,
        difficulty,
      };
    }
  },

  async deleteWord(id) {
    await Promise.resolve();
    const index = mockWordsList.findIndex((w) => w.id === id);
    if (index !== -1) {
      // Simulate ref check for word ID 1
      if (id === 1) {
        return { success: false, error: "Word is referenced in synonyms." };
      }
      mockWordsList.splice(index, 1);
      return { success: true };
    }
    return { success: false, error: "Word not found." };
  },

  async bulkSetReviewed(ids, reviewed) {
    await Promise.resolve();
    let count = 0;
    for (const w of mockWordsList) {
      if (ids.includes(w.id)) {
        w.reviewed = reviewed;
        w.reviewedAt = reviewed ? new Date() : null;
        count++;
      }
    }
    return count;
  },

  async bulkSetIsReal(ids, isReal) {
    await Promise.resolve();
    let count = 0;
    for (const w of mockWordsList) {
      if (ids.includes(w.id)) {
        w.isReal = isReal;
        count++;
      }
    }
    return count;
  },

  async bulkDelete(ids) {
    await Promise.resolve();
    const skipped: { id: number; reason: string }[] = [];
    let deleted = 0;
    for (const id of ids) {
      // Simulate ref check for word ID 1 (mirrors deleteWord)
      if (id === 1) {
        skipped.push({ id, reason: "Word is referenced in synonyms." });
        continue;
      }
      const index = mockWordsList.findIndex((w) => w.id === id);
      if (index !== -1) {
        mockWordsList.splice(index, 1);
        deleted++;
      }
    }
    return { deleted, skipped };
  },

  async importWords(fileContent, configJson, dryRun) {
    await Promise.resolve();
    // Simulate Drizzle DB mapping onto mockWordsList
    const mockDb = {
      select() {
        return {
          from() {
            return mockWordsList;
          },
        };
      },
      insert() {
        return {
          values(data: { value: string; isReal: boolean; difficulty: number }) {
            return {
              returning() {
                if (!dryRun) {
                  const nextId = mockWordsList.reduce(
                    (max, w) => (w.id > max ? w.id : max),
                    0,
                  ) + 1;
                  const newWord = {
                    id: nextId,
                    value: data.value,
                    isReal: data.isReal,
                    difficulty: data.difficulty,
                    reviewed: false,
                    reviewedAt: null as Date | null,
                    synonyms: [] as string[],
                    antonyms: [] as string[],
                    definition: null as string | null,
                  };
                  mockWordsList.push(newWord);
                  return [{ id: nextId }];
                }
                return [{ id: 0 }];
              },
            };
          },
        };
      },
      update() {
        return {
          set(
            updateData: {
              value?: string;
              isReal?: boolean;
              difficulty?: number;
            },
          ) {
            return {
              where() {
                if (!dryRun) {
                  const word = mockWordsList.find((w) =>
                    w.value === updateData.value
                  );
                  if (word) {
                    if (updateData.isReal !== undefined) {
                      word.isReal = updateData.isReal;
                    }
                    if (updateData.difficulty !== undefined) {
                      word.difficulty = updateData.difficulty;
                    }
                  }
                }
              },
            };
          },
        };
      },
    };
    const rawConfig = JSON.parse(configJson);
    const config = validateConfig(rawConfig);
    return await executeImport(mockDb, fileContent, config, dryRun);
  },
};

const mockHistoryList: TestRun[] = [];

function resetMockData() {
  mockWordsList.length = 0;
  mockWordsList.push(
    {
      id: 1,
      value: "apple",
      isReal: true,
      difficulty: 2,
      reviewed: false,
      reviewedAt: null as Date | null,
      synonyms: [] as string[],
      antonyms: [] as string[],
      definition: null as string | null,
    },
    {
      id: 2,
      value: "banana",
      isReal: true,
      difficulty: 3,
      reviewed: false,
      reviewedAt: null as Date | null,
      synonyms: [] as string[],
      antonyms: [] as string[],
      definition: null as string | null,
    },
    {
      id: 3,
      value: "blarg",
      isReal: false,
      difficulty: 1,
      reviewed: false,
      reviewedAt: null as Date | null,
      synonyms: [] as string[],
      antonyms: [] as string[],
      definition: null as string | null,
    },
  );

  mockHistoryList.length = 0;
  mockHistoryList.push(
    {
      id: "session-abc-123",
      ticketId: null,
      createdAt: new Date("2026-06-19T10:00:00Z"),
      completedAt: new Date("2026-06-19T10:00:00Z"),
      score: 80,
      truthfulness: 90,
      stage1Selection: null,
    },
    {
      id: "session-def-456",
      ticketId: null,
      createdAt: new Date("2026-06-19T11:00:00Z"),
      completedAt: new Date("2026-06-19T11:00:00Z"),
      score: 70,
      truthfulness: 85,
      stage1Selection: null,
    },
    {
      id: "session-ghi-789",
      ticketId: null,
      createdAt: new Date("2026-06-19T12:00:00Z"),
      completedAt: new Date("2026-06-19T12:00:00Z"),
      score: 95,
      truthfulness: 100,
      stage1Selection: null,
    },
  );
}

const mockHistoryLoader: Services["history"] = {
  ...defaultServices.history,
  async listHistory({ search, orderBy, orderDir, page, limit }) {
    await Promise.resolve();
    let filtered = [...mockHistoryList];
    if (search) {
      filtered = filtered.filter((r) => r.id.includes(search));
    }

    if (orderBy === "score") {
      filtered.sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        return orderDir === "asc" ? scoreA - scoreB : scoreB - scoreA;
      });
    } else {
      filtered.sort((a, b) => {
        const timeA = (a.completedAt ?? a.createdAt).getTime();
        const timeB = (b.completedAt ?? b.createdAt).getTime();
        return orderDir === "asc" ? timeA - timeB : timeB - timeA;
      });
    }

    const totalCount = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return { history: paginated, totalCount };
  },

  async exportAllHistory() {
    await Promise.resolve();
    return [...mockHistoryList];
  },
};

const mockServices: Services = {
  ...defaultServices,
  history: {
    ...defaultServices.history,
    getDashboardStats: mockDashboardLoader.getDashboardStats,
    listHistory: mockHistoryLoader.listHistory,
    exportAllHistory: mockHistoryLoader.exportAllHistory,
    saveStage2Result: defaultServices.history.saveStage2Result,
  },
  words: {
    // Merge both mocks: words loader + review loader functions on top of defaults
    ...defaultServices.words,
    listWords: mockWordsLoader.listWords,
    findWordIds: mockWordsLoader.findWordIds,
    getWord: mockWordsLoader.getWord,
    createWord: mockWordsLoader.createWord,
    updateWord: mockWordsLoader.updateWord,
    deleteWord: mockWordsLoader.deleteWord,
    bulkSetReviewed: mockWordsLoader.bulkSetReviewed,
    bulkSetIsReal: mockWordsLoader.bulkSetIsReal,
    bulkDelete: mockWordsLoader.bulkDelete,
    importWords: mockWordsLoader.importWords,
    getNextUnreviewed: mockReviewLoader.getNextUnreviewed,
    skipWord: mockReviewLoader.skipWord,
    reviewWord: mockReviewLoader.reviewWord,
    progress: mockReviewLoader.progress,
  },
  tickets: {
    ...defaultServices.tickets,
    getPublishedTickets: () => Promise.resolve([]),
  },
  sessions: {
    ...defaultServices.sessions,
    loadStage2Result: () => Promise.resolve(null),
  },
};

const app = createApp(mockServices);

// Setup helper for authenticated session
async function createAdminSession() {
  const sessionId = crypto.randomUUID();
  await db.insert(adminSessions).values({
    id: sessionId,
    username: "admin",
    expiresAt: new Date(Date.now() + 60 * 1000),
  });
  return sessionId;
}

Deno.test("VER-ADMIN-ROUTE: GET /admin redirects unauthenticated user to login", async () => {
  const response = await app.request("/admin");
  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/admin/login");
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/login renders login page", async () => {
  Deno.env.set("ADMIN_USERNAME", "testadmin");
  Deno.env.set("ADMIN_PASSWORD", "testpass");

  try {
    const response = await app.request("/admin/login");
    const body = await response.text();
    assertEquals(response.status, 200);
    assertStringIncludes(
      response.headers.get("content-type") ?? "",
      "text/html",
    );
    assertStringIncludes(body, "ELX Admin Portal");
  } finally {
    Deno.env.delete("ADMIN_USERNAME");
    Deno.env.delete("ADMIN_PASSWORD");
  }
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/login returns 503 when admin credentials are unset", async () => {
  const response = await app.request("/admin/login");
  assertEquals(response.status, 503);
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/login handles authentication and session creation", async () => {
  Deno.env.set("ADMIN_USERNAME", "testadmin");
  Deno.env.set("ADMIN_PASSWORD", "testpass");

  try {
    const invalidFormData = new URLSearchParams();
    invalidFormData.append("username", "testadmin");
    invalidFormData.append("password", "wrongpass");

    const failResponse = await app.request("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "http://localhost",
      },
      body: invalidFormData.toString(),
    });
    const failBody = await failResponse.text();
    assertEquals(failResponse.status, 200);
    assertStringIncludes(failBody, "Invalid username or password");

    const validFormData = new URLSearchParams();
    validFormData.append("username", "testadmin");
    validFormData.append("password", "testpass");

    const successResponse = await app.request("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "http://localhost",
      },
      body: validFormData.toString(),
    });
    assertEquals(successResponse.status, 302);
    assertEquals(successResponse.headers.get("location"), "/admin");

    const cookieHeader = successResponse.headers.get("set-cookie") ?? "";
    assertStringIncludes(cookieHeader, "admin_session=");

    const match = cookieHeader.match(/admin_session=([^;]+)/);
    const sessionId = match ? match[1] : "";
    assertEquals(sessionId !== "", true);

    const sessionEntry = await db.select()
      .from(adminSessions)
      .where(eq(adminSessions.id, sessionId))
      .limit(1);
    assertEquals(sessionEntry.length, 1);

    const authenticatedResponse = await app.request("/admin", {
      headers: { "Cookie": `admin_session=${sessionId}` },
    });
    const authBody = await authenticatedResponse.text();
    assertEquals(authenticatedResponse.status, 200);
    assertStringIncludes(authBody, "Total Runs");
    assertStringIncludes(authBody, "2");
    assertStringIncludes(authBody, "Average Score");
    assertStringIncludes(authBody, "70%");
    assertStringIncludes(authBody, "Avg Truthfulness");
    assertStringIncludes(authBody, "85%");
    assertStringIncludes(authBody, "mock-session-1");
    assertStringIncludes(authBody, "mock-session-2");

    const logoutResponse = await app.request("/admin/logout", {
      method: "POST",
      headers: {
        "Cookie": `admin_session=${sessionId}`,
        "Origin": "http://localhost",
      },
    });
    assertEquals(logoutResponse.status, 302);
    assertEquals(logoutResponse.headers.get("location"), "/admin/login");

    const deletedEntry = await db.select()
      .from(adminSessions)
      .where(eq(adminSessions.id, sessionId))
      .limit(1);
    assertEquals(deletedEntry.length, 0);
  } finally {
    Deno.env.delete("ADMIN_USERNAME");
    Deno.env.delete("ADMIN_PASSWORD");
  }
});

Deno.test("VER-ADMIN-AUTH: expired admin session redirects to login", async () => {
  const sessionId = crypto.randomUUID();
  await db.insert(adminSessions).values({
    id: sessionId,
    username: "admin",
    expiresAt: new Date(Date.now() - 60 * 1000),
  });

  const response = await app.request("/admin", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/admin/login");
});

Deno.test("VER-ADMIN-AUTH: GET /admin/login returns 503 when env vars not set", async () => {
  Deno.env.delete("ADMIN_USERNAME");
  Deno.env.delete("ADMIN_PASSWORD");

  const response = await app.request("/admin/login");
  const body = await response.text();
  assertEquals(response.status, 503);
  assertStringIncludes(body, "disabled");
});

Deno.test("VER-ADMIN-AUTH: POST /admin/login returns 503 when env vars not set", async () => {
  Deno.env.delete("ADMIN_USERNAME");
  Deno.env.delete("ADMIN_PASSWORD");

  const form = new URLSearchParams();
  form.append("username", "admin");
  form.append("password", "admin");

  const response = await app.request("/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: form.toString(),
  });
  assertEquals(response.status, 503);
});

Deno.test("VER-ADMIN-AUTH: 6th rapid login attempt returns 429", async () => {
  Deno.env.set("ADMIN_USERNAME", "admin-rl-test");
  Deno.env.set("ADMIN_PASSWORD", "pass-rl-test");

  // Use a unique IP header to avoid interfering with other tests
  const uniqueIp = `10.0.0.${Date.now() % 254 + 1}`;

  try {
    const form = new URLSearchParams();
    form.append("username", "wrong");
    form.append("password", "wrong");

    // 5 failed attempts (should succeed with 200 "Invalid...")
    for (let i = 0; i < 5; i++) {
      const res = await app.request("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": "http://localhost",
          "x-forwarded-for": uniqueIp,
        },
        body: form.toString(),
      });
      assertEquals(res.status, 200);
    }

    // 6th attempt should be rate-limited
    const res6 = await app.request("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "http://localhost",
        "x-forwarded-for": uniqueIp,
      },
      body: form.toString(),
    });
    assertEquals(res6.status, 429);
    const body = await res6.text();
    assertStringIncludes(body, "Too many login attempts");
  } finally {
    Deno.env.delete("ADMIN_USERNAME");
    Deno.env.delete("ADMIN_PASSWORD");
  }
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/words lists words and filters them", async () => {
  const sessionId = await createAdminSession();

  // Test full list
  const listRes = await app.request("/admin/words", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  assertEquals(listRes.status, 200);
  assertStringIncludes(listBody, "apple");
  assertStringIncludes(listBody, "banana");
  assertStringIncludes(listBody, "blarg");

  // Test search filter
  const searchRes = await app.request("/admin/words?q=ban", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const searchBody = await searchRes.text();
  assertStringIncludes(searchBody, "banana");
  assertEquals(searchBody.includes("apple"), false);
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/words/new renders edit form", async () => {
  const sessionId = await createAdminSession();

  const response = await app.request("/admin/words/new", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(body, "Add New Word");
  assertStringIncludes(body, "Word Value");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/words/new validation and creation", async () => {
  const sessionId = await createAdminSession();

  // 1. Missing value validation
  const emptyForm = new URLSearchParams();
  emptyForm.append("value", "");
  emptyForm.append("difficulty", "3");
  emptyForm.append("isReal", "true");

  const failRes1 = await app.request("/admin/words/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: emptyForm.toString(),
  });
  const failBody1 = await failRes1.text();
  assertEquals(failRes1.status, 200);
  assertStringIncludes(failBody1, "Word value is required.");

  // 2. Duplicate validation
  const dupForm = new URLSearchParams();
  dupForm.append("value", "apple");
  dupForm.append("difficulty", "2");
  dupForm.append("isReal", "true");

  const failRes2 = await app.request("/admin/words/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: dupForm.toString(),
  });
  const failBody2 = await failRes2.text();
  assertEquals(failRes2.status, 200);
  assertStringIncludes(failBody2, "The word &quot;apple&quot; already exists.");

  // 3. Successful creation
  const successForm = new URLSearchParams();
  successForm.append("value", "cherry");
  successForm.append("difficulty", "4");
  successForm.append("isReal", "true");

  const successRes = await app.request("/admin/words/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: successForm.toString(),
  });
  assertEquals(successRes.status, 302);
  assertStringIncludes(
    successRes.headers.get("location") ?? "",
    "/admin/words?success=",
  );

  // Check it exists in list
  const verifyRes = await app.request("/admin/words", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const verifyBody = await verifyRes.text();
  assertStringIncludes(verifyBody, "cherry");
});

Deno.test("VER-ADMIN-ROUTE: GET and POST /admin/words/:id/edit prefill and update", async () => {
  const sessionId = await createAdminSession();

  // Prefill form
  const editRes = await app.request("/admin/words/2/edit", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const editBody = await editRes.text();
  assertEquals(editRes.status, 200);
  assertStringIncludes(editBody, "banana");

  // Post update
  const updateForm = new URLSearchParams();
  updateForm.append("value", "blueberry");
  updateForm.append("difficulty", "4");
  updateForm.append("isReal", "true");

  const updateRes = await app.request("/admin/words/2/edit", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: updateForm.toString(),
  });
  assertEquals(updateRes.status, 302);

  // Check update in list
  const listRes = await app.request("/admin/words", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  assertStringIncludes(listBody, "blueberry");
  assertEquals(listBody.includes("banana"), false);
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/words/:id/delete safe checks", async () => {
  const sessionId = await createAdminSession();

  // 1. Delete with reference error (simulating id 1 check)
  const failDelete = await app.request("/admin/words/1/delete", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Origin": "http://localhost",
    },
  });
  assertEquals(failDelete.status, 302);
  assertStringIncludes(
    failDelete.headers.get("location") ?? "",
    "/admin/words?error=",
  );

  // 2. Success delete
  const successDelete = await app.request("/admin/words/3/delete", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Origin": "http://localhost",
    },
  });
  assertEquals(successDelete.status, 302);
  assertStringIncludes(
    successDelete.headers.get("location") ?? "",
    "/admin/words?success=",
  );

  // Verify deletion
  const listRes = await app.request("/admin/words", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  assertEquals(listBody.includes("blarg"), false);
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/history lists and sorts/filters test sessions", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // 1. Basic list
  const res1 = await app.request("/admin/history", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body1 = await res1.text();
  assertEquals(res1.status, 200);
  assertStringIncludes(body1, "Test Session History");
  assertStringIncludes(body1, "session-abc-123");
  assertStringIncludes(body1, "session-def-456");
  assertStringIncludes(body1, "session-ghi-789");

  // 2. Filter by search query
  const res2 = await app.request("/admin/history?q=def", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body2 = await res2.text();
  assertEquals(res2.status, 200);
  assertStringIncludes(body2, "session-def-456");
  assertEquals(body2.includes("session-abc-123"), false);

  // 3. Sort by score ascending
  const res3 = await app.request("/admin/history?orderBy=score&orderDir=asc", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body3 = await res3.text();
  assertEquals(res3.status, 200);
  // Order check: session-def-456 (70%) is before session-abc-123 (80%) which is before session-ghi-789 (95%)
  const idxDef = body3.indexOf("session-def-456");
  const idxAbc = body3.indexOf("session-abc-123");
  const idxGhi = body3.indexOf("session-ghi-789");
  assertEquals(idxDef < idxAbc, true);
  assertEquals(idxAbc < idxGhi, true);
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/history/export exports CSV and JSON formats", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // 1. Export CSV
  const csvRes = await app.request("/admin/history/export?format=csv", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const csvBody = await csvRes.text();
  assertEquals(csvRes.status, 200);
  assertEquals(csvRes.headers.get("Content-Type"), "text/csv");
  assertStringIncludes(
    csvRes.headers.get("Content-Disposition") ?? "",
    "attachment; filename=elx-test-history.csv",
  );
  assertStringIncludes(
    csvBody,
    "id,score,truthfulness,completed_at",
  );
  assertStringIncludes(csvBody, "session-abc-123");
  assertStringIncludes(csvBody, "session-def-456");

  // 2. Export JSON
  const jsonRes = await app.request("/admin/history/export?format=json", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const jsonBody = await jsonRes.json();
  assertEquals(jsonRes.status, 200);
  assertEquals(jsonRes.headers.get("Content-Type"), "application/json");
  assertStringIncludes(
    jsonRes.headers.get("Content-Disposition") ?? "",
    "attachment; filename=elx-test-history.json",
  );
  assertEquals(jsonBody.length, 3);
  assertEquals(jsonBody[0].id, "session-abc-123");

  // 3. Invalid format
  const invalidRes = await app.request("/admin/history/export?format=invalid", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertEquals(invalidRes.status, 400);
});

Deno.test("VER-ADMIN-ROUTE: GET and POST /admin/words/import routes", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // 1. GET route
  const getRes = await app.request("/admin/words/import", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const getBody = await getRes.text();
  assertEquals(getRes.status, 200);
  assertStringIncludes(getBody, "Import Words");
  assertStringIncludes(getBody, "Source File");

  // 2. POST route with valid CSV file (dry run)
  const config = {
    format: "csv",
    delimiter: ",",
    hasHeader: true,
    fields: {
      value: { from: "word" },
      isReal: {
        from: "real_flag",
        map: { "y": true, "n": false },
        default: true,
      },
      difficulty: { from: "level", default: 3 },
    },
  };

  const fileContent = "word,real_flag,level\nkiwi,y,4\nmango,n,2";

  const formData = new FormData();
  const fileBlob = new Blob([fileContent], { type: "text/csv" });
  formData.append("file", fileBlob, "test.csv");
  formData.append("config", JSON.stringify(config));
  formData.append("dryRun", "true");

  const postRes = await app.request("/admin/words/import", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Origin": "http://localhost",
    },
    body: formData,
  });

  const postBody = await postRes.text();
  assertEquals(postRes.status, 200);
  assertStringIncludes(postBody, "Dry run completed successfully");
  assertStringIncludes(postBody, "Import Results");
  // Check count "2" is shown in inserted result block
  assertStringIncludes(postBody, "2");
});

Deno.test("VER-ADMIN-ROUTE: GET and POST /admin/words/review and skip routes", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // 1. GET /admin/words/review loads first unreviewed word
  const getRes = await app.request("/admin/words/review", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const getBody = await getRes.text();
  assertEquals(getRes.status, 200);
  assertStringIncludes(getBody, "Word Review &amp; Refinement");
  assertStringIncludes(getBody, "apple"); // first unreviewed word
  assertStringIncludes(getBody, "Progress: 0 of 3 reviewed");

  // 2. POST /admin/words/review/:id submits edit and marks reviewed, returns next word card
  const formData = new FormData();
  formData.append("value", "apple-refined");
  formData.append("isReal", "true");
  formData.append("difficulty", "3");

  const postRes = await app.request("/admin/words/review/1", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Origin": "http://localhost",
    },
    body: formData,
  });
  const postBody = await postRes.text();
  assertEquals(postRes.status, 200);
  // Word 1 (apple) is now reviewed, so it should load word 2 (banana)
  assertStringIncludes(postBody, "banana");
  assertStringIncludes(postBody, "Progress: 1 of 3 reviewed");

  // Verify DB state updated
  const updatedWord = mockWordsList.find((w) => w.id === 1);
  assertEquals(updatedWord?.value, "apple-refined");
  assertEquals(updatedWord?.reviewed, true);

  // 3. POST /admin/words/review/:id/skip skips the word without marking reviewed, returns next card
  const skipRes = await app.request("/admin/words/review/2/skip", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Origin": "http://localhost",
    },
  });
  const skipBody = await skipRes.text();
  assertEquals(skipRes.status, 200);
  // Skipped word 2 (banana), should return next card word 3 (blarg)
  assertStringIncludes(skipBody, "blarg");

  // Verify banana (id: 2) was NOT marked reviewed
  const bananaWord = mockWordsList.find((w) => w.id === 2);
  assertEquals(bananaWord?.reviewed, false);

  // 4. POST /admin/words/review/:id handles validation errors and re-renders card with error
  const invalidForm = new FormData();
  invalidForm.append("value", ""); // empty value
  invalidForm.append("isReal", "false");
  invalidForm.append("difficulty", "6"); // out of bounds

  const errRes = await app.request("/admin/words/review/3", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Origin": "http://localhost",
    },
    body: invalidForm,
  });
  const errBody = await errRes.text();
  assertEquals(errRes.status, 200);
  assertStringIncludes(errBody, "Word value cannot be empty");
});

async function createWordViaApi(
  sessionId: string,
  value: string,
  isReal = true,
  difficulty = 3,
) {
  const form = new URLSearchParams();
  form.append("value", value);
  form.append("difficulty", String(difficulty));
  form.append("isReal", String(isReal));
  await app.request("/admin/words/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: form.toString(),
  });
}

function bulkRequest(sessionId: string, fields: Record<string, string>) {
  const form = new URLSearchParams(fields);
  return app.request("/admin/words/bulk", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost",
    },
    body: form.toString(),
    redirect: "manual",
  });
}

Deno.test("VER-ADMIN-ROUTE: words list shows Reviewed column and filters by reviewed", async () => {
  const sessionId = await createAdminSession();
  await createWordViaApi(sessionId, "revfiltw");

  // List renders the Reviewed column header.
  const listRes = await app.request("/admin/words", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  assertEquals(listRes.status, 200);
  assertStringIncludes(listBody, "Reviewed");
  assertStringIncludes(listBody, "Pending");

  // New word is pending: it appears under reviewed=false (populated table)
  // and is absent under reviewed=true (empty result). The search box echoes
  // the query, so assert on the table state rather than the raw substring.
  const pendingRes = await app.request(
    "/admin/words?q=revfiltw&reviewed=false",
    {
      headers: { "Cookie": `admin_session=${sessionId}` },
    },
  );
  const pendingBody = await pendingRes.text();
  assertStringIncludes(pendingBody, "revfiltw");
  assertEquals(pendingBody.includes("No words match"), false);

  const reviewedRes = await app.request(
    "/admin/words?q=revfiltw&reviewed=true",
    {
      headers: { "Cookie": `admin_session=${sessionId}` },
    },
  );
  assertStringIncludes(await reviewedRes.text(), "No words match");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/words/bulk mark_reviewed via selectAllMatching", async () => {
  const sessionId = await createAdminSession();
  await createWordViaApi(sessionId, "bulkrev");

  const res = await bulkRequest(sessionId, {
    action: "mark_reviewed",
    selectAllMatching: "true",
    q: "bulkrev",
  });
  assertEquals(res.status, 302);
  const location = res.headers.get("location") ?? "";
  assertStringIncludes(location, "success=");
  assertStringIncludes(location, "q=bulkrev");

  // It now appears under reviewed=true.
  const reviewedRes = await app.request(
    "/admin/words?q=bulkrev&reviewed=true",
    {
      headers: { "Cookie": `admin_session=${sessionId}` },
    },
  );
  assertStringIncludes(await reviewedRes.text(), "bulkrev");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/words/bulk set_pseudo changes type", async () => {
  const sessionId = await createAdminSession();
  await createWordViaApi(sessionId, "bulkpseudo", true);

  const res = await bulkRequest(sessionId, {
    action: "set_pseudo",
    selectAllMatching: "true",
    q: "bulkpseudo",
  });
  assertEquals(res.status, 302);

  const pseudoRes = await app.request(
    "/admin/words?q=bulkpseudo&isReal=false",
    {
      headers: { "Cookie": `admin_session=${sessionId}` },
    },
  );
  assertStringIncludes(await pseudoRes.text(), "bulkpseudo");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/words/bulk delete removes matching words", async () => {
  const sessionId = await createAdminSession();
  await createWordViaApi(sessionId, "bulkdelme");

  const res = await bulkRequest(sessionId, {
    action: "delete",
    selectAllMatching: "true",
    q: "bulkdelme",
  });
  assertEquals(res.status, 302);
  assertStringIncludes(res.headers.get("location") ?? "", "Deleted");

  const gone = await app.request("/admin/words?q=bulkdelme", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertStringIncludes(await gone.text(), "No words match");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/words/bulk with no selection redirects with error", async () => {
  const sessionId = await createAdminSession();
  const res = await bulkRequest(sessionId, { action: "mark_reviewed" });
  assertEquals(res.status, 302);
  const location = res.headers.get("location") ?? "";
  assertStringIncludes(location, "error=");
  // URLSearchParams encodes spaces as "+", which decodeURIComponent keeps.
  assertStringIncludes(location.replaceAll("+", " "), "No words selected.");
});
