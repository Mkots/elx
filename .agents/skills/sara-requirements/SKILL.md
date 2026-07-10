---
name: sara-requirements
description: Maintain this repo's SARA requirements documentation and traceability graph. Use when Codex changes product behavior, architecture, tests, verification coverage, docs/requirements items, roadmap-to-requirement mappings, ADRs, or needs to inspect SARA context token-efficiently without reading the whole requirements tree.
---

# SARA Requirements Workflow

Use this skill to keep `docs/requirements/` aligned with code and docs changes.
SARA CLI is not available in the agent environment for this repo, so update the
Markdown/YAML artifacts directly and leave `sara check` validation to CI unless
the user explicitly provides a working local SARA setup.

## Token-Saving Orientation

1. Read `docs/requirements/README.md`, `docs/requirements/sara.toml`, and
   `docs/requirements/model.yaml` only when the SARA model or directory layout
   is unknown.
2. Prefer index and targeted search before opening item files:
   - `rg -n "REQ-[A-Z0-9-]+|ADR-[A-Z0-9-]+|VER-[A-Z0-9-]+" docs/requirements`
   - `rg -n "routes/stage1.ts|REQ-WORD-SELECTION|stage 1" docs/requirements`
   - `rg -n "verifies:|justifies:|depends_on:|refines:" docs/requirements`
3. Open only the candidate requirement, its direct upstream/downstream items,
   and any changed source/test file that the item references.
4. Do not read generated or large pipeline data to infer requirements. Use
   roadmap, tech-details, source files, tests, and existing requirement items.

## Change Triage

For every implementation or documentation change, decide whether it affects
SARA:

- User-visible behavior or business rule: update or add a `REQ-*` item.
- Architecture/technology/storage/security decision: update or add an `ADR-*`
  item that `justifies` the affected requirements.
- New or changed tests/coverage: update or add a `VER-*` item that `verifies`
  every covered requirement.
- New product capability spanning multiple units: update `SOL-*` scope and add
  focused `REQ-*` items instead of creating one broad requirement.
- Pure refactor with no behavior, architecture, or coverage change: normally no
  SARA edit; mention this in the final response.

## Editing Workflow

1. Identify existing IDs with `rg` before creating new ones. Reuse an item when
   the change fits its existing logical unit.
2. Read `references/item-patterns.md` when creating a new SARA item or changing
   frontmatter/relations.
3. Keep frontmatter valid YAML. Quote IDs and strings. Use block scalars for
   multi-line `specification` or `description`.
4. Preserve the model:
   - `solution` (`SOL-*`) has no parent relation.
   - `requirement` (`REQ-*`) `refines` a solution and may `depends_on` other
     requirements.
   - `decision` (`ADR-*`) `justifies` requirements and may `supersedes` another
     decision.
   - `verification` (`VER-*`) `verifies` requirements.
5. Update body links and prose after frontmatter changes. Keep each file as one
   logical unit, with source links back to `docs/roadmap/`,
   `docs/tech-details/`, source code, or tests.
6. Update `docs/requirements/*/index.md` when adding or removing item files.
7. If a code change adds tests, make sure the corresponding `VER-*` item names
   exact test files and maps specific assertions to requirements.
8. If a requirement is deferred, state why in the body and avoid adding
   mandatory verification until accepted.

## Validation

Do not run or install `sara` in this agent environment. Instead:

- Run focused repository tests for changed code/docs when practical.
- Run `deno test tests/agent_docs_test.ts` when editing `.agents/skills/` or
  `AGENTS.md`.
- Report that SARA graph validation is expected in
  `.github/workflows/requirements.yaml` via `sara check`.

If the user is working in a local shell with SARA installed, tell them the
manual check is run from `docs/requirements/`:

```bash
sara check
sara report coverage
sara report matrix
```
