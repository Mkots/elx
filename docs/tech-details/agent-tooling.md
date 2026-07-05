# AI Agent Tooling

How this repo is set up for AI coding agents (Claude Code, Codex CLI, Gemini CLI
/ Antigravity, and others), and the conventions to follow when extending that
setup. The guiding principle: **AGENTS.md is the always-loaded compressed index;
everything else loads on demand or is blocked outright.**

## Inventory

| Piece                       | Purpose                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`                 | Canonical agent guide (commands, architecture, file map, gotchas). Loaded into every session — keep it lean. |
| `CLAUDE.md`                 | Symlink → `AGENTS.md`. Single source of truth; never edit separately.                                        |
| `.agents/skills/*/SKILL.md` | On-demand workflow instructions (see below). Canonical location.                                             |
| `.claude/skills/*`          | Relative symlinks into `.agents/skills/` so Claude Code discovers them.                                      |
| `.claude/settings.json`     | Checked-in project permissions: Read-deny rules for heavy/noise files, allow rules for safe deno/git calls.  |
| `tests/agent_docs_test.ts`  | Freshness guard — fails `deno task test`/CI when agent docs drift (see below).                               |

## Read-deny rules (`.claude/settings.json`)

Agents burn most wasted tokens on accidental reads of large generated files. The
deny list blocks the `Read` tool on:

- raw pipeline data (`pipeline/data/wordnet|wordlists|subtlex|tatoeba`) and
  generated pipeline output CSVs (`pipeline/out/*.csv`);
- build/test artifacts (`coverage/`, `coverage.lcov`, `test-results/`,
  `playwright-report/`, `.wiki-build/`, `.data/`, `.deno-cache/`);
- vendored/lock content (`node_modules/`, `deno.lock`, `static/htmx.min.js`,
  `static/pico.min.css`, `db/migrations/meta/`);
- secrets (`.env`; `.env.example` stays readable).

Escape hatch: when a file's _structure_ is genuinely needed, run a targeted
shell command (`head -n 5 file.csv`, `jq '.[0]' file.json`) instead of a full
read. `pipeline/data/seed_words.csv` (small, curated, hand-edited) is
deliberately **not** denied.

The allow list pre-approves the read-only/verification commands agents run
constantly (`deno task fmt|lint|check|test|ci`, `deno test`,
`git
status|diff|log`) so they don't generate permission prompts.

`.claude/settings.local.json` stays personal and git-ignored — put individual
overrides there, not in `settings.json`.

## Skills

Skills live in `.agents/skills/<name>/SKILL.md` with YAML frontmatter (`name:`,
`description:`). They hold workflow knowledge that would otherwise be re-derived
(and re-tokenized) every session, but is too situational for the always-loaded
AGENTS.md:

- `gh-issue-creator`, `gh-issue-solver` — milestone-driven issue/PR workflows
  (creator makes a milestone + its issues; solver implements every open issue in
  a milestone)
- `plan-brainstorm`, `incubate-idea` — idea → dev-plan pipelines
- `local-e2e` — fresh-clone → green Playwright run, plus debugging checklist
- `db-migration` — Drizzle schema-change workflow and its gotchas

**Adding a skill**: create `.agents/skills/<name>/SKILL.md`, add a relative
symlink in `.claude/skills/`, and list the skill in the AGENTS.md "Skills"
section — `tests/agent_docs_test.ts` enforces the frontmatter and the AGENTS.md
listing. Write the description so an agent can decide from it alone whether to
load the skill (trigger phrases, not marketing).

## Freshness guard (`tests/agent_docs_test.ts`)

Runs as a normal unit test (so it's in `deno task test`, pre-push hooks, and CI
with zero extra wiring) and asserts:

1. every top-level directory containing `.ts`/`.tsx` appears in the AGENTS.md
   file map;
2. every `deno task <name>` referenced in AGENTS.md exists in `deno.json`;
3. every `deno task` referenced in `.github/workflows/` (including seed.yaml's
   workflow_dispatch choices) exists in `deno.json`;
4. every skill has frontmatter and is listed in AGENTS.md;
5. `CLAUDE.md` remains a symlink to `AGENTS.md`.

If it fails, fix the docs — don't relax the test.

## Evaluated and declined

- **Caveman** (output-compression skill that rewrites agent replies in terse
  "caveman speak"): saves output tokens, but degrades the readability of
  explanations and reports; our spend is dominated by _input_ context, which the
  deny rules + docs index already address. Revisit only if output cost becomes
  the bottleneck.
- **Vector/graph repo indexers** (claude-context, Graphify, etc.): built for
  codebases where agents can't hold the map in a single file. This repo has ~100
  source files and a complete file map in AGENTS.md; an index server would add
  infrastructure to maintain without reducing tokens. Revisit if the source tree
  grows past the point where the AGENTS.md map stays accurate.
- **Extra per-tool config files** (`GEMINI.md`, `.cursorrules`, …): modern
  Codex, Gemini CLI/Antigravity, and Cursor all read `AGENTS.md` natively; the
  only shim kept is the `CLAUDE.md` symlink.
