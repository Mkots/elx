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

  return route;
}

export const adminRoute = createAdminRoute();
