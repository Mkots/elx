# ELX — Agent Guide

ELX is a web app for vocabulary size assessment based on the LexTALE
methodology.

**Stack**: Deno + Hono + JSX (SSR) + Deno KV (sessions) + PostgreSQL (data) +
Drizzle ORM.

## Commands

```bash
deno task ci          # fmt:check + lint + check + test:coverage — run before finishing any change
deno task test        # unit/route tests only
deno task dev         # dev server with --watch (needs DATABASE_URL)
deno task e2e         # Playwright e2e (needs running server + DB + seed)
deno task seed:e2e    # db:migrate + seed:words + seed:ticket (prepares DB for e2e)
deno task start:e2e   # server for e2e with KV stored in .data/
deno task db:generate # drizzle-kit generate (after editing db/schema.ts)
deno task db:migrate  # apply migrations
```

- `deno task check` type-checks an explicit file list in `deno.json` — when
  adding a new top-level directory with TS/TSX files, add it to the `check`
  task.
- e2e CI runs in the `mcr.microsoft.com/playwright:v1.61.0-noble` container with
  a PostgreSQL 17 service; env vars come from GitHub Secrets.

## Architecture principles

- **SSR-only**: HTML is rendered server-side via Hono JSX. Minimal client JS
  (HTMX for Stage 2 cards).
- **GET/POST/302**: each stage is a GET that renders the page and a POST that
  handles the form and 302-redirects to the next stage.
- **Dependency injection**: routes accept `Loader`/`Store` interfaces (e.g.
  `Stage1WordLoader`, `Stage2SessionStore`), so unit tests never touch the DB or
  KV directly. `createApp()` in `app.ts` is the composition root.
- **Server-side scoring**: the client never participates in score computation.
- **Security middleware**: `csrf()` (origin check, `APP_ORIGIN` env if the app
  sits behind a proxy) and `secureHeaders()` are applied app-wide in `app.ts`.
  `app.onError` unwraps `HTTPException` (e.g. the CSRF 403) instead of masking
  it as a generic 500.

## Test flow (ticket-driven)

```
GET  /              → home page, picks a published ticket
POST /stage/1/start → creates KV session with ticketId, redirect → /stage/1
GET  /stage/1       → word-selection form (words come from the ticket's question snapshot)
POST /stage/1       → saves selected word indexes to KV, redirect → /stage/2
GET  /stage/2       → verification cards served one-by-one via HTMX (from the ticket snapshot)
POST /stage/2       → saves an answer or the final score to KV, writes test_history
                      with ticket_id, redirect → /result
GET  /result        → shows score + truthfulness
```

Guards:

- `GET /stage/1` without sessionId or ticketId → redirect `/`
- `GET /stage/2` without sessionId or with empty wordIds → redirect `/stage/1`
- `GET /result` without sessionId → redirect `/stage/1`
- `GET /result` with sessionId but no stage2Result → redirect `/stage/2`

## Admin panel (`/admin`)

- Cookie-based auth (`admin_session` in KV); credentials come from
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` with no default — the admin panel is
  disabled (503) if either is unset. Login is timing-safe and rate-limited (5
  attempts / 15 min per IP).
- `routes/admin/index.ts` is the composition root: each concern (auth,
  dashboard, words, review, tickets, ticket config, history) registers its
  handlers on one shared Hono router behind `adminAuthMiddleware`.
- Each concern has a DI loader interface in `routes/admin/loaders/` with a
  `databaseAdmin*Loader` production implementation.
- Ticket lifecycle: `draft → base → complete → published`. Only published
  tickets are served to test takers. A ticket stores a frozen JSONB snapshot of
  its questions (`SnapshotQuestion[]` in `db/schema.ts`), so later word edits
  don't affect existing tickets.
- `generateBaseTicket` (`db/repositories/tickets.ts`) fetches the active config
  and the whole word pool in one query each, then delegates selection to the
  pure `buildQuestions()` in `domain/ticket_generation.ts`. It's greedy (pseudo
  words first per difficulty, since they're scarcer than real words; real-word
  picks favor synonym/definition-rich words) and throws a specific error instead
  of retrying when the pool can't satisfy the config.
- `publishTicket` guardrails live in the pure `validateForPublish()` in
  `domain/ticket_publish.ts`, which returns every problem across every challenge
  question at once (not just the first one). `GET /` never writes to the DB —
  `routes/home.ts` shows an empty state when there are no published tickets
  instead of auto-generating one; `deno task seed:e2e` seeds and publishes a
  ticket for e2e via `scripts/seed_ticket.ts`.

## File map

```
app.ts                — createApp() with DI options for all routes; csrf(),
                        secureHeaders(), HTML/JSON 404 split
main.ts               — entry point, starts the server
session.ts            — Deno KV helpers: getSessionId, setSessionCookie,
                        saveWordSelection, saveStage2Result, ticket id, etc.
