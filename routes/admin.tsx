import { type Context, Hono } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import {
  definitions,
  spellingChallenges,
  synonyms,
  testHistory,
  words,
} from "../db/schema.ts";
import { LoginPage } from "../ui/pages/LoginPage.tsx";
import {
  AdminDashboardPage,
  type TestRun,
} from "../ui/pages/AdminDashboardPage.tsx";
import { AdminWordsPage } from "../ui/pages/AdminWordsPage.tsx";
import { AdminWordEditPage } from "../ui/pages/AdminWordEditPage.tsx";
import { AdminChallengesPage } from "../ui/pages/AdminChallengesPage.tsx";
import { AdminChallengeEditPage } from "../ui/pages/AdminChallengeEditPage.tsx";
import { getKv } from "../session.ts";

export interface AdminDashboardLoader {
  getDashboardStats(): Promise<{
    totalRuns: number;
    avgScore: number;
    avgTruthfulness: number;
    recentRuns: TestRun[];
  }>;
}

export const databaseAdminDashboardLoader: AdminDashboardLoader = {
  async getDashboardStats() {
    const { client, db } = createDatabase();
    try {
      const stats = await db
        .select({
          totalRuns: sql<number>`count(${testHistory.id})::integer`,
          avgScore: sql<
            number
          >`coalesce(avg(${testHistory.score}), 0)::numeric`,
          avgTruthfulness: sql<
            number
          >`coalesce(avg(${testHistory.truthfulness}), 0)::numeric`,
        })
        .from(testHistory);

      const totalRuns = stats[0]?.totalRuns ?? 0;
      const avgScore = Math.round(Number(stats[0]?.avgScore ?? 0) * 10) / 10;
      const avgTruthfulness =
        Math.round(Number(stats[0]?.avgTruthfulness ?? 0) * 10) / 10;

      const recentRuns = await db
        .select()
        .from(testHistory)
        .orderBy(desc(testHistory.completedAt))
        .limit(10);

      return {
        totalRuns,
        avgScore,
        avgTruthfulness,
        recentRuns,
      };
    } finally {
      await client.end();
    }
  },
};

export interface AdminWordsLoader {
  listWords(params: {
    search?: string;
    difficulty?: number;
    isReal?: boolean;
    page: number;
    limit: number;
  }): Promise<{ words: (typeof words.$inferSelect)[]; totalCount: number }>;

  getWord(id: number): Promise<typeof words.$inferSelect | null>;
  createWord(data: {
    value: string;
    isReal: boolean;
    difficulty: number;
  }): Promise<void>;
  updateWord(
    id: number,
    data: { value: string; isReal: boolean; difficulty: number },
  ): Promise<void>;
  deleteWord(id: number): Promise<{ success: boolean; error?: string }>;
}

