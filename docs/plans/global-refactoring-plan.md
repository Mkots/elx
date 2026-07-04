# Global Refactoring Plan

Status: draft (2026-07-04)

Goals, in priority order (agreed with the project owner):

1. **DX / maintainability** — the codebase will be maintained mostly by people
   with limited technical background. Fewer concepts, fewer files, one obvious
   way to do each thing.
2. **Security & reliability** — the app is an MVP heading to real users.
3. **Data pipeline (enrichers)** — reproducible, documented question-bank
   generation.
4. **Research readiness** — the project doubles as a research instrument;
   item-level answer data must be collectable (Google Analytics + own DB) for
   future adaptive-testing / teaching features.

Non-goals: strict LexTALE methodological fidelity (explicitly deprioritized),
framework migration (Deno + Hono + HTMX + Postgres stay).

---

## Phase 0 — Hygiene quick wins (½ day)

Small isolated fixes, each its own commit:

- [ ] `.gitignore`: remove the trailing `.env.example` line that contradicts the
      earlier `!.env.example` negation (the file is tracked, so it works by
      accident; the rule is just confusing).
- [ ] Delete `deps.ts` (legacy Deno pattern; import map in `deno.json` already
      does this job).
- [ ] `deno.json` `check` task: replace the fragile glob list with
      `deno check .` (new files are silently skipped today).
- [ ] Fix off-by-one in `routes/admin/loaders/tickets.ts` `generateBaseTicket`:
      a successful selection on attempt 20 still hits the
      `if (attempts >= 20) throw` branch. Track success with a boolean.
- [ ] Remove `.DS_Store` files, add nothing (already ignored).

## Phase 1 — Single database access layer (1–2 days)

Problem today:

- `createDatabase()` opens **a new Postgres connection per query** and closes it
  in `finally` (`db/client.ts`, `withDb`). Under any real traffic this is slow
  and exhausts connections.
- Every route defines its own `*Loader` / `*SessionStore` interface plus a
  database implementation; `getTicketById` is implemented 3+ times
  (`routes/stage1.ts`, `routes/stage2.ts`, `routes/admin/loaders/tickets.ts`);
  `app.ts` wires 13 optional options.

Plan:

- [ ] Make the client a module-level singleton with a pool:
      `postgres(url, { max: 10 })`, export `db` directly. Delete `withDb`.
      (postgres.js pools internally; nothing else changes.)
- [ ] Create `db/repositories/` with one file per aggregate: `tickets.ts`,
      `words.ts`, `history.ts`, `ticket_configs.ts`. Each exports plain
      functions (`getTicketById(id)`, …). No interfaces.
- [ ] Replace the 13 `CreateAppOptions` loader options with a single `services`
      object (one interface, one default implementation built from
      repositories). Tests override the whole object or individual functions.
- [ ] Delete per-route `database*Loader` / `kv*SessionStore` objects.

Acceptance: `app.ts` under ~50 lines; one place to look for any query; existing
route tests still pass with the new fake-services shape.

## Phase 2 — Domain layer & ticket generation (2–3 days)

Problem today:

- `generateBaseTicket` is ~280 lines inside a "loader": backtracking
  partitioning, a retry loop that re-selects **all words of each difficulty from
  the DB up to 20×**, full-table scans for distractors (`getRandomRealWords`
  loads the whole table and shuffles in JS).
