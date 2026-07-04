# Global Refactoring — Development Plan

Source: [global-refactoring-plan.md](./global-refactoring-plan.md). Series tags:
`[Fable Improve 1]` … `[Fable Improve 7]` — one tag per phase, in execution
order.

## Goal

The codebase keeps its stack (Deno + Hono + HTMX + Postgres) but becomes
maintainable by low-technical contributors: one pooled database client, one
repository layer, one storage engine (Postgres only, Deno KV removed), pure
domain functions for ticket generation/publishing, a security baseline (no
default admin credentials, CSRF, secure cookies), an item-level answer log that
enables the research goal (funnel/latency analysis, future adaptive testing),
and a reproducible enrichment pipeline under `pipeline/` with a manifest. Done
means: all work items below merged with green `deno task ci`, docs/SARA updated,
and no references to the old KV runtime flag remain.

## Decisions

Fixed during brainstorm (2026-07-04) with the project owner; do not relitigate:

1. **User-facing challenge stage (synonym/spelling/definition) is out of
   scope.** This plan only lays groundwork for it (`requireTestSession`,
   `test_answers.question_type`). A separate plan will add the stage.
2. **Spelling questions stay in the system.** The roadmap and SARA docs must be
   reconciled: Stages 3–5 are implemented on the authoring side only; the
   "Spelling challenges are retired" comment in `routes/seed_verification.ts`
   refers to legacy per-word spelling seeds, not to the feature — reword it.
3. **Deno KV is removed entirely** (Phase: `[Fable Improve 5]`). Sessions and
   admin sessions move to Postgres. A new ADR supersedes `ADR-SESSION-STORE`.
4. **`test_history` is replaced immediately** by `test_sessions` (one row per
   session: ticket, timestamps, score, truthfulness) + `test_answers` (one row
   per answered item). Legacy `test_history` rows are migrated into
   `test_sessions` in the same migration, then the old table is dropped. No data
   is destroyed.
5. **Admin auth stays env-based**: `ADMIN_USERNAME`/`ADMIN_PASSWORD` required
   (no `admin`/`admin` fallback), constant-time comparison, login rate limit. No
   password hashing, no admin table — minimal concepts for maintainers.
6. **Phase order**: Hygiene → DB layer → Security → Domain → Storage+log →
   Pipeline → DX. Security lands before the domain extraction.
7. **Pipeline**: `seed_words.ts` embedded data moves to CSV loaded through
   `importer_core.ts`; generated artifacts stay gitignored; only `manifest.json`
   (inputs' hashes, stage versions, row counts) is committed.
8. **Google Tag Manager, not a hardcoded GA4 snippet.** The app embeds a GTM
   container (env-gated `GTM_CONTAINER_ID`) and publishes a documented
   **dataLayer event contract**; researchers create their own tags/triggers
   (including GA4) in the GTM UI without code changes. Every event carries the
   anonymous `session_id` so GA/GTM data can be correlated with the first-party
   `test_answers` log. Item-level data stays first-party in Postgres.
9. Judgment calls: `Secure` cookie flag gated by `APP_ENV=production`; CSRF via
   Hono's `csrf()` origin check (no token plumbing); interim KV session TTL is
   skipped because Phase 5 removes KV shortly after; seeded RNG is injected as a
   `random: () => number` parameter.
10. **GTM/GA4 ships behind a consent gate, not a banner.** A dedicated consent
    page (accept cookies + privacy policy + ToS) gates the test start; no
    consent → no test. GTM loads with Consent Mode v2 defaults `denied`, updated
    to `granted` only after acceptance. Framed as **research-participation
    consent** (standard practice in psycholinguistics studies), which is the
    defensible variant of a "cookie wall" under EDPB guidance. Later this gate
    moves to login/registration.
11. **Retention: keep all session/answer data indefinitely.** No personal data
    is stored (no IPs, no accounts — anonymous UUID sessions). Coarse region
    comes from GA4's built-in geo reports (Google derives it from IP on their
    side; nothing stored first-party); time of day comes from
    `test_sessions.created_at`. No first-party geo column.
12. **Rate limiting stays in-memory permanently** until horizontal scaling is
    actually on the table (it is not). No Postgres/Redis-backed limiter, no
    proxy-level config — deliberate simplicity.

## Work items

### 1. `[Fable Improve 1]` Repo hygiene fixes

