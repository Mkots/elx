import type { Context, Hono } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Services } from "../../db/services.ts";
import { LoginPage } from "../../ui/pages/LoginPage.tsx";

type AdminSessionStore = Services["adminSessions"];

// ---------------------------------------------------------------------------
// Env-based credentials — no fallback to "admin"/"admin"
// ---------------------------------------------------------------------------

/** Returns configured credentials, or null if env vars are absent. */
function getAdminCredentials(): { username: string; password: string } | null {
  const username = Deno.env.get("ADMIN_USERNAME");
  const password = Deno.env.get("ADMIN_PASSWORD");
  if (!username || !password) {
    console.warn(
      "WARN: ADMIN_USERNAME or ADMIN_PASSWORD not set — /admin is disabled.",
    );
    return null;
  }
  return { username, password };
}

// ---------------------------------------------------------------------------
// Constant-time string comparison (timing-safe)
// ---------------------------------------------------------------------------

/** Compares two strings in constant time to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);

  // Pad the shorter buffer to ensure same length without short-circuit.
  const len = Math.max(bufA.length, bufB.length, 1);
  const paddedA = new Uint8Array(len);
  const paddedB = new Uint8Array(len);
  paddedA.set(bufA);
  paddedB.set(bufB);

  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    diff |= paddedA[i] ^ paddedB[i];
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// In-memory rate limiter: 5 attempts / 15 min per IP
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

/** Returns true if the IP is rate-limited; records the attempt otherwise. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

/** Resets the rate-limit counter for an IP on successful login. */
function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

/** Returns the in-memory map (for testing only). */
export function _loginAttemptsForTest(): Map<string, RateLimitEntry> {
  return loginAttempts;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/** Authentication middleware — applied to all /admin routes. */
export function createAdminAuthMiddleware(store: AdminSessionStore) {
  return async function adminAuthMiddleware(
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

    const session = await store.getAdminSession(sessionId);
    if (!session) {
      deleteCookie(context, "admin_session");
      return context.redirect("/admin/login");
    }

    context.set("adminSession", session);
    await next();
  };
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

/** Registers the login/logout routes on the shared admin router. */
export function registerAuthRoutes(route: Hono, store: AdminSessionStore) {
  // GET /admin/login
  route.get("/login", async (context) => {
    const creds = getAdminCredentials();
    if (!creds) {
      return context.html(
        LoginPage({ error: "Admin panel is disabled (env vars not set)." }),
        503,
      );
    }
    const sessionId = getCookie(context, "admin_session");
    if (sessionId && await store.getAdminSession(sessionId)) {
      return context.redirect("/admin");
    }
    if (sessionId) deleteCookie(context, "admin_session");
    return context.html(LoginPage());
  });

  // POST /admin/login
  route.post("/login", async (context) => {
    const creds = getAdminCredentials();
    if (!creds) {
      return context.html(
        LoginPage({ error: "Admin panel is disabled (env vars not set)." }),
        503,
      );
    }

    // Determine client IP for rate limiting
    const ip = context.req.header("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";

    if (isRateLimited(ip)) {
      return context.html(
        LoginPage({
          error: "Too many login attempts. Please try again in 15 minutes.",
        }),
        429,
      );
    }

    const body = await context.req.parseBody();
    const usernameInput = String(body.username ?? "");
    const passwordInput = String(body.password ?? "");

    const usernameMatch = timingSafeEqual(usernameInput, creds.username);
    const passwordMatch = timingSafeEqual(passwordInput, creds.password);

    if (usernameMatch && passwordMatch) {
      resetRateLimit(ip);

      const sessionId = crypto.randomUUID();
      const now = new Date();

      await store.purgeExpired(now);
      await store.createAdminSession(
        sessionId,
        creds.username,
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
      );

      setCookie(context, "admin_session", sessionId, {
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
        secure: Deno.env.get("APP_ENV") === "production",
      });

      return context.redirect("/admin");
    }

    return context.html(LoginPage({ error: "Invalid username or password" }));
  });

  // POST /admin/logout
  route.post("/logout", async (context) => {
    const sessionId = getCookie(context, "admin_session");
    if (sessionId) {
      await store.deleteAdminSession(sessionId);
      deleteCookie(context, "admin_session");
    }
    return context.redirect("/admin/login");
  });
}