export const databaseAdminWordsLoader: AdminWordsLoader = {
  async listWords({ search, difficulty, isReal, page, limit }) {
    const { client, db } = createDatabase();
    try {
      // deno-lint-ignore no-explicit-any
      const conditions: any[] = [];
      if (search) {
        conditions.push(ilike(words.value, `%${search}%`));
      }
      if (difficulty !== undefined) {
        conditions.push(eq(words.difficulty, difficulty));
      }
      if (isReal !== undefined) {
        conditions.push(eq(words.isReal, isReal));
      }

      const whereClause = conditions.length > 0
        ? and(...conditions)
        : undefined;
      const offset = (page - 1) * limit;

      const totalCountResult = await db
        .select({ count: sql<number>`count(${words.id})::integer` })
        .from(words)
        .where(whereClause);
      const totalCount = totalCountResult[0]?.count ?? 0;

      const result = await db
        .select()
        .from(words)
        .where(whereClause)
        .orderBy(words.id)
        .limit(limit)
        .offset(offset);

      return { words: result, totalCount };
    } finally {
      await client.end();
    }
  },

  async getWord(id) {
    const { client, db } = createDatabase();
    try {
      const result = await db
        .select()
        .from(words)
        .where(eq(words.id, id))
        .limit(1);
      return result[0] ?? null;
    } finally {
      await client.end();
    }
  },

  async createWord({ value, isReal, difficulty }) {
    const { client, db } = createDatabase();
    try {
      await db.insert(words).values({ value, isReal, difficulty });
    } finally {
      await client.end();
    }
  },

  async updateWord(id, { value, isReal, difficulty }) {
    const { client, db } = createDatabase();
    try {
      await db
        .update(words)
        .set({ value, isReal, difficulty })
        .where(eq(words.id, id));
    } finally {
      await client.end();
    }
  },

  async deleteWord(id) {
    const { client, db } = createDatabase();
    try {
      // Reference checks to prevent foreign key errors:
      const synCount = await db
        .select({ count: sql<number>`count(${synonyms.id})::integer` })
        .from(synonyms)
        .where(or(eq(synonyms.wordId, id), eq(synonyms.targetId, id)));
      if ((synCount[0]?.count ?? 0) > 0) {
        return { success: false, error: "Word is referenced in synonyms." };
      }

      const spellCount = await db
        .select({
          count: sql<number>`count(${spellingChallenges.id})::integer`,
        })
        .from(spellingChallenges)
        .where(eq(spellingChallenges.correctWordId, id));
      if ((spellCount[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced in spelling challenges.",
        };
      }

      const defCount = await db
        .select({ count: sql<number>`count(${definitions.id})::integer` })
        .from(definitions)
        .where(eq(definitions.wordId, id));
      if ((defCount[0]?.count ?? 0) > 0) {
        return { success: false, error: "Word is referenced in definitions." };
      }

      // Distractor checking (integer arrays):
      const synDistractors = await db
        .select({ count: sql<number>`count(${synonyms.id})::integer` })
        .from(synonyms)
        .where(sql`${id} = any(${synonyms.distractors})`);
      if ((synDistractors[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced as a distractor in synonyms.",
        };
      }

      const spellDistractors = await db
        .select({
          count: sql<number>`count(${spellingChallenges.id})::integer`,
        })
        .from(spellingChallenges)
        .where(sql`${id} = any(${spellingChallenges.distractors})`);
      if ((spellDistractors[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced as a distractor in spelling challenges.",
        };
      }

      const defDistractors = await db
        .select({ count: sql<number>`count(${definitions.id})::integer` })
        .from(definitions)
        .where(sql`${id} = any(${definitions.distractors})`);
      if ((defDistractors[0]?.count ?? 0) > 0) {
        return {
          success: false,
          error: "Word is referenced as a distractor in definitions.",
        };
      }

      await db.delete(words).where(eq(words.id, id));
      return { success: true };
    } finally {
      await client.end();
    }
  },
};

export interface AdminChallengesLoader {
  listSynonyms(): Promise<(typeof synonyms.$inferSelect)[]>;
  listSpelling(): Promise<(typeof spellingChallenges.$inferSelect)[]>;
  listDefinitions(): Promise<(typeof definitions.$inferSelect)[]>;

  getSynonym(id: number): Promise<typeof synonyms.$inferSelect | null>;
  getSpelling(
    id: number,
  ): Promise<typeof spellingChallenges.$inferSelect | null>;
  getDefinition(id: number): Promise<typeof definitions.$inferSelect | null>;

  createSynonym(data: {
    wordId: number;
    targetId: number;
    relationType: string;
    distractors: number[];
  }): Promise<void>;
  createSpelling(data: {
    contextSentence: string;
    correctWordId: number;
    distractors: number[];
  }): Promise<void>;
  createDefinition(data: {
    wordId: number;
    definitionText: string;
    distractors: number[];
  }): Promise<void>;

  updateSynonym(
    id: number,
    data: {
      wordId: number;
      targetId: number;
      relationType: string;
      distractors: number[];
    },
  ): Promise<void>;
  updateSpelling(
    id: number,
    data: {
      contextSentence: string;
      correctWordId: number;
      distractors: number[];
    },
  ): Promise<void>;
  updateDefinition(
    id: number,
    data: {
      wordId: number;
      definitionText: string;
      distractors: number[];
    },
  ): Promise<void>;

  deleteSynonym(id: number): Promise<void>;
  deleteSpelling(id: number): Promise<void>;
  deleteDefinition(id: number): Promise<void>;

  getAllWords(): Promise<{ id: number; value: string }[]>;
}

export const databaseAdminChallengesLoader: AdminChallengesLoader = {
  async listSynonyms() {
    const { client, db } = createDatabase();
    try {
      return await db.select().from(synonyms).orderBy(synonyms.id);
    } finally {
      await client.end();
    }
  },
  async listSpelling() {
    const { client, db } = createDatabase();
    try {
      return await db.select().from(spellingChallenges).orderBy(
        spellingChallenges.id,
      );
    } finally {
      await client.end();
    }
  },
  async listDefinitions() {
    const { client, db } = createDatabase();
    try {
      return await db.select().from(definitions).orderBy(definitions.id);
    } finally {
      await client.end();
    }
  },

  async getSynonym(id) {
    const { client, db } = createDatabase();
    try {
      const result = await db.select().from(synonyms).where(eq(synonyms.id, id))
        .limit(1);
      return result[0] ?? null;
    } finally {
      await client.end();
    }
  },
  async getSpelling(id) {
    const { client, db } = createDatabase();
    try {
      const result = await db.select().from(spellingChallenges).where(
        eq(spellingChallenges.id, id),
      ).limit(1);
      return result[0] ?? null;
    } finally {
      await client.end();
    }
  },
  async getDefinition(id) {
    const { client, db } = createDatabase();
    try {
      const result = await db.select().from(definitions).where(
        eq(definitions.id, id),
      ).limit(1);
      return result[0] ?? null;
    } finally {
      await client.end();
    }
  },

  async createSynonym(data) {
    const { client, db } = createDatabase();
    try {
      await db.insert(synonyms).values(data);
    } finally {
      await client.end();
    }
  },
  async createSpelling(data) {
    const { client, db } = createDatabase();
    try {
      await db.insert(spellingChallenges).values(data);
    } finally {
      await client.end();
    }
  },
  async createDefinition(data) {
    const { client, db } = createDatabase();
    try {
      await db.insert(definitions).values(data);
    } finally {
      await client.end();
    }
  },

  async updateSynonym(id, data) {
    const { client, db } = createDatabase();
    try {
      await db.update(synonyms).set(data).where(eq(synonyms.id, id));
    } finally {
      await client.end();
    }
  },
  async updateSpelling(id, data) {
    const { client, db } = createDatabase();
    try {
      await db.update(spellingChallenges).set(data).where(
        eq(spellingChallenges.id, id),
      );
    } finally {
      await client.end();
    }
  },
  async updateDefinition(id, data) {
    const { client, db } = createDatabase();
    try {
      await db.update(definitions).set(data).where(eq(definitions.id, id));
    } finally {
      await client.end();
    }
  },

  async deleteSynonym(id) {
    const { client, db } = createDatabase();
    try {
      await db.delete(synonyms).where(eq(synonyms.id, id));
    } finally {
      await client.end();
    }
  },
  async deleteSpelling(id) {
    const { client, db } = createDatabase();
    try {
      await db.delete(spellingChallenges).where(eq(spellingChallenges.id, id));
    } finally {
      await client.end();
    }
  },
  async deleteDefinition(id) {
    const { client, db } = createDatabase();
    try {
      await db.delete(definitions).where(eq(definitions.id, id));
    } finally {
      await client.end();
    }
  },

  async getAllWords() {
    const { client, db } = createDatabase();
    try {
      return await db.select({ id: words.id, value: words.value }).from(words)
        .orderBy(words.value);
    } finally {
      await client.end();
    }
  },
};

// Helper to check credentials from env
function getAdminCredentials() {
  const username = Deno.env.get("ADMIN_USERNAME") || "admin";
  const password = Deno.env.get("ADMIN_PASSWORD") || "admin";
  return { username, password };
}

// Authentication middleware
export async function adminAuthMiddleware(
  context: Context,
  next: () => Promise<void>,
) {
  const path = context.req.path;
  // Exclude login endpoint from auth check
  if (path === "/admin/login") {
    return await next();
  }

  const sessionId = getCookie(context, "admin_session");
  if (!sessionId) {
    return context.redirect("/admin/login");
  }

  const kv = await getKv();
  const sessionEntry = await kv.get(["admin_session", sessionId]);
  if (!sessionEntry.value) {
    // Session expired or invalid
    deleteCookie(context, "admin_session");
    return context.redirect("/admin/login");
  }

  // Session is valid
  context.set("adminSession", sessionEntry.value);
  await next();
}

export function createAdminRoute(
  dashboardLoader: AdminDashboardLoader = databaseAdminDashboardLoader,
  wordsLoader: AdminWordsLoader = databaseAdminWordsLoader,
  challengesLoader: AdminChallengesLoader = databaseAdminChallengesLoader,
) {
  const route = new Hono();

  // Apply middleware to all /admin routes
  route.use("*", adminAuthMiddleware);

  // GET /admin/login
  route.get("/login", (context) => {
    const sessionId = getCookie(context, "admin_session");
    if (sessionId) {
      return context.redirect("/admin");
    }
    return context.html(LoginPage());
  });

  // POST /admin/login
  route.post("/login", async (context) => {
    const body = await context.req.parseBody();
    const usernameInput = body.username;
    const passwordInput = body.password;

    const { username, password } = getAdminCredentials();

    if (usernameInput === username && passwordInput === password) {
      const sessionId = crypto.randomUUID();
      const kv = await getKv();

      // Store session in Deno KV (24 hours expiry)
      await kv.set(["admin_session", sessionId], { username }, {
        expireIn: 24 * 60 * 60 * 1000,
      });

      // Set secure cookie
      setCookie(context, "admin_session", sessionId, {
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
      });

      return context.redirect("/admin");
    }

    return context.html(LoginPage({ error: "Invalid username or password" }));
  });

  // POST /admin/logout
  route.post("/logout", async (context) => {
    const sessionId = getCookie(context, "admin_session");
    if (sessionId) {
      const kv = await getKv();
      await kv.delete(["admin_session", sessionId]);
      deleteCookie(context, "admin_session");
    }
    return context.redirect("/admin/login");
  });

  // GET /admin (Dashboard)
  route.get("/", async (context) => {
    const stats = await dashboardLoader.getDashboardStats();
    return context.html(AdminDashboardPage(stats));
  });

  // GET /admin/words
  route.get("/words", async (context) => {
    const page = Number(context.req.query("page") || 1);
    const search = context.req.query("q") || "";
    const difficultyStr = context.req.query("difficulty");
    const isRealStr = context.req.query("isReal");

    const difficulty = difficultyStr ? Number(difficultyStr) : undefined;
    const isReal = isRealStr === "true"
      ? true
      : isRealStr === "false"
      ? false
      : undefined;

    const limit = 20;
    const { words: wordList, totalCount } = await wordsLoader.listWords({
      search,
      difficulty,
      isReal,
      page,
      limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    return context.html(
      AdminWordsPage({
        words: wordList,
        totalCount,
        page,
        totalPages,
        search,
        difficulty,
        isReal,
        success: successMsg,
        error: errorMsg,
      }),
    );
  });

  // GET /admin/words/new
  route.get("/words/new", (context) => {
    return context.html(AdminWordEditPage({}));
  });

  // POST /admin/words/new
  route.post("/words/new", async (context) => {
    const body = await context.req.parseBody();
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const difficulty = Number(body.difficulty);
    const isReal = body.isReal === "true";

    if (!value) {
      return context.html(
        AdminWordEditPage({ error: "Word value is required." }),
      );
    }
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return context.html(
        AdminWordEditPage({ error: "Difficulty must be between 1 and 5." }),
      );
    }

    try {
      await wordsLoader.createWord({ value, isReal, difficulty });
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent(`Word "${value}" was successfully created.`),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        return context.html(
          AdminWordEditPage({ error: `The word "${value}" already exists.` }),
        );
      }
      return context.html(
        AdminWordEditPage({ error: "Failed to create word: " + errMsg }),
      );
    }
  });

  // GET /admin/words/:id/edit
  route.get("/words/:id/edit", async (context) => {
    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }
    const word = await wordsLoader.getWord(id);
    if (!word) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Word not found."),
      );
    }
    return context.html(AdminWordEditPage({ word }));
  });

  // POST /admin/words/:id/edit
  route.post("/words/:id/edit", async (context) => {
    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }

    const word = await wordsLoader.getWord(id);
    if (!word) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Word not found."),
      );
    }

    const body = await context.req.parseBody();
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const difficulty = Number(body.difficulty);
    const isReal = body.isReal === "true";

    if (!value) {
      return context.html(
        AdminWordEditPage({
          word: { id, value, isReal, difficulty },
          error: "Word value is required.",
        }),
      );
    }
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return context.html(
        AdminWordEditPage({
          word: { id, value, isReal, difficulty },
          error: "Difficulty must be between 1 and 5.",
        }),
      );
    }

    try {
      await wordsLoader.updateWord(id, { value, isReal, difficulty });
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent(`Word "${value}" was successfully updated.`),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        return context.html(
          AdminWordEditPage({
            word: { id, value, isReal, difficulty },
            error: `The word "${value}" already exists.`,
          }),
        );
      }
      return context.html(
        AdminWordEditPage({
          word: { id, value, isReal, difficulty },
          error: "Failed to update word: " + errMsg,
        }),
      );
    }
  });

  // POST /admin/words/:id/delete
  route.post("/words/:id/delete", async (context) => {
    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        "/admin/words?error=" + encodeURIComponent("Invalid word ID."),
      );
    }

    const res = await wordsLoader.deleteWord(id);
    if (res.success) {
      return context.redirect(
        "/admin/words?success=" +
          encodeURIComponent("Word successfully deleted."),
      );
    } else {
      return context.redirect(
        "/admin/words?error=" +
          encodeURIComponent(res.error || "Failed to delete word."),
      );
    }
  });

  // GET /admin/challenges
  route.get("/challenges", async (context) => {
    const type = (context.req.query("type") || "synonyms") as
      | "synonyms"
      | "spelling"
      | "definitions";
    if (!["synonyms", "spelling", "definitions"].includes(type)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    try {
      const synonymsList = await challengesLoader.listSynonyms();
      const spellingList = await challengesLoader.listSpelling();
      const definitionsList = await challengesLoader.listDefinitions();
      const allWords = await challengesLoader.getAllWords();

      const wordsMap: Record<number, string> = {};
      for (const w of allWords) {
        wordsMap[w.id] = w.value;
      }

      return context.html(
        AdminChallengesPage({
          type,
          synonyms: synonymsList,
          spelling: spellingList,
          definitions: definitionsList,
          wordsMap,
          success: successMsg,
          error: errorMsg,
        }),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminChallengesPage({
          type,
          synonyms: [],
          spelling: [],
          definitions: [],
          wordsMap: {},
          error: "Failed to load challenges: " + errMsg,
        }),
      );
    }
  });

  // GET /admin/challenges/:challengeType/new
  route.get("/challenges/:challengeType/new", async (context) => {
    const challengeType = context.req.param("challengeType") as
      | "synonyms"
      | "spelling"
      | "definitions";
    if (!["synonyms", "spelling", "definitions"].includes(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const allWords = await challengesLoader.getAllWords();
    return context.html(
      AdminChallengeEditPage({
        challengeType,
        words: allWords,
      }),
    );
  });

  // POST /admin/challenges/:challengeType/new
  route.post("/challenges/:challengeType/new", async (context) => {
    const challengeType = context.req.param("challengeType") as
      | "synonyms"
      | "spelling"
      | "definitions";
    if (!["synonyms", "spelling", "definitions"].includes(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const body = await context.req.parseBody();
    const distractorsInput = typeof body.distractors === "string"
      ? body.distractors
      : "";

    const allWords = await challengesLoader.getAllWords();
    const wordMapByValue: Record<string, number> = {};
    for (const w of allWords) {
      wordMapByValue[w.value.toLowerCase()] = w.id;
    }

    // Common parse & validation for distractors
    const distractorWords = distractorsInput
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (distractorWords.length === 0) {
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: body,
          distractorsString: distractorsInput,
          error: "At least one distractor word is required.",
        }),
      );
    }

    const missingWords: string[] = [];
    const distractorIds: number[] = [];
    for (const w of distractorWords) {
      const id = wordMapByValue[w.toLowerCase()];
      if (id === undefined) {
        missingWords.push(w);
      } else {
        distractorIds.push(id);
      }
    }

    if (missingWords.length > 0) {
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: body,
          distractorsString: distractorsInput,
          error:
            `The following distractor words do not exist in the database: ${
              missingWords.join(", ")
            }`,
        }),
      );
    }

    try {
      if (challengeType === "synonyms") {
        const wordId = Number(body.wordId);
        const targetId = Number(body.targetId);
        const relationType = typeof body.relationType === "string"
          ? body.relationType.trim()
          : "synonym";

        if (isNaN(wordId) || isNaN(targetId)) {
          throw new Error("Source and target words are required.");
        }

        await challengesLoader.createSynonym({
          wordId,
          targetId,
          relationType,
          distractors: distractorIds,
        });
      } else if (challengeType === "spelling") {
        const contextSentence = typeof body.contextSentence === "string"
          ? body.contextSentence.trim()
          : "";
        const correctWordId = Number(body.correctWordId);

        if (!contextSentence) {
          throw new Error("Context sentence is required.");
        }
        if (!contextSentence.includes("___")) {
          throw new Error(
            "Context sentence must contain `___` for the blank gap.",
          );
        }
        if (isNaN(correctWordId)) {
          throw new Error("Correct answer word is required.");
        }

        await challengesLoader.createSpelling({
          contextSentence,
          correctWordId,
          distractors: distractorIds,
        });
      } else if (challengeType === "definitions") {
        const wordId = Number(body.wordId);
        const definitionText = typeof body.definitionText === "string"
          ? body.definitionText.trim()
          : "";

        if (isNaN(wordId)) {
          throw new Error("Target word is required.");
        }
        if (!definitionText) {
          throw new Error("Definition text is required.");
        }

        await challengesLoader.createDefinition({
          wordId,
          definitionText,
          distractors: distractorIds,
        });
      }

      return context.redirect(
        `/admin/challenges?type=${challengeType}&success=` +
          encodeURIComponent("Challenge was successfully created."),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: body,
          distractorsString: distractorsInput,
          error: "Failed to create challenge: " + errMsg,
        }),
      );
    }
  });

  // GET /admin/challenges/:challengeType/:id/edit
  route.get("/challenges/:challengeType/:id/edit", async (context) => {
    const challengeType = context.req.param("challengeType") as
      | "synonyms"
      | "spelling"
      | "definitions";
    if (!["synonyms", "spelling", "definitions"].includes(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Invalid ID."),
      );
    }

    const allWords = await challengesLoader.getAllWords();
    const wordsMap: Record<number, string> = {};
    for (const w of allWords) {
      wordsMap[w.id] = w.value;
    }

    let challenge;
    if (challengeType === "synonyms") {
      challenge = await challengesLoader.getSynonym(id);
    } else if (challengeType === "spelling") {
      challenge = await challengesLoader.getSpelling(id);
    } else {
      challenge = await challengesLoader.getDefinition(id);
    }

    if (!challenge) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Challenge not found."),
      );
    }

    const distractorsString = challenge.distractors.map((id: number) =>
      wordsMap[id] || `#${id}`
    ).join(", ");

    return context.html(
      AdminChallengeEditPage({
        challengeType,
        challenge,
        words: allWords,
        distractorsString,
      }),
    );
  });

  // POST /admin/challenges/:challengeType/:id/edit
  route.post("/challenges/:challengeType/:id/edit", async (context) => {
    const challengeType = context.req.param("challengeType") as
      | "synonyms"
      | "spelling"
      | "definitions";
    if (!["synonyms", "spelling", "definitions"].includes(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Invalid ID."),
      );
    }

    let challenge;
    if (challengeType === "synonyms") {
      challenge = await challengesLoader.getSynonym(id);
    } else if (challengeType === "spelling") {
      challenge = await challengesLoader.getSpelling(id);
    } else {
      challenge = await challengesLoader.getDefinition(id);
    }

    if (!challenge) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Challenge not found."),
      );
    }

    const body = await context.req.parseBody();
    const distractorsInput = typeof body.distractors === "string"
      ? body.distractors
      : "";

    const allWords = await challengesLoader.getAllWords();
    const wordMapByValue: Record<string, number> = {};
    for (const w of allWords) {
      wordMapByValue[w.value.toLowerCase()] = w.id;
    }

    // Common parse & validation for distractors
    const distractorWords = distractorsInput
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (distractorWords.length === 0) {
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: { id, ...body },
          distractorsString: distractorsInput,
          error: "At least one distractor word is required.",
        }),
      );
    }

    const missingWords: string[] = [];
    const distractorIds: number[] = [];
    for (const w of distractorWords) {
      const id = wordMapByValue[w.toLowerCase()];
      if (id === undefined) {
        missingWords.push(w);
      } else {
        distractorIds.push(id);
      }
    }

    if (missingWords.length > 0) {
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: { id, ...body },
          distractorsString: distractorsInput,
          error:
            `The following distractor words do not exist in the database: ${
              missingWords.join(", ")
            }`,
        }),
      );
    }

    try {
      if (challengeType === "synonyms") {
        const wordId = Number(body.wordId);
        const targetId = Number(body.targetId);
        const relationType = typeof body.relationType === "string"
          ? body.relationType.trim()
          : "synonym";

        if (isNaN(wordId) || isNaN(targetId)) {
          throw new Error("Source and target words are required.");
        }

        await challengesLoader.updateSynonym(id, {
          wordId,
          targetId,
          relationType,
          distractors: distractorIds,
        });
      } else if (challengeType === "spelling") {
        const contextSentence = typeof body.contextSentence === "string"
          ? body.contextSentence.trim()
          : "";
        const correctWordId = Number(body.correctWordId);

        if (!contextSentence) {
          throw new Error("Context sentence is required.");
        }
        if (!contextSentence.includes("___")) {
          throw new Error(
            "Context sentence must contain `___` for the blank gap.",
          );
        }
        if (isNaN(correctWordId)) {
          throw new Error("Correct answer word is required.");
        }

        await challengesLoader.updateSpelling(id, {
          contextSentence,
          correctWordId,
          distractors: distractorIds,
        });
      } else if (challengeType === "definitions") {
        const wordId = Number(body.wordId);
        const definitionText = typeof body.definitionText === "string"
          ? body.definitionText.trim()
          : "";

        if (isNaN(wordId)) {
          throw new Error("Target word is required.");
        }
        if (!definitionText) {
          throw new Error("Definition text is required.");
        }

        await challengesLoader.updateDefinition(id, {
          wordId,
          definitionText,
          distractors: distractorIds,
        });
      }

      return context.redirect(
        `/admin/challenges?type=${challengeType}&success=` +
          encodeURIComponent("Challenge was successfully updated."),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminChallengeEditPage({
          challengeType,
          words: allWords,
          challenge: { id, ...body },
          distractorsString: distractorsInput,
          error: "Failed to update challenge: " + errMsg,
        }),
      );
    }
  });

  // POST /admin/challenges/:challengeType/:id/delete
  route.post("/challenges/:challengeType/:id/delete", async (context) => {
    const challengeType = context.req.param("challengeType") as
      | "synonyms"
      | "spelling"
      | "definitions";
    if (!["synonyms", "spelling", "definitions"].includes(challengeType)) {
      return context.redirect("/admin/challenges?type=synonyms");
    }

    const id = Number(context.req.param("id"));
    if (isNaN(id)) {
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Invalid ID."),
      );
    }

    try {
      if (challengeType === "synonyms") {
        await challengesLoader.deleteSynonym(id);
      } else if (challengeType === "spelling") {
        await challengesLoader.deleteSpelling(id);
      } else {
        await challengesLoader.deleteDefinition(id);
      }
      return context.redirect(
        `/admin/challenges?type=${challengeType}&success=` +
          encodeURIComponent("Challenge was successfully deleted."),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.redirect(
        `/admin/challenges?type=${challengeType}&error=` +
          encodeURIComponent("Failed to delete challenge: " + errMsg),
      );
    }
  });

  return route;
}

export const adminRoute = createAdminRoute();