- **Depends on**: —
- **Context**: `.gitignore` ends with `.env.example`, contradicting the earlier
  `!.env.example`; `deps.ts` is a 6-line legacy pattern already replaced by the
  import map; the `check` task lists globs and silently skips new dirs;
  `generateBaseTicket` (`routes/admin/loaders/tickets.ts`) throws on a
  successful 20th attempt (`attempts >= 20` after `break`).
- **Deliverable**:
  1. `.gitignore` cleaned (negation works by rule, not by accident).
  2. `deps.ts` deleted, imports updated.
  3. `check` task = `deno check .` (plus exclusions if needed).
  4. Retry loop tracks success with a boolean; regression test for the
     20th-attempt case.
- **Acceptance criteria**:
  - [ ] `git check-ignore .env.example` exits non-zero.
  - [ ] No file imports `deps.ts`; file removed.
  - [ ] A deliberately broken new `.ts` file fails `deno task check`.
  - [ ] `deno task ci` green.

### 2. `[Fable Improve 1]` Reconcile roadmap and SARA docs with reality

- **Depends on**: —
- **Context**: `docs/roadmap/index.md` marks Stages 3–5 "Implemented", but only
  authoring (admin curation, ticket snapshots) exists — there are no user-facing
  routes for challenge questions. `routes/seed_verification.ts:107` says
  "Spelling challenges are retired", contradicting the roadmap. Spelling stays
  (Decision 2).
- **Deliverable**:
  1. Roadmap statuses split into "authoring: implemented / user-facing: planned"
     for Stages 3–5.
  2. `seed_verification.ts` comment reworded (legacy seeds retired, feature
     alive); affected REQ/VER pages (`REQ-SPELLING`, `REQ-SYNONYMS-ANTONYMS`,
     `REQ-MEANING`, verification index) updated the SARA way.
  3. `docs/business-process.md` checked against actual flow.
- **Acceptance criteria**:
  - [ ] No doc claims a user-facing challenge stage exists.
  - [ ] SARA model (`docs/requirements/model.yaml`) still validates in the
        requirements CI workflow.
  - [ ] `deno task ci` green (wiki build test passes).

### 3. `[Fable Improve 2]` Pooled singleton database client

- **Depends on**: —
- **Context**: `db/client.ts` `createDatabase()`/`withDb` open and close a new
  Postgres connection per call; every loader pays connection setup and the app
  can exhaust connections under load.
- **Deliverable**:
  1. Module-level `db` export backed by `postgres(url, { max: 10 })`.
  2. `withDb` and per-call `client.end()` removed; callers use `db` directly.
  3. Graceful shutdown hook (`client.end()` on SIGTERM) in `main.ts`.
- **Acceptance criteria**:
  - [ ] No `client.end()` in request paths; exactly one `postgres()` call in the
        app (scripts may keep their own).
  - [ ] App serves requests with `max_connections`-friendly behavior (manual
        check: 50 sequential requests do not accumulate connections).
  - [ ] `deno task ci` and `deno task e2e` green.

### 4. `[Fable Improve 2]` Repository layer and single services object

- **Depends on**: 3
- **Context**: each route defines its own `*Loader`/`*SessionStore` interface +
  DB and KV implementations; `getTicketById` is implemented 3+ times
  (`routes/stage1.ts`, `routes/stage2.ts`, `routes/admin/loaders/tickets.ts`);
  `app.ts` wires 13 optional options.
- **Deliverable**:
  1. `db/repositories/{tickets,words,history,ticket_configs}.ts` exporting plain
     functions; all duplicated queries consolidated.
  2. `createApp({ services })` takes one `Services` object (queries + session
     store); default built from repositories; route-local interfaces and
     `database*Loader`/`kv*SessionStore` objects deleted.
  3. Route tests updated to fake the `Services` shape.
- **Acceptance criteria**:
  - [ ] `app.ts` ≤ ~60 lines; `CreateAppOptions` gone.
  - [ ] `getTicketById` exists exactly once.
  - [ ] `deno task ci` green; route tests still run without a database.

### 5. `[Fable Improve 3]` Admin auth hardening

- **Depends on**: —
- **Context**: `routes/admin/auth.ts` falls back to `admin`/`admin`, compares
  plaintext with `===`, and has no login throttling.
- **Deliverable**:
  1. Missing `ADMIN_USERNAME`/`ADMIN_PASSWORD` → `/admin` disabled with a clear
     startup warning (app itself still runs).
  2. Constant-time credential comparison (e.g. via
     `crypto.subtle.timingSafeEqual`-style helper).
  3. Rate limit on `POST /admin/login`: 5 attempts / 15 min per IP, in-memory.
