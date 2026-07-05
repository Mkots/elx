# Route template

This file documents the one route pattern every public route in this repo
follows: **repository -> service -> route -> page -> test**. It's not compiled —
copy the shapes below when adding a new route. (Admin routes follow the same
GET/POST/302 shape, but wire through `routes/admin/loaders/*.ts` instead of
`db/services.ts` — see `routes/admin/index.ts`.)

The worked example below adds a fictional `GET /feedback` (renders a form) and
`POST /feedback` (saves a comment, redirects with a flash message).

## 1. Repository — `db/repositories/feedback.ts`

Pure DB access. No route/HTTP concerns here — just typed functions the service
layer re-exports.

```typescript
import { db } from "../client.ts";
import { feedback } from "../schema.ts";

export async function saveFeedback(comment: string): Promise<void> {
  await db.insert(feedback).values({ comment });
}
```

## 2. Service registration — `db/services.ts`

Every repository module is re-exported under `Services` so routes never import
`db/repositories/*` or `db/client.ts` directly — they only see the `Services`
interface, which is what tests substitute a mock for.

```typescript
import * as feedbackRepo from "./repositories/feedback.ts";

export interface Services {
  // ...existing entries
  feedback: typeof feedbackRepo;
}

export const defaultServices: Services = {
  // ...existing entries
  feedback: feedbackRepo,
};
```

## 3. Page — `ui/pages/FeedbackPage.tsx`

A Hono JSX component, same as every other page in `ui/pages/`. Takes plain data
props (never a DB row type directly) and an optional flash message.

```tsx
import { Layout } from "../components/Layout.tsx";

export function FeedbackPage(props: { error?: string }) {
  return (
    <Layout title="Feedback">
      {props.error && <p class="alert-error">{props.error}</p>}
      <form method="post" action="/feedback">
        <textarea name="comment" required />
        <button type="submit">Send</button>
      </form>
    </Layout>
  );
}
```

## 4. Route — `routes/feedback.ts`

One `Hono` sub-router per feature, created by a factory that takes `Services`
for dependency injection (mirrors `routes/stage1.ts`, `routes/result.ts`). GET
renders the page; POST handles the form and 302-redirects — never renders JSON
from a form POST.

```typescript
import { Hono } from "@hono/hono";
import type { Services } from "../db/services.ts";
import { FeedbackPage } from "../ui/pages/FeedbackPage.tsx";

export function createFeedbackRoute(services: Services) {
  const route = new Hono();

  route.get("/", (context) => {
    const error = context.req.query("error") || undefined;
    return context.html(FeedbackPage({ error }));
  });

  route.post("/", async (context) => {
    const form = await context.req.formData();
    const comment = String(form.get("comment") ?? "").trim();

    if (!comment) {
      return context.redirect(
        "/feedback?error=" + encodeURIComponent("Comment is required"),
      );
    }

    await services.feedback.saveFeedback(comment);
    return context.redirect("/feedback?success=1");
  });

  return route;
}
```

Register it in `app.ts`, next to the other `app.route(...)` calls:

```typescript
app.route("/feedback", createFeedbackRoute(services));
```

## 5. Test — `tests/feedback_route_test.ts`

Build the app with `createApp(mockServices)` — never a real DB connection.
Assert on status codes, redirect locations, and rendered HTML, the same way
every other `tests/*_route_test.ts` file does.

```typescript
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import { defaultServices, type Services } from "../db/services.ts";

function makeServices(saved: string[]): Services {
  return {
    ...defaultServices,
    feedback: {
      ...defaultServices.feedback,
      saveFeedback: (comment: string) => {
        saved.push(comment);
        return Promise.resolve();
      },
    },
  };
}

Deno.test("VER-FEEDBACK-ROUTE: POST /feedback rejects an empty comment", async () => {
  const saved: string[] = [];
  const app = createApp(makeServices(saved));

  const response = await app.request("/feedback", {
    method: "POST",
    body: new URLSearchParams({ comment: "" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });

  assertEquals(response.status, 302);
  assertStringIncludes(response.headers.get("location") ?? "", "error=");
  assertEquals(saved.length, 0);
});
```

## Checklist for a new route

- [ ] Repository function(s) in `db/repositories/<name>.ts` (no HTTP concerns).
- [ ] Re-exported on `Services` in `db/services.ts`.
- [ ] Page component in `ui/pages/<Name>Page.tsx`.
- [ ] Route factory in `routes/<name>.ts`: GET renders, POST handles +
      redirects.
- [ ] Registered with `app.route(...)` in `app.ts`.
- [ ] `tests/<name>_route_test.ts` using `createApp(mockServices)` — no real DB.
- [ ] If the route touches a documented requirement, update `docs/requirements/`
      (see `CONTRIBUTING.md`).
