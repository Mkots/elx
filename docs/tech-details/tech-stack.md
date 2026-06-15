# LexTALE Project Technology Stack (Deno + SSR)

## Concept

Use Server-Side Rendering (SSR) and a Multi-Page Application (MPA) instead of a
traditional Single Page Application (SPA). Logic, scoring, and intermediate
state storage live entirely on the server. This prevents client-side score
tampering and avoids sending application logic as JavaScript to the browser.

## Infrastructure and Environment

- **Runtime:** [Deno](https://deno.com/), a secure runtime with native support
  for TypeScript, `fetch`, and Web Standards.
- **Repository structure:** one project with a straightforward directory layout
  (`db/`, `routes/`, `scoring/`, `ui/`, `scripts/`). Splitting the project into
  packages or workspaces is deferred until genuinely reusable boundaries emerge;
  it would add unnecessary complexity to the MVP.

## Backend and Core

- **Web framework:** [Hono](https://hono.dev/), a fast, minimal framework used
  for API routing and server-side page rendering.
- **State storage (sessions):** **Deno KV**, the built-in key-value database. It
  is well suited to temporary user progress, such as selected words and partial
  scores, associated with a `sessionId` cookie.

## Frontend (UI)

- **Rendering:** server-side **JSX** through Hono. The server returns complete
  HTML to the client.
- **Interaction:** traditional **HTML forms** (`<form>`). Test stages transition
  through a `POST` request followed by a server-side `HTTP 302` redirect to the
  next stage.
- **Styling:** plain CSS is added only as needed. The basic SSR scaffold does
  not use a CSS framework.
- **Client-side JavaScript:** none or minimal. Vanilla JS is used only for
  simple visual effects such as highlighting a selected card or hiding
  checkboxes.

## Database and ORM (Persistent Storage)

- **DBMS:** **PostgreSQL** stores the word bank, correct answers, test history,
  and synonym and antonym dictionaries.
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/) with the Deno `postgres`
  driver provides strongly typed SQL queries.

## Database Population (Offline Question Bank Generation)

**Core principle:** all questions, distractors, and metadata are generated and
validated **in advance by offline scripts**, then stored in PostgreSQL. At
runtime the application only performs `SELECT` queries. The user request path
never calls external APIs or ML models. This makes tests deterministic, keeps
latency low, and removes dependence on third-party service availability.

- **Seeder scripts:** standalone Deno scripts in `scripts/`, run manually with
  `deno task seed:*`. They produce validated rows in the question tables.
- **Generation data sources used only by seeders, never at runtime:**
  - [Datamuse API](https://www.datamuse.com/api/) finds synonyms, antonyms, and
    phonetically similar distractors for Stages 3-4.
  - A dictionary API, such as Free Dictionary, retrieves word definitions for
    Stage 5.
- **Validation:** before writing to the database, a seeder verifies that the
  correct answer is unambiguous and that distractors meet quality requirements.

---

## Architecture Workflow

1. **GET `/stage/:id`:** Hono loads data from Deno KV or PostgreSQL, renders the
   page to HTML with JSX, and returns it to the client.
2. **POST `/stage/:id`:** the client submits an HTML form.
3. **Processing:** Hono validates the answer on the server, calculates scores
   and penalties, and updates session state in Deno KV.
4. **Redirect:** the server returns `302 Redirect` to `/stage/:id+1`, and the
   cycle repeats.
