---
name: gh-issue-creator
description: Creates a GitHub Milestone and its issues from a plan document. Use this when the user asks to turn a plan (e.g. a *_PLAN.md file) or a feature description into a milestone that groups one or more well-structured GitHub issues, following this repo's conventions.
---

# GitHub Issue Creator Skill

Turns a plan document into a **GitHub Milestone** plus the set of issues that
belong to it, following this repo's established issue style. The milestone is
the grouping unit (so `gh-issue-solver` can later implement the whole batch by
milestone); labels are only for categorization, never for grouping. Issues are
always written in **English**, even when the source plan is in another language.

## Workflow

1. **Input**: identify the plan (file path like
   `pipeline/notes/ENRICHERS_PLAN.md`, or a description from the user). If no
   plan is given, ask for one.
2. **Research**:
   - Read the plan fully, plus any docs/requirements it references.
   - Check available labels with `gh label list` — never invent new labels;
     labels only categorize (`backend`, `ui`, `devops`, …), they do not group
     the batch.
   - List existing milestones with
     `gh api "repos/{owner}/{repo}/milestones" --jq '.[].title'` to pick a
     distinct milestone name and avoid duplicating an existing batch.
   - Skim recent issues (`gh issue list --state all --limit 20`) to avoid
     duplicating existing work and to stay consistent with the naming style.
3. **Breakdown proposal**: choose a milestone name for the batch, then split the
   plan into PR-sized issues. Present the user a table — milestone name at the
   top, then per issue: order, title, labels, dependencies, one-line scope — and
   **wait for confirmation before creating anything**. Creating a milestone and
   issues is an outward-facing action.
4. **Creation**: after confirmation:
   1. Create the milestone first (it must exist before issues can reference it):
      `gh api "repos/{owner}/{repo}/milestones" -f title="<Milestone>" -f description="<one-line summary + link to the source plan>"`.
   2. Create the issues **in dependency order** (so earlier ones can be
      referenced), each assigned to the milestone. Write each body to a
      temporary file (outside the project workspace, e.g. in `/tmp` or the
      agent's scratch folder) and run:
      `gh issue create --title "<title>" --label "<a,b>" --milestone "<Milestone>" --body-file <file>`.
      **CRITICAL**: Never write temporary files or issue-creation helper scripts
      to the project workspace (such as `docs/plans/issues` or
      `docs/plans/create_issues.sh`), as this pollutes the repository. If any
      scripts are needed to automate or batch create issues, save them inside
      the skill folder (`.agents/skills/gh-issue-creator/scripts/`) or the
      scratch directory so they can be reused without polluting the workspace.
5. **Report**: give the milestone URL and the created issue numbers and URLs.
   Offer the handoff: `gh-issue-solver` can implement the whole milestone with
   `--start --milestone "<Milestone>"`.

## Issue format

**Milestone**: the batch name (e.g. `CI-Image`) — this is what groups the issues
and what `gh-issue-solver` consumes.

**Title**: `[<Milestone> <n>] <imperative summary>` — e.g.
`[Enrichers 3] Pseudoword generator for isReal=false rows`. The milestone-name
prefix plus `n` gives a human-readable execution order; the machine grouping is
the assigned milestone.

**Body template** (omit sections that don't apply):

```markdown
> **<milestone> step <n>.** Depends on `[<Milestone> <m>]`. <Scope qualifier,
> e.g. "Analysis only, no code." if applicable.>

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

What intentionally belongs to sibling issues — reference them by
`[<Milestone> <m>]`.
```

## Standards

- **English only** — translate plan content; keep code identifiers, file paths,
  and domain terms as-is.
- **One milestone ≈ one plan**: the milestone groups exactly the issues for one
  plan/batch; `gh-issue-solver` implements it as a unit.
- **One issue ≈ one PR**: independently implementable and reviewable. Don't
  merge unrelated plan items; don't split below a meaningful unit of work.
- **Group by milestone, not labels**: every issue in the batch is assigned to
  the milestone. Labels only categorize and use existing ones (`backend`,
  `database`, `ui`, `scripts`, `research`, `infra`, `devops`, `enhancement`, …).
  Ask before creating a new label.
- **Reference siblings by `[<Milestone> <m>]`**, not by issue number — numbers
  are unknown until creation.
- **Traceability**: put the source plan file in the milestone description and in
  the first issue of the batch (or each issue if the plan may change).
- **Never create the milestone or issues without explicit user confirmation** of
  the proposed breakdown.
