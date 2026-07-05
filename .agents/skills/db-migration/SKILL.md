---
name: db-migration
description: Workflow for changing the PostgreSQL schema with Drizzle — edit db/schema.ts, generate a migration, apply and test it. Use for any change to tables, columns, ticket_configs, or SnapshotQuestion types.
---

# DB Migration Workflow

## Steps

1. Edit `db/schema.ts` (single source of truth: tables **and** the
   `SnapshotQuestion` JSONB types live here).
2. `deno task db:generate` — drizzle-kit writes
   `db/migrations/NNNN_<codename>.sql` plus `meta/` snapshots.
3. **Review the generated SQL** before applying — drizzle-kit occasionally
   drops/recreates instead of altering.
4. `deno task --env-file=.env db:migrate` (local Postgres:
   `docker compose -f compose.dev.yaml up -d postgres`).
5. Update seeds if columns changed: `pipeline/data/seed_words.csv` columns are
   `value,is_real,difficulty,synonyms,antonyms,definition`;
   `tests/seed_words_test.ts` validates the CSV.
6. Run affected tests, then `deno task ci` once at the end.

## Data-transforming migrations

If the migration moves/copies data (not just DDL), add a replay test following
`tests/migration_0007_test.ts`: it replays the migration SQL inside a throwaway
schema against hand-seeded rows, skipping FK statements (drizzle-kit hardcodes
them against `public`). Such tests are `ignore`d when `DATABASE_URL` is unset,
so they need the local Postgres up.

## Gotchas

- Never hand-edit `db/migrations/meta/` (generated snapshots; also Read-denied
  for agents) or renumber existing migrations.
- Published tickets carry **frozen** JSONB question snapshots — changing
  `SnapshotQuestion` must stay backward-compatible with rows already in
  `tickets`, or ship a data migration for them.
- Migrations run in CI/e2e via `deno task seed:e2e`; a migration that only works
  on a dirty local DB will fail there.
- Adding a dependency for a migration? The lockfile is frozen — regenerating
  `deno.lock` is a deliberate, separate change.