- **Acceptance criteria**:
  - [ ] With unset env vars, `/admin/login` returns 503/disabled page; no
        default credentials work.
  - [ ] 6th rapid failed login returns 429; test covers it.
  - [ ] `deno task ci` green.

### 6. `[Fable Improve 3]` CSRF, secure headers, cookie hardening, HTML 404

- **Depends on**: —
- **Context**: no CSRF protection on any form (including ticket deletion); no
  security headers; `sessionId` and `admin_session` cookies lack `Secure`;
  `session.ts` hand-rolls cookie parsing while admin code already uses Hono
  helpers; `notFound` returns JSON for page routes.
- **Deliverable**:
  1. `csrf()` middleware on all POST routes (origin check; `APP_ORIGIN` env if
     needed).
  2. `secureHeaders()` middleware app-wide.
  3. Both cookies get `Secure` when `APP_ENV=production`; `parseSessionId`/
     `sessionCookie` replaced with Hono `getCookie`/`setCookie`.
  4. HTML 404 page for non-`/health` routes.
- **Acceptance criteria**:
  - [ ] Cross-origin POST is rejected (test with forged Origin header).
  - [ ] Responses include the standard secure headers set.
  - [ ] With `APP_ENV=production`, `Set-Cookie` contains `Secure`; without it,
        local http flow still works (e2e green).
  - [ ] `deno task ci` and `deno task e2e` green.

### 7. `[Fable Improve 4]` Extract pure ticket-generation domain module

- **Depends on**: 4
- **Context**: `generateBaseTicket` is ~280 lines inside a loader: backtracking
  partitioning, up to 20 retry rounds each re-querying all words per difficulty,
  full-table scans for distractors (`getRandomRealWords` loads the whole table
  and shuffles in JS).
- **Deliverable**:
  1. `domain/ticket_generation.ts`: pure
     `buildQuestions(config, wordPool, random) -> SnapshotQuestion[]` working on
     an in-memory pool fetched by one query (all reviewed words with difficulty,
     synonyms, definition).
  2. Greedy selection + explicit validation error naming the short
     difficulty/type (no backtracking, no retry loop).
  3. Distractors picked from the in-memory pool.
  4. Injected `random` fn; unit tests with a seeded RNG covering: happy path,
     insufficient pool per difficulty, insufficient synonyms/definitions.
- **Acceptance criteria**:
  - [ ] Ticket generation issues ≤ 3 SQL queries total.
  - [ ] `routes/admin/loaders/tickets.ts` contains no selection logic.
  - [ ] Same seed → identical ticket (test).
  - [ ] `deno task ci` green.

### 8. `[Fable Improve 4]` Publish guardrails as pure validation + remove GET / side effects

- **Depends on**: 7
- **Context**: publish guardrails throw strings from inside the loader;
  `routes/home.ts` auto-generates and force-publishes a "Default E2E assessment
  ticket" on GET `/`, marking questions verified and bypassing guardrails.
- **Deliverable**:
  1. `domain/ticket_publish.ts`: `validateForPublish(ticket) -> problems[]`;
     route maps problems to flash messages.
  2. Auto-generate fallback removed from `routes/home.ts`; home shows an empty
     state when no published tickets exist.
  3. `deno task seed:e2e` extended to generate + publish one ticket; e2e setup
     uses it.
- **Acceptance criteria**:
  - [ ] GET `/` performs zero writes (test asserts no insert on empty DB).
  - [ ] Publishing an invalid ticket lists all problems at once.
  - [ ] `deno task e2e` green using the seeded ticket.
  - [ ] `deno task ci` green.

### 9. `[Fable Improve 4]` Deduplicate stage route preamble

- **Depends on**: 4
- **Context**: stage1/stage2 GET and POST all repeat the cookie → session →
  ticket → redirect chain and the wordList rebuild (`routes/stage1.ts`,
  `routes/stage2.ts`).
- **Deliverable**:
  1. `requireTestSession(context, services)` helper returning
     `{ sessionId, ticket }` or a redirect; used by stage1, stage2, result.
  2. wordList construction extracted to one function.
- **Acceptance criteria**:
  - [ ] Session/ticket resolution code exists once.
  - [ ] Route behavior unchanged (existing route tests pass unmodified except
        imports).
  - [ ] `deno task ci` green.

### 10. `[Fable Improve 5]` Schema: `test_sessions` + `test_answers`, migrate off `test_history`

- **Depends on**: 4
- **Context**: only aggregate score/truthfulness survives a test
  (`test_history`); the research goal needs item-level answers with timing.
  Decision 4: replace `test_history` immediately, preserving rows.
