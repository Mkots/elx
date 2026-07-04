# App-facing scripts

Task runners the live app depends on. The offline vocabulary enrichment pipeline
(clean/enrich/pseudowords/distractors/gap-sentences) lives in `pipeline/` — see
`pipeline/README.md`.

- **`seed_words.ts`** (`deno task seed:words`) — seeds the `words` table.
- **`seed_ticket.ts`** (`deno task seed:ticket`) — generates and publishes a
  ticket, used by `deno task seed:e2e`.
- **`import_words.ts`** / **`importer_core.ts`** (`deno task import:words`) —
  imports a word-list CSV into the `words` table against a column-mapping
  config; `importer_core.ts` holds the reusable import/validation logic.
- **`build_wiki.ts`** / **`sync-wiki.sh`** (`deno task wiki:build`) — mirrors
  `docs/` to the repo's GitHub wiki.
