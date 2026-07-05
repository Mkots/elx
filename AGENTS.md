# ELX — Agent Guide

ELX is a web app for vocabulary size assessment based on the LexTALE
methodology.

**Stack**: Deno + Hono + JSX (SSR) + Deno KV (sessions) + PostgreSQL (data) +
Drizzle ORM.

## Commands

```bash
deno task ci          # fmt:check + lint + check + test:coverage — run before finishing any change
deno task test        # unit/route tests only
deno task test:lint-rules # run unit tests for custom lint rules
deno task dev         # dev server with --watch (needs DATABASE_URL)
deno task e2e         # Playwright e2e (needs running server + DB + seed)
deno task seed:e2e    # db:migrate + seed:words + seed:ticket (prepares DB for e2e)
deno task start:e2e   # server for e2e with KV stored in .data/
deno task db:generate # drizzle-kit generate (after editing db/schema.ts)
deno task db:migrate  # apply migrations
```

## Commands not available in the Copilot container

The following commands require infrastructure that is **not present** in the
Copilot coding-agent environment and must **not** be run there:

- `deno task e2e` — requires Playwright browsers and a live PostgreSQL service.
  E2E tests run in a dedicated CI job (`e2e.yaml`) with the
  `ghcr.io/vitalijkomarov/elx-playwright:v1.61.0` container and a PostgreSQL 17
  service. Do not attempt to install Playwright or its browsers inside the
  agent.
- `sara` / `sara check` — the SARA CLI (requirements traceability) is not
  installed in the agent. Requirements validation runs in its own CI job
  (`requirements.yaml`) using a Rust container. Do not attempt to install or
  invoke `sara` inside the agent.

- `deno task check` runs `deno check .`; directories are excluded via the
  top-level `exclude` list in `deno.json`.
- e2e CI runs in the `ghcr.io/vitalijkomarov/elx-playwright:v1.61.0` container
  with a PostgreSQL 17 service; env vars come from GitHub Secrets.
- Local dev DB: `docker compose -f compose.dev.yaml up -d postgres`, then
  `deno task --env-file=.env dev` (see CONTRIBUTING.md for recipes).
- Pre-commit/pre-push hooks (fmt, lint, check, test) run via `hk` (`hk.pkl`).

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
tools/                — custom lint rules and helper scripts
tests/                — *_test.ts unit/route tests; e2e/ Playwright specs
pipeline/             — offline word-data pipeline (clean, enrich, distractors,
                        pseudowords); data/ and out/ hold large generated
                        CSV/JSON files — never read them directly
docs/                 — business process, data model, requirements, roadmap
deploy/               — Caddyfile + cloud-init for the droplet
```

## Docs index (read only what the task needs)

- `docs/data-model.md` — DB tables, bank_version, word lifecycle
- `docs/business-process.md` — test-taking flow from the product side
- `docs/import-config.md` — CSV import mapping format for `/admin/words/import`
- `docs/tech-details/index.md` — architecture/ops/test-stack docs index
- `docs/tech-details/agent-tooling.md` — AI-agent setup for this repo (skills,
  deny rules, freshness checks)
- `docs/requirements/` — SARA-traced requirements (only for requirement edits)
- `docs/plans/` — dev plans consumed by the gh-issue-creator skill
- `pipeline/README.md` — bulk word-data pipeline (SUBTLEX/WordNet)

## CI/CD at a glance (.github/workflows/)

- `ci.yaml` — umbrella with paths-filter; dispatches the workflows below
- `quality.yaml` — fmt:check, lint, check, unit tests + coverage (≙
  `deno task ci`)
- `e2e.yaml` — Playwright container + Postgres 17 service
- `image.yaml` / `deploy.yaml` — GHCR image build, SSH deploy to droplet
- `seed.yaml` — manual word seeding (workflow_dispatch)
- `wiki-sync.yaml` — publishes `docs/` to the GitHub wiki via
  `scripts/build_wiki.ts`
- `requirements.yaml` — SARA requirements validation
- `cleanup-closed-pr-branches.yml` — housekeeping

Green CI locally = `deno task ci` passes; e2e additionally needs a seeded DB
(see the `local-e2e` skill).

## Skills (`.agents/skills/`, symlinked into `.claude/skills/`)

Reusable workflows — invoke instead of re-deriving them:

- `gh-issue-creator` — turn a plan doc into GitHub issues
- `gh-issue-solver` — pick an issue, branch, implement, open a PR
- `plan-brainstorm` / `incubate-idea` — refine ideas into dev plans
- `local-e2e` — run/debug the Playwright suite locally from scratch
- `db-migration` — schema-change workflow (schema.ts → generate → migrate →
  test)

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
- `.claude/settings.json` enforces this with Read-deny rules on the heavy paths
  (`pipeline/data/*`, `pipeline/out/*.csv`, `coverage`, `deno.lock`, vendored
  `static/*.min.*`, `db/migrations/meta/`). `pipeline/data/seed_words.csv` (the
  small curated seed bank) is the one data file that stays readable/editable.

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
  output into the main conversation; run `deno task ci` once before finishing.

### Freshness

- `tests/agent_docs_test.ts` fails CI if this file's map misses a top-level
  source directory, a referenced `deno task` doesn't exist (here or in
  `.github/workflows/`), or a skill loses its frontmatter — keep AGENTS.md
  updated instead of deleting the test.

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