routes/
  home.ts, stage1.ts, stage2.ts, result.ts   — public test flow
  test_session.ts     — requireTestSession(): shared cookie → session →
                        ticket → redirect preamble for stage1/stage2/result
  health.ts, logger.ts, seed_verification.ts
  admin/              — admin panel (see above); loaders/ for DI interfaces
scoring/lextale.ts    — computeScore(WordAnswer[]) → { score, truthfulness }
domain/
  ticket_generation.ts — pure buildQuestions(config, wordPool, random); no DB
  ticket_publish.ts    — pure validateForPublish(ticket) -> problems[]; no DB
ui/
  components/         — Layout, AdminLayout, WordGrid
  pages/              — one TSX page per screen (public + Admin*); NotFoundPage
                        for the non-/health HTML 404
db/
  schema.ts           — words, tickets (JSONB question snapshots),
                        test_history, ticket_configs; SnapshotQuestion types
  client.ts           — createDatabase() → { client, db }
  migrations/         — drizzle-kit output
scripts/              — seed_words, import_words, clean, enrich, build_wiki
tests/                — *_test.ts unit/route tests; e2e/ Playwright specs
docs/                 — business process, data model, requirements, roadmap
```

## Sessions (PostgreSQL)

| Table            | Columns / Value                                      | Purpose                                |
| ---------------- | ---------------------------------------------------- | -------------------------------------- |
| `test_sessions`  | `id`, `ticket_id`, `stage1_selection`, result fields | Test session state and final aggregate |
| `test_answers`   | `session_id`, `question_index`, `stage`, `answer`    | Per-item answer state                  |
| `admin_sessions` | `id`, `username`, `expires_at`                       | Admin auth sessions                    |

## Scoring (`scoring/lextale.ts`)

- **score** = (words with `isReal=true` marked Know) − (words with
  `isReal=false` marked Know)
- **truthfulness** = `round(knownReal / totalKnown * 100)`, or 100 when nothing
  is marked Know

## Environment variables

`DATABASE_URL`, `PORT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_ENV` (set to
`production` to add `Secure` to session/admin cookies), `APP_ORIGIN` (optional;
restricts CSRF's allowed origin behind a proxy); wiki sync uses
`WIKI_SOURCE_REPO_URL` / `WIKI_SOURCE_REVISION`.

## Token & Context Optimization Rules

### Investigation scope

- Never read the entire repository unless the task explicitly requires it.
- Start by discovering the project structure before opening files.
- Use search to identify candidate files before reading them.
- Read only the files required for the current task.
- Expand investigation incrementally instead of loading broad context up front.
- Reuse knowledge gathered earlier in the task instead of reopening the same
  files.

### Initial budget

- Keep the initial investigation to roughly 10–15 files and no more than 3
  directories.
- If that first pass is insufficient, justify the next files or directories and
  extend the search in small steps.
- For research tasks, first produce a short investigation plan and identify the
  minimum file set needed to answer the question.

### Preferred sources

- Prefer repository summaries, this guide, and focused documentation over
  rereading source files when they already answer the question.
- Only read `docs/` files that are directly relevant to the task. Do not
  speculate through the full documentation tree.
- Encourage recording durable findings in repository docs (for example,
  `docs/ai/`) so future agents can avoid repeating the same analysis.

### Content to avoid by default

- Ignore generated files, build artifacts, dependency trees, snapshots, caches,
  and vendored content unless the task specifically depends on them.
- Do NOT read large CSV, TSV, or JSON files wholesale. For data under
  `pipeline/data/`, `pipeline/testdata/`, or similar large inputs, inspect only
  targeted samples with commands such as `head`, `tail`, or `jq`.

### Task-specific priorities

- For CI or build failures, inspect workflow definitions, build configuration,
  package manifests, and test configuration before reading application code.
- Prefer configuration-level optimizations over code changes when they can solve
  the problem safely.
- When proposing optimizations, estimate expected impact, explain trade-offs,
  and give concrete implementation suggestions.

### Execution hygiene

- Use subagent sandboxing for non-trivial implementation work to keep logs,
  tests, and intermediate exploration out of the main context window.
- Run targeted tests during debugging instead of repeatedly loading full-suite
  output into the main conversation.

## Gotchas

- `GET /stage/2` with empty wordIds redirects to `/stage/1`, not `/stage/2` —
  e2e tests must select at least one word before submitting Stage 1.
- `Stage2Page` uses radio buttons (not checkboxes) with "Know" checked by
  default. Form fields: `name="word_<id>" value="know|dont_know"`.
- `data-testid="score"` and `data-testid="truthfulness"` in `ResultPage.tsx` are
  relied on by e2e tests.
- The lockfile is frozen (`"lock": { "frozen": true }` in `deno.json`) —
  dependency changes require deliberately regenerating `deno.lock`.
- Synonyms/antonyms/definitions live as columns on `words` (not separate
  tables); question content served to users comes from the ticket's JSONB
  snapshot, not live word rows.
