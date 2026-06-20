import { assertEquals, assertStringIncludes } from "@std/assert";
import { getKv } from "../session.ts";
import { createApp } from "../app.ts";
import type {
  AdminChallengesLoader,
  AdminDashboardLoader,
  AdminHistoryLoader,
  AdminReviewLoader,
  AdminWordsLoader,
} from "../routes/admin.tsx";
import { executeImport, validateConfig } from "../scripts/importer_core.ts";
import type { TestRun } from "../ui/pages/AdminDashboardPage.tsx";

const mockDashboardLoader: AdminDashboardLoader = {
  async getDashboardStats() {
    await Promise.resolve();
    const recentRuns: TestRun[] = [
      {
        id: 1,
        sessionId: "mock-session-1",
        score: 80,
        truthfulness: 90,
        completedAt: new Date("2026-06-19T12:00:00Z"),
      },
      {
        id: 2,
        sessionId: "mock-session-2",
        score: 60,
        truthfulness: 80,
        completedAt: new Date("2026-06-19T13:00:00Z"),
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
  },
  {
    id: 2,
    value: "banana",
    isReal: true,
    difficulty: 3,
    reviewed: false,
    reviewedAt: null as Date | null,
  },
  {
    id: 3,
    value: "blarg",
    isReal: false,
    difficulty: 1,
    reviewed: false,
    reviewedAt: null as Date | null,
  },
];

const mockReviewLoader: AdminReviewLoader = {
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

const mockWordsLoader: AdminWordsLoader = {
  async listWords({ search, difficulty, isReal, page, limit }) {
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
    const totalCount = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    return { words: paginated, totalCount };
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

const mockSynonymsList = [
  { id: 1, wordId: 1, targetId: 2, relationType: "synonym", distractors: [3] },
];

const mockSpellingList = [
  {
    id: 1,
    contextSentence: "I like to eat ___.",
    correctWordId: 1,
    distractors: [2, 3],
  },
];

const mockDefinitionsList = [
  { id: 1, wordId: 2, definitionText: "A yellow fruit.", distractors: [1, 3] },
];

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
    },
    {
      id: 2,
      value: "banana",
      isReal: true,
      difficulty: 3,
      reviewed: false,
      reviewedAt: null as Date | null,
    },
    {
      id: 3,
      value: "blarg",
      isReal: false,
      difficulty: 1,
      reviewed: false,
      reviewedAt: null as Date | null,
    },
  );

  mockSynonymsList.length = 0;
  mockSynonymsList.push(
    {
      id: 1,
      wordId: 1,
      targetId: 2,
      relationType: "synonym",
      distractors: [3],
    },
  );

  mockSpellingList.length = 0;
  mockSpellingList.push(
    {
      id: 1,
      contextSentence: "I like to eat ___.",
      correctWordId: 1,
      distractors: [2, 3],
    },
  );

  mockDefinitionsList.length = 0;
  mockDefinitionsList.push(
    {
      id: 1,
      wordId: 2,
      definitionText: "A yellow fruit.",
      distractors: [1, 3],
    },
  );

  mockHistoryList.length = 0;
  mockHistoryList.push(
    {
      id: 1,
      sessionId: "session-abc-123",
      score: 80,
      truthfulness: 90,
      completedAt: new Date("2026-06-19T10:00:00Z"),
    },
    {
      id: 2,
      sessionId: "session-def-456",
      score: 70,
      truthfulness: 85,
      completedAt: new Date("2026-06-19T11:00:00Z"),
    },
    {
      id: 3,
      sessionId: "session-ghi-789",
      score: 95,
      truthfulness: 100,
      completedAt: new Date("2026-06-19T12:00:00Z"),
    },
  );
}

const mockChallengesLoader: AdminChallengesLoader = {
  async listSynonyms() {
    await Promise.resolve();
    return [...mockSynonymsList];
  },
  async listSpelling() {
    await Promise.resolve();
    return [...mockSpellingList];
  },
  async listDefinitions() {
    await Promise.resolve();
    return [...mockDefinitionsList];
  },

  async getSynonym(id) {
    await Promise.resolve();
    return mockSynonymsList.find((s) => s.id === id) ?? null;
  },
  async getSpelling(id) {
    await Promise.resolve();
    return mockSpellingList.find((s) => s.id === id) ?? null;
  },
  async getDefinition(id) {
    await Promise.resolve();
    return mockDefinitionsList.find((s) => s.id === id) ?? null;
  },

  async createSynonym(data) {
    await Promise.resolve();
    const nextId =
      mockSynonymsList.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
    mockSynonymsList.push({ id: nextId, ...data });
  },
  async createSpelling(data) {
    await Promise.resolve();
    const nextId =
      mockSpellingList.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
    mockSpellingList.push({ id: nextId, ...data });
  },
  async createDefinition(data) {
    await Promise.resolve();
    const nextId =
      mockDefinitionsList.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
    mockDefinitionsList.push({ id: nextId, ...data });
  },

  async updateSynonym(id, data) {
    await Promise.resolve();
    const idx = mockSynonymsList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockSynonymsList[idx] = { id, ...data };
    }
  },
  async updateSpelling(id, data) {
    await Promise.resolve();
    const idx = mockSpellingList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockSpellingList[idx] = { id, ...data };
    }
  },
  async updateDefinition(id, data) {
    await Promise.resolve();
    const idx = mockDefinitionsList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockDefinitionsList[idx] = { id, ...data };
    }
  },

  async deleteSynonym(id) {
    await Promise.resolve();
    const idx = mockSynonymsList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockSynonymsList.splice(idx, 1);
    }
  },
  async deleteSpelling(id) {
    await Promise.resolve();
    const idx = mockSpellingList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockSpellingList.splice(idx, 1);
    }
  },
  async deleteDefinition(id) {
    await Promise.resolve();
    const idx = mockDefinitionsList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockDefinitionsList.splice(idx, 1);
    }
  },

  async getAllWords() {
    await Promise.resolve();
    return mockWordsList.map((w) => ({ id: w.id, value: w.value }));
  },
};