- Test-only behavior lives in production: `routes/home.ts` auto-generates and
  force-publishes a "Default E2E assessment ticket" **on GET /**, bypassing the
  publish guardrails.

Plan:

- [ ] Extract `domain/ticket_generation.ts`: pure function
      `buildQuestions(config, wordPool) -> SnapshotQuestion[]`. It receives
      words already fetched (one query: all reviewed words with difficulty,
      synonyms, definition) and does selection/partitioning in memory — the
      whole pool is a few thousand rows, no need for retry loops or
      per-difficulty queries.
- [ ] Replace backtracking with a simple greedy fill + explicit validation error
      listing which difficulty/type is short. Seed the RNG (pass a `random` fn)
      so generation is testable and reproducible.
- [ ] Random distractors: pick from the in-memory pool, not a full-table query.
- [ ] Move publish guardrails to `domain/ticket_publish.ts` (pure validation
      returning a list of problems; route just maps them to messages).
- [ ] Remove the auto-generate fallback from `routes/home.ts`. E2E gets its
      ticket from `deno task seed:e2e` (extend the seed task to also generate +
      publish one ticket). Home page with no tickets shows an empty state.
- [ ] Extract the duplicated stage1/stage2 preamble (cookie → session → ticket →
      redirect chain) into one helper/middleware `requireTestSession(context)`.

Acceptance: no business rules inside `routes/` or `loaders/`; ticket generation
covered by fast pure unit tests; GET / has no side effects.

## Phase 3 — Security baseline (1–2 days)

- [ ] **Admin credentials**: remove the `admin`/`admin` fallback — refuse to
      start (or disable /admin) if `ADMIN_USERNAME`/`ADMIN_PASSWORD` are unset.
      Compare with a constant-time check; store password as a hash
      (`scrypt`/`bcrypt`) or, simplest for this team, keep a single env var but
      document rotation.
- [ ] **CSRF**: enable Hono's `csrf()` middleware for all POST routes (forms are
      same-origin; the middleware's Origin check is enough — no token plumbing
      needed, good DX).
- [ ] **Cookies**: add `Secure` (behind an `APP_ENV=production` switch so local
      http still works) to both `sessionId` and `admin_session`; replace the
      hand-rolled `parseSessionId`/`sessionCookie` with Hono's
      `getCookie`/`setCookie` used elsewhere already.
- [ ] **Headers**: add `secureHeaders()` middleware.
- [ ] **Login rate limit**: a tiny in-memory/KV counter (5 attempts / 15 min per
      IP) on POST /admin/login.
- [ ] **Session TTL**: user session KV entries currently never expire —
      unbounded growth. Add `expireIn` (e.g. 7 days) on every `kv.set`. (Made
      moot if Phase 4 moves sessions to Postgres — then use a cron/SQL cleanup
      instead.)
- [ ] `notFound` returns JSON for page routes — render a small HTML 404 page
      (JSON only under `/health`).

## Phase 4 — One storage + research-grade answer log (2–3 days)

Motivation: KV+Postgres is two storage systems, two mental models, an
`--unstable-kv` flag, and KV data is invisible to Adminer/SQL — bad for DX and
for research. The owner plans to analyze _how_ people take the test; today only
the final aggregate (`test_history.score/truthfulness`) survives.

- [ ] Add `test_sessions` table (id uuid, ticket_id, created_at, state jsonb or
      dedicated columns for selection) and `test_answers` table (session_id,
      question_index, stage, answer, is_correct, answered_at timestamptz,
      latency_ms nullable).
- [ ] Rewrite `session.ts` against Postgres; delete Deno KV usage and the
      `--unstable-kv` flags from tasks/Dockerfile. Admin sessions move to the
      same table or a `admin_sessions` table.
- [ ] Record every stage-1 selection and stage-2 answer as a `test_answers` row
      (timestamps give per-item latency for free; the gasparl/lextale reference
      implementation records per-item response times for exactly this reason).
- [ ] Result page keeps reading the aggregate; `test_history` can later be
      derived from `test_answers` (keep it for now, drop later).
- [ ] Add a GA4 snippet hook in `Layout.tsx` gated by `GA_MEASUREMENT_ID` env
      (page-level funnel), while item-level data stays first-party in Postgres —
      this is also the dataset a future IRT/adaptive version (CAT) would be
      calibrated on.

Acceptance: single datastore; admin can inspect all state via Adminer/SQL;
answer-level funnel queryable with plain SQL.

## Phase 5 — Enrichment pipeline restructure (2–4 days)

Problem today: `scripts/` mixes app seeders, a CSV importer, a wiki builder, and
the magic-hat pipeline; `seed_words.ts` is ~900 lines with embedded data;
pipeline artifacts (`ALL.clean.csv`, `ALL.enriched.csv`, rabbits/*.json) are
partially gitignored, partially present — provenance is unclear.

- [ ] Split directories: - `pipeline/` — magic-hat stages (`clean`, `enrich`,
      `pseudowords`, `distractors`, `phonetic_distractors`, `gap_sentences`) +
      their tests; keep raw sources under `pipeline/data/` with README per
      source (SUBTLEX, Tatoeba, WordNet already have them — good). - `scripts/`
      — only app-facing tasks (seed, import, wiki build).
- [ ] One orchestrator: `deno task pipeline` runs stages in order, writes a
      `manifest.json` (stage versions, input hashes, row counts, date) next to
      artifacts, so any generated CSV can be traced to inputs.
- [ ] Seeded RNG everywhere a shuffle/sample happens → byte-identical reruns.
- [ ] Move the embedded word lists out of `seed_words.ts` into
      `pipeline/data/*.csv`; the seeder becomes a thin CSV loader reusing
      `importer_core.ts`.
- [ ] Store question-bank version: add `bank_version` (manifest hash) column on
      `words` / tickets notes so research data can be linked to the exact
      generation run.
- [ ] Document the whole flow in `docs/tech-details/enrichers.md` (update the
      existing page; it is already close).

## Phase 6 — DX for low-technical contributors (ongoing, start ~1 day)

- [ ] `CONTRIBUTING.md` rewrite: a "recipes" section — how to add a word list,
      how to create/publish a ticket, how to add a question type — each as a
      numbered copy-paste procedure.
- [ ] Reduce route boilerplate to one pattern and document it with a template
      file (`routes/_example.ts.md`).
- [ ] Admin UX guardrails instead of stack traces: convert domain validation
      errors into flash messages (publish guardrails already throw useful
      strings — render them nicely).
- [ ] Keep CI as is (already good: fmt, lint, check, coverage, e2e, path-gated)
      but add the new pure-domain tests to the fast lane.

---

## Explicitly considered and rejected

- **Framework migration (Fresh/Next/etc.)** — no benefit over Hono SSR for an
  MPA this size; migration cost hurts the DX goal.
- **Keeping Deno KV** — works, but a second storage engine + unstable flag +
  opaque data is a standing tax on low-technical maintainers and blocks SQL
  analytics on sessions.
- **Strict LexTALE scoring (%correctAV / Ghent / normalised Ghent)** — owner
  deprioritized; current simplified score stays. If comparability is ever
  needed, formulas are documented at
  waltervanheuven.net/research/lextale-scoring.html and the change is confined
  to `scoring/lextale.ts`.
- **Adaptive testing (IRT/CAT) now** — premature; Phase 4's answer log is the
  prerequisite dataset, revisit after real data exists.

## Suggested order & sizing

| Phase         | Effort        | Risk   | Value                      |
| ------------- | ------------- | ------ | -------------------------- |
| 0 Hygiene     | ½ day         | none   | unblocks everything        |
| 1 DB layer    | 1–2 d         | low    | perf + DX foundation       |
| 3 Security    | 1–2 d         | low    | required before real users |
| 2 Domain      | 2–3 d         | medium | biggest code-quality win   |
| 4 Storage+log | 2–3 d         | medium | research goal enabler      |
| 5 Pipeline    | 2–4 d         | low    | reproducibility            |
| 6 DX docs     | 1 d + ongoing | none   | contributor onboarding     |

Phases 1→3 can land before 2 (security does not depend on the domain
extraction). Each phase should be a separate PR series with green CI.