- **Deliverable**:
  1. Drizzle schema + migration: `test_sessions` (uuid id, ticket_id,
     created_at, completed_at, score, truthfulness, stage1 selection) and
     `test_answers` (session_id, question_index, question_type, stage, answer,
     is_correct, answered_at).
  2. Same migration copies `test_history` rows into `test_sessions` (null
     selection/answers), then drops `test_history`.
  3. Admin history page/loader reads `test_sessions`.
- **Acceptance criteria**:
  - [ ] Migration on a DB with existing `test_history` rows preserves count and
        scores (test against a seeded DB).
  - [ ] Admin history shows legacy and new sessions identically.
  - [ ] `deno task ci` green.

### 11. `[Fable Improve 5]` Move sessions to Postgres, delete Deno KV, new ADR

- **Depends on**: 10
- **Context**: sessions live in Deno KV (`session.ts`) — second storage engine,
  old KV runtime flag in tasks/Dockerfile, old KV path volumes in compose, data
  invisible to SQL/Adminer; user-session keys never expire.
- **Deliverable**:
  1. `session.ts` rewritten against `test_sessions`/`test_answers`; admin
     sessions in an `admin_sessions` table with `expires_at`.
  2. All KV code and old KV runtime/path config removed from `deno.json`,
     `Dockerfile`, both compose files, deploy docs.
  3. Cleanup: scheduled task or on-login purge of expired admin sessions;
     abandoned test sessions kept (they are research data).
  4. New ADR `ADR-SESSION-STORE-POSTGRES` marking `ADR-SESSION-STORE`
     "superseded by" (SARA index updated).
- **Acceptance criteria**:
  - [ ] the repo-wide grep for the old KV runtime/path literals returns nothing.
  - [ ] Full test flow (home → stage1 → stage2 → result) green in e2e.
  - [ ] Expired admin session redirects to login.
  - [ ] `deno task ci` and `deno task e2e` green.

### 12. `[Fable Improve 5]` Item-level answer recording

- **Depends on**: 10, 11
- **Context**: stage-1 selections and stage-2 answers must land in
  `test_answers` with timestamps (per-item latency = research dataset; the
  gasparl/lextale reference records response times for the same reason).
- **Deliverable**:
  1. Stage-1 submit writes selection rows; each stage-2 answer writes a row with
     `answered_at` (latency derivable from previous row).
  2. Completion computes score from `test_answers` and stamps
     `test_sessions.completed_at/score/truthfulness` (single source of truth,
     Decision 4).
- **Acceptance criteria**:
  - [ ] After an e2e run, `test_answers` row count = selections + stage-2
        answers for that session.
  - [ ] Score on result page equals score recomputed from `test_answers` by a
        SQL query (test).
  - [ ] `deno task ci` green.

### 12a. `[Fable Improve 5]` Consent gate + GTM with dataLayer event contract

- **Depends on**: 11 (session store in Postgres)
- **Context**: Decisions 8 and 10 — researchers manage their own analytics in
  the GTM UI; the app's job is (a) a consent gate before anything loads and (b)
  a stable, documented dataLayer event stream to build triggers on. The gate
  later moves to login/registration (out of scope here).
