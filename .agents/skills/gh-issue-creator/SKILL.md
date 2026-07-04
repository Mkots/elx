---
name: gh-issue-creator
description: Creates GitHub issues from a plan document. Use this when the user asks to turn a plan (e.g. a *_PLAN.md file) or a feature description into one or more well-structured GitHub issues following this repo's issue conventions.
---

# GitHub Issue Creator Skill

Turns a plan document into a series of GitHub issues that follow this repo's
established issue style. Issues are always written in **English**, even when the
source plan is in another language.

## Workflow

1. **Input**: identify the plan (file path like
   `pipeline/notes/ENRICHERS_PLAN.md`, or a description from the user). If no
   plan is given, ask for one.
2. **Research**:
   - Read the plan fully, plus any docs/requirements it references.
   - Check available labels with `gh label list` — never invent new labels.
   - Skim recent issues (`gh issue list --state all --limit 20`) to pick a
     consistent series tag and avoid duplicating existing issues.
3. **Breakdown proposal**: split the plan into PR-sized issues. Present the user
   a table — order, title, labels, dependencies, one-line scope — and **wait for
   confirmation before creating anything**. Creating issues is an outward-facing
   action.
4. **Creation**: after confirmation, create issues **in dependency order** so
   earlier ones can be referenced. Write each body to a temp file and run:
   `gh issue create --title "<title>" --label "<a,b>" --body-file <file>`.
5. **Report**: list the created issue numbers and URLs.

## Issue format

**Title**: `[<Series> <n>] <imperative summary>` — e.g.
`[Enrichers 3] Pseudoword generator for isReal=false rows`. The series tag
groups the plan's issues; `n` is the execution order.

**Body template** (omit sections that don't apply):

```markdown
> **<series> step <n>.** Depends on `[<Series> <m>]`. <Scope qualifier, e.g.
> "Analysis only, no code." if applicable.>

### Context

How things work today and why this change is needed. Name concrete files,
tables, and tasks (e.g. `pipeline/enrich.ts`, `words.difficulty`).

### Confirmed decisions

Decisions already made in the plan that the implementer must not relitigate.

### Deliverable

Numbered list of concrete outputs (files, columns, scripts, docs).

### Acceptance criteria

Verifiable checklist. For code issues always include: `deno task ci` green.

### Out of scope

What intentionally belongs to sibling issues — reference them by series tag,
e.g. `[<Series> <m>]`.
```

## Standards

- **English only** — translate plan content; keep code identifiers, file paths,
  and domain terms as-is.
- **One issue ≈ one PR**: independently implementable and reviewable. Don't
  merge unrelated plan items; don't split below a meaningful unit of work.
- **Reference siblings by series tag** (`[Enrichers 2]`), not by issue number —
  numbers are unknown until creation.
- **Labels**: only existing ones (`backend`, `database`, `ui`, `scripts`,
  `research`, `infra`, `devops`, `enhancement`, ...). Ask before creating a new
  label.
- **Traceability**: mention the source plan file in the first issue of the
  series (or each issue if the plan may change).
- **Never create issues without explicit user confirmation** of the proposed
  breakdown.