const mockHistoryLoader: AdminHistoryLoader = {
  async listHistory({ search, orderBy, orderDir, page, limit }) {
    await Promise.resolve();
    let filtered = [...mockHistoryList];
    if (search) {
      filtered = filtered.filter((r) => r.sessionId.includes(search));
    }

    if (orderBy === "score") {
      filtered.sort((
        a,
        b,
      ) => (orderDir === "asc" ? a.score - b.score : b.score - a.score));
    } else {
      filtered.sort((a, b) =>
        orderDir === "asc"
          ? a.completedAt.getTime() - b.completedAt.getTime()
          : b.completedAt.getTime() - a.completedAt.getTime()
      );
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

const app = createApp({
  adminDashboardLoader: mockDashboardLoader,
  adminWordsLoader: mockWordsLoader,
  adminChallengesLoader: mockChallengesLoader,
  adminHistoryLoader: mockHistoryLoader,
  adminReviewLoader: mockReviewLoader,
});

// Setup helper for authenticated session
async function createAdminSession() {
  const kv = await getKv();
  const sessionId = crypto.randomUUID();
  await kv.set(["admin_session", sessionId], { username: "admin" }, {
    expireIn: 60 * 1000,
  });
  return sessionId;
}

Deno.test("VER-ADMIN-ROUTE: GET /admin redirects unauthenticated user to login", async () => {
  const response = await app.request("/admin");
  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/admin/login");
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/login renders login page", async () => {
  const response = await app.request("/admin/login");
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(body, "ELX Admin Portal");
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: validFormData.toString(),
    });
    assertEquals(successResponse.status, 302);
    assertEquals(successResponse.headers.get("location"), "/admin");

    const cookieHeader = successResponse.headers.get("set-cookie") ?? "";
    assertStringIncludes(cookieHeader, "admin_session=");

    const match = cookieHeader.match(/admin_session=([^;]+)/);
    const sessionId = match ? match[1] : "";
    assertEquals(sessionId !== "", true);

    const kv = await getKv();
    const sessionEntry = await kv.get(["admin_session", sessionId]);
    assertEquals(sessionEntry.value !== null, true);

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
      headers: { "Cookie": `admin_session=${sessionId}` },
    });
    assertEquals(logoutResponse.status, 302);
    assertEquals(logoutResponse.headers.get("location"), "/admin/login");

    const deletedEntry = await kv.get(["admin_session", sessionId]);
    assertEquals(deletedEntry.value, null);
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
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertEquals(failDelete.status, 302);
  assertStringIncludes(
    failDelete.headers.get("location") ?? "",
    "/admin/words?error=",
  );

  // 2. Success delete
  const successDelete = await app.request("/admin/words/3/delete", {
    method: "POST",
    headers: { "Cookie": `admin_session=${sessionId}` },
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

Deno.test("VER-ADMIN-ROUTE: GET /admin/challenges lists synonyms, spelling, and definitions", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // Test synonyms type
  const synRes = await app.request("/admin/challenges?type=synonyms", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const synBody = await synRes.text();
  assertEquals(synRes.status, 200);
  assertStringIncludes(synBody, "Synonym Challenges");
  assertStringIncludes(synBody, "apple"); // word value for wordId 1
  assertStringIncludes(synBody, "banana"); // target synonym value for targetId 2

  // Test spelling type
  const spellRes = await app.request("/admin/challenges?type=spelling", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const spellBody = await spellRes.text();
  assertEquals(spellRes.status, 200);
  assertStringIncludes(spellBody, "Spelling Challenges");
  assertStringIncludes(spellBody, "I like to eat ___");
  assertStringIncludes(spellBody, "apple"); // correct word

  // Test definitions type
  const defRes = await app.request("/admin/challenges?type=definitions", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const defBody = await defRes.text();
  assertEquals(defRes.status, 200);
  assertStringIncludes(defBody, "Definition Challenges");
  assertStringIncludes(defBody, "A yellow fruit.");
  assertStringIncludes(defBody, "banana"); // target word
});

Deno.test("VER-ADMIN-ROUTE: GET /admin/challenges/:type/new renders edit form", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  const response = await app.request("/admin/challenges/synonyms/new", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const body = await response.text();
  assertEquals(response.status, 200);
  assertStringIncludes(body, "Add New Synonyms Challenge");
  assertStringIncludes(body, "Source Word");
  assertStringIncludes(body, "Target Synonym Word");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/challenges/:type/new validation and creation", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // 1. Missing distractor validation
  const emptyDistForm = new URLSearchParams();
  emptyDistForm.append("wordId", "1");
  emptyDistForm.append("targetId", "2");
  emptyDistForm.append("relationType", "synonym");
  emptyDistForm.append("distractors", "");

  const failRes1 = await app.request("/admin/challenges/synonyms/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: emptyDistForm.toString(),
  });
  const failBody1 = await failRes1.text();
  assertEquals(failRes1.status, 200);
  assertStringIncludes(failBody1, "At least one distractor word is required.");

  // 2. Non-existent distractor validation
  const invalidDistForm = new URLSearchParams();
  invalidDistForm.append("wordId", "1");
  invalidDistForm.append("targetId", "2");
  invalidDistForm.append("relationType", "synonym");
  invalidDistForm.append("distractors", "apple, non_existent_word");

  const failRes2 = await app.request("/admin/challenges/synonyms/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: invalidDistForm.toString(),
  });
  const failBody2 = await failRes2.text();
  assertEquals(failRes2.status, 200);
  assertStringIncludes(
    failBody2,
    "The following distractor words do not exist in the database: non_existent_word",
  );

  // 3. Successful synonym creation
  const successForm = new URLSearchParams();
  successForm.append("wordId", "1");
  successForm.append("targetId", "2");
  successForm.append("relationType", "synonym");
  successForm.append("distractors", "blarg");

  const successRes = await app.request("/admin/challenges/synonyms/new", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: successForm.toString(),
  });
  assertEquals(successRes.status, 302);
  assertStringIncludes(
    successRes.headers.get("location") ?? "",
    "/admin/challenges?type=synonyms",
  );

  // Verify creation in list
  const listRes = await app.request("/admin/challenges?type=synonyms", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  assertStringIncludes(listBody, "blarg");
});

Deno.test("VER-ADMIN-ROUTE: GET and POST /admin/challenges/:type/:id/edit prefill and update", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  // Prefill form
  const editRes = await app.request("/admin/challenges/synonyms/1/edit", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const editBody = await editRes.text();
  assertEquals(editRes.status, 200);
  assertStringIncludes(editBody, "Edit Synonyms Challenge #1");

  // Post update
  const updateForm = new URLSearchParams();
  updateForm.append("wordId", "1");
  updateForm.append("targetId", "3"); // change target synonym
  updateForm.append("relationType", "synonym");
  updateForm.append("distractors", "banana");

  const updateRes = await app.request("/admin/challenges/synonyms/1/edit", {
    method: "POST",
    headers: {
      "Cookie": `admin_session=${sessionId}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: updateForm.toString(),
  });
  assertEquals(updateRes.status, 302);

  // Check update in list
  const listRes = await app.request("/admin/challenges?type=synonyms", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  assertStringIncludes(listBody, "banana");
});

Deno.test("VER-ADMIN-ROUTE: POST /admin/challenges/:type/:id/delete deletes challenges", async () => {
  resetMockData();
  const sessionId = await createAdminSession();

  const deleteRes = await app.request("/admin/challenges/synonyms/1/delete", {
    method: "POST",
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  assertEquals(deleteRes.status, 302);
  assertStringIncludes(
    deleteRes.headers.get("location") ?? "",
    "/admin/challenges?type=synonyms&success=",
  );

  // Verify deletion
  const listRes = await app.request("/admin/challenges?type=synonyms", {
    headers: { "Cookie": `admin_session=${sessionId}` },
  });
  const listBody = await listRes.text();
  // Expecting list list body to not contain distractors or IDs we deleted
  assertEquals(listBody.includes("/admin/challenges/synonyms/1/edit"), false);
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
    "id,session_id,score,truthfulness,completed_at",
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
  assertEquals(jsonBody[0].sessionId, "session-abc-123");

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
    headers: { "Cookie": `admin_session=${sessionId}` },
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
    headers: { "Cookie": `admin_session=${sessionId}` },
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
    headers: { "Cookie": `admin_session=${sessionId}` },
    body: invalidForm,
  });
  const errBody = await errRes.text();
  assertEquals(errRes.status, 200);
  assertStringIncludes(errBody, "Word value cannot be empty");
});
