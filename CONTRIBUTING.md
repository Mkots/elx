# Contributing to ELX

Thanks for your interest in contributing!

## Development Setup

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up -d postgres
deno task --env-file=.env dev
```

## Before Submitting a PR

1. **Format**: `deno task fmt`
2. **Lint**: `deno task lint`
3. **Type check**: `deno task check`
4. **Tests**: `deno task test`

All of these run automatically via hk on pre-commit and pre-push.

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add word scoring endpoint
fix: handle empty search query
docs: update API reference
chore: bump dependencies
```

## Pull Requests

- Keep PRs focused on a single change.
- Include a clear description of what and why.
- Reference related issues with `Closes #123`.
- Ensure CI passes before requesting review.

## Requirements

This project uses [SARA](https://github.com/AstraZeneca/sara) for requirements
tracing. If your change affects documented requirements in `docs/requirements/`,
update them accordingly.

## Recipes

Copy-paste procedures for the most common contributor tasks. Each one is
self-contained — follow it top to bottom on a fresh clone.

### Add a word list

There are two ways to get words into the `words` table, depending on how many
you have and whether you want them in the sanctioned bank or a one-off import.

**A few words, ad hoc, via the admin UI:**

1. Start the app (`deno task --env-file=.env dev`) and log in at `/admin` (needs
   `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env`).
2. From **Words Manager** (`/admin/words`), click **Import Words**
   (`/admin/words/import`), paste or upload a CSV, pick the column mapping, and
   submit. See [`docs/import-config.md`](docs/import-config.md) for the mapping
   config format and worked examples.
3. Back on **Words Manager**, confirm the new rows landed with the expected
   `is_real`/`difficulty` values.

**The sanctioned seed bank** (what `deno task seed:words` loads on a fresh DB,
e.g. for e2e):

1. Add rows to [`pipeline/data/seed_words.csv`](pipeline/data/seed_words.csv) —
   columns are `value,is_real,difficulty,synonyms,antonyms,definition`
   (`synonyms`/`antonyms` are `;`-separated).
2. Run `deno task seed:words`. It upserts on `value`, so re-running is safe, and
   stamps every row with a `bank_version` (a content hash of the CSV) so you can
   always tell which import produced a given word — see
   [`docs/data-model.md`](docs/data-model.md).
3. `deno test tests/seed_words_test.ts` checks the CSV for duplicates, valid
   difficulty ranges, and that real words have synonyms/definitions.

If your source words come from a bulk vocabulary list (SUBTLEX/WordNet-backed),
that's a different pipeline — see [`pipeline/README.md`](pipeline/README.md)
instead.

### Create and publish a ticket

A ticket is a frozen snapshot of test questions; only `published` tickets are
served to test takers (`GET /`).

1. Seed some words first if the DB is empty (`deno task seed:words`).
2. In the admin UI, go to **Tickets** (`/admin/tickets`) and click **Generate
   Base Ticket**. This runs `generateBaseTicket()` against the active
   `ticket_configs` row (falling back to a hardcoded default) and creates a
   ticket in `base` status.
3. Open the new ticket (`/admin/tickets/:id`). Every non-verification question
   (synonym/spelling/definition) needs its distractors reviewed and marked
   verified before the ticket can publish — the page shows the auto-generated
   suggestions to speed this up.
4. Click **Publish**. If any challenge question is still unverified, publishing
   fails with a readable list of every problem (not a 500) — fix what it names
   and try again. See `domain/ticket_publish.ts` for the exact rules.
5. The ticket now shows up on `GET /` for test takers.

### Add a question type

The four question types today are `verification`, `synonym`, `spelling`, and
`definition` (see `SnapshotQuestion` in `db/schema.ts`). Adding a fifth touches
these spots:

1. **Schema** — add a new interface extending `BaseSnapshotQuestion` in
   `db/schema.ts` and add it to the `SnapshotQuestion` union.
2. **Generation** — teach `buildQuestions()` in `domain/ticket_generation.ts`
   how to pick candidate words and build the new question shape; add a
   `<type>Count` field to `TicketGenerationConfig` (and the `ticket_configs`
   table + a migration, if it should be admin-configurable per ticket).
3. **Publish validation** — if the new type needs author verification before a
   ticket can go live, add its checks to `validateForPublish()` in
   `domain/ticket_publish.ts`.
4. **Admin review UI** — render and let admins edit/verify the new type in
   `ui/pages/AdminTicketDetailPage.tsx`, and handle it in the
   `POST /admin/tickets/:id/edit-question/:index` branch in
   `routes/admin/tickets.ts`.
5. **Tests** — extend `tests/ticket_generation_test.ts` and
   `tests/ticket_publish_test.ts` (pure, no DB) for the new logic, plus the
   `tests/admin_tickets_test.ts` route coverage.

The user-facing challenge stage (answering synonym/spelling/definition questions
as a test taker, not just authoring them) is intentionally out of scope today —
see `docs/plans/global-refactoring-plan.md`'s "Out of scope" section.
