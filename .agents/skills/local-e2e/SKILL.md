---
name: local-e2e
description: Runs or debugs the Playwright e2e suite locally from scratch — Postgres via Docker, migrate + seed, then deno task e2e. Use when asked to run, fix, or extend e2e tests, or when a change needs end-to-end verification.
---

# Local E2E Runner

Everything needed to go from a fresh clone to a green `deno task e2e` without
re-deriving the setup.

## One-time prerequisites

```bash
cp .env.example .env   # defaults match compose.dev.yaml (elx/elx@127.0.0.1:5432/elx)
docker compose -f compose.dev.yaml up -d postgres
```

## Run

```bash
deno task --env-file=.env seed:e2e   # db:migrate + seed:words + seed:ticket (idempotent)
deno task e2e                        # full suite
deno task e2e tests/e2e/stage1.spec.ts   # single spec
```

No `--env-file` needed for `e2e` itself: `playwright.config.ts` parses `.env`
directly and injects `DATABASE_URL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` /
`GTM_CONTAINER_ID` into the web server it manages.

## How the server is managed

- Playwright's `webServer` block auto-runs `deno task start:e2e` and waits for
  `http://127.0.0.1:8000/health` (30 s timeout).
- Outside CI it **reuses** an already-running server on :8000 — if you have a
  stale `deno task dev` running with different env/seed data, kill it first.
- Retries: 0 locally, 2 in CI; override with `PLAYWRIGHT_RETRIES=n`.

## Debugging checklist

1. Immediate redirect to `/`? The DB has no **published** ticket — re-run
   `deno task --env-file=.env seed:e2e`.
2. Stage 2 redirects back to Stage 1? The spec submitted Stage 1 without
   selecting any word — the empty-wordIds guard sends you to `/stage/1`.
3. Stage 2 form fields are radios named `word_<id>` with values `know|dont_know`
   ("Know" pre-checked). Result page exposes `data-testid="score"` and
   `data-testid="truthfulness"`.
4. Weird session state: KV lives in `.data/` — `rm -rf .data` resets sessions.
5. Full DB reset: `docker compose -f compose.dev.yaml down -v`, then redo the
   prerequisites.
6. Traces are captured on first retry; on failure inspect `test-results/` paths
   from the error output only (do not bulk-read the directory).

## CI parity

`e2e.yaml` runs the same commands inside
`mcr.microsoft.com/playwright:v1.61.0-noble` with a PostgreSQL 17 service — if
it passes locally with a fresh seed, CI should match.
