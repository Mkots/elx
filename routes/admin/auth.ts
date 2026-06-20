import type { Context, Hono } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { getKv } from "../../session.ts";
import { LoginPage } from "../../ui/pages/LoginPage.tsx";

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

/** Registers the login/logout routes on the shared admin router. */
export function registerAuthRoutes(route: Hono) {
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
}