- **Deliverable**:
  1. Static pages `/privacy` and `/terms` (placeholder text; final wording is
     the owner's — see Open questions).
  2. Consent page shown before the test starts: checkbox + links to both
     documents; acceptance stamps `test_sessions.consented_at`.
     `POST
     /stage/1/start` refuses (redirects to consent) without it.
  3. GTM container snippet in `Layout.tsx`, rendered only when
     `GTM_CONTAINER_ID` is set; Consent Mode v2 defaults `denied`, updated to
     `granted` after consent; `.env.example` documents it.
  4. Server-rendered dataLayer pushes for the core events, each carrying
     `session_id` and `ticket_code`: `consent_granted`, `test_started`,
     `stage1_submitted` (selected count), `stage2_answered` (question index,
     type, answer) — emitted from the htmx fragment via inline script or
     `HX-Trigger` — and `test_completed` (score, truthfulness).
  5. Event contract documented in `docs/tech-details/analytics.md` (the page
     researchers read to build GTM triggers).
  6. `secureHeaders()` CSP adjusted to allow GTM (`googletagmanager.com`) and
     the inline dataLayer pushes (nonce-based).
- **Acceptance criteria**:
  - [ ] E2E: attempt to start the test without consent lands on the consent
        page; after acceptance the normal flow works.
  - [ ] No GTM script tag when env var unset; consent state `denied` before
        acceptance when set (test on rendered HTML).
  - [ ] Each core event appears in `dataLayer` at the right step (e2e assert on
        `window.dataLayer`).
  - [ ] `consented_at` recorded once per session.
  - [ ] `deno task ci` and `deno task e2e` green.

### 13. `[Fable Improve 6]` Restructure pipeline into `pipeline/` with orchestrator and manifest

- **Depends on**: — (parallelizable with series 2–5)
- **Context**: `scripts/` mixes app seeders, importer, wiki builder, and the
  magic-hat pipeline; artifact provenance (`ALL.clean.csv`, `ALL.enriched.csv`,
  `rabbits/*.json`) is unclear; shuffles are unseeded.
- **Deliverable**:
  1. `pipeline/` contains `clean`, `enrich`, `pseudowords`, `distractors`,
     `phonetic_distractors`, `gap_sentences` stages + their tests; raw sources
     under `pipeline/data/` with per-source READMEs (SUBTLEX, Tatoeba, WordNet
     moved as-is); `scripts/` keeps only seed/import/wiki tasks.
  2. `deno task pipeline` runs stages in order and writes `manifest.json` (stage
     versions, input hashes, row counts, date) next to artifacts; artifacts stay
     gitignored, manifest committed (Decision 7).
  3. Seeded RNG in every stage → byte-identical reruns.
  4. `docs/tech-details/enrichers.md` updated to the new layout.
- **Acceptance criteria**:
  - [ ] Two consecutive `deno task pipeline` runs produce identical artifacts
        (hash-compare, test or CI check).
  - [ ] `deno task ci` green (moved tests included); path-gated CI workflows
        updated for the new directory.

### 14. `[Fable Improve 6]` Move embedded seed data to CSV; add bank versioning

- **Depends on**: 13
- **Context**: `scripts/seed_words.ts` is ~900 lines of embedded word objects;
  `importer_core.ts` already supports configurable CSV import. Research data
  must be linkable to the exact generation run.
- **Deliverable**:
  1. Embedded data exported to `pipeline/data/seed_words.csv`; `seed:words`
     becomes a thin loader through `importer_core.ts`.
  2. `bank_version` (manifest hash) column on `words`; importer stamps it;
     ticket notes include it at generation time. Existing rows get
     `'pre-manifest'`.
- **Acceptance criteria**:
  - [ ] Fresh DB seeded from CSV produces the same words as the old script
        (count + spot-check test).
  - [ ] New tickets record the bank version.
  - [ ] `deno task ci` green.

### 15. `[Fable Improve 7]` Contributor DX: recipes, route template, admin flash messages

- **Depends on**: 4, 8
- **Context**: maintainers with limited technical background need copy-paste
  procedures; admin errors currently surface as JSON 500s; route boilerplate
  needs a canonical example.
- **Deliverable**:
  1. `CONTRIBUTING.md` "Recipes" section: add a word list, create/publish a
     ticket, add a question type — numbered steps each.
  2. `routes/_example.ts.md` documenting the single route pattern (services,
     repository, page).
  3. Domain validation errors rendered as flash messages in admin (publish
     problems from item 8, generation errors from item 7).
- **Acceptance criteria**:
  - [ ] A publish attempt on an invalid ticket shows readable messages, not a
        500.
  - [ ] Recipes verified by following them literally on a fresh clone.
  - [ ] `deno task ci` green.

## Out of scope

- **User-facing challenge stage** (synonym/spelling/definition play) — Decision
  1; separate plan after this refactoring.
- **Framework migration** (Fresh/Next/etc.) — rejected; Hono SSR fits.
- **Strict LexTALE scoring** (%correctAV/Ghent) — owner deprioritized; isolated
  in `scoring/lextale.ts` if ever needed.
- **Adaptive testing (IRT/CAT)** — premature; item 12's dataset is the
  prerequisite.
- **Password hashing / admin user table** — Decision 5 keeps env-based auth.

## Open questions

1. **Final privacy policy and ToS wording** — item 12a ships placeholder pages;
   the owner supplies real text before production GTM activation (setting
   `GTM_CONTAINER_ID` is the trigger).
2. **GA4/GTM workspace setup** — owner creates the GTM container and GA4
   property, grants researchers access, and decides whether to enable the
   BigQuery export (needed only if researchers want to join GA data with the
   first-party `test_answers` log via `session_id`).

Resolved (2026-07-04, owner): GDPR approach = consent gate (Decision 10);
retention = indefinite (Decision 11); rate limiting = in-memory until scaling
(Decision 12).
