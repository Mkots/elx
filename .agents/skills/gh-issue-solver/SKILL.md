---
name: gh-issue-solver
description: Automates the end-to-end workflow of resolving a milestone's GitHub issues. Use this to work through every open issue in a GitHub Milestone — select the milestone, then for each issue create a branch, implement the fix, and open a PR that closes it.
---

# GitHub Issue Solver Skill

Semi-autonomous workflow for resolving GitHub issues in this repository, driven
by a **GitHub Milestone**: you name a milestone once and the loop works through
all of its open issues in order (grouping is by milestone, not by label).

## MANDATORY: use `scripts/issue_loop.ts`

This skill MUST be executed through
`deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts`. It is not an
optional helper — it is the workflow. Do not reimplement its steps by hand
(manually running `gh issue list`, creating branches, opening PRs, merging,
etc.) as a substitute for calling the script.

**Hard stop condition**: if for any reason the script cannot or should not be
invoked at a required step (missing permissions, the agent judges the action
unsafe, the script errors in a way that isn't a normal fix-and-retry case,
etc.), the agent MUST stop all work immediately and report this to the user
instead of falling back to manual steps or improvising. Do not silently
downgrade to a manual workflow.

## Workflow

1. **Start**: run
   `deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --start --milestone "<Milestone title>"`.
   This loads every **open issue in that milestone** into the `state.json` queue
   (ordered by issue number, i.e. creation/dependency order) and checks out the
   branch for the next issue (or resumes `currentIssue` if one is already in
   progress). The milestone is required on the first `--start` of a batch and is
   persisted in `state.json`; later `--start`/`--submit`/`--skip` invocations
   reuse it automatically. Ask the user which milestone to work if none is given
   (`gh api "repos/{owner}/{repo}/milestones" --jq '.[].title'` lists open
   ones).
2. **Implementation**: analyze the issue and implement the fix on the
   checked-out branch.
   - **Subagent Sandboxing (Isolate Context)**: Mandatorily delegate the
     Plan-Act-Validate implementation phase to a `self` subagent (using
     `invoke_subagent`). The subagent does all the heavy reading, editing, and
     intermediate test runs in a sandboxed conversation, then reports back only
     the final diff/summary. This prevents all intermediate tokens from bloating
     the main chat thread.
   - **Targeted Debugging**: Instead of running `deno task ci` continuously, run
     only targeted commands (e.g., `deno test tests/specific_test.ts` and
     `deno lint paths/to/file.ts`) during local iterations to minimize stdout
     verbosity. Run `deno task ci` only as a final check or via the `--submit`
     command.
3. **Submit**: run
   `deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --submit`.
   This runs `deno task ci`, commits and pushes, opens the PR (with
   `Closes #<id>`), waits for GitHub Actions checks, and merges the PR once
   green. It then automatically advances to the next queued issue **in the same
   milestone** until the milestone is empty.
4. **Status / recovery**: use `--status` to inspect `currentIssue`,
   `remainingIssues`, and `completedIssues`; `--skip` to abandon the current
   issue and move to the next one; `--reset` to clear the queue entirely.

## Standards

- **Milestone-scoped**: the queue is exactly the open issues of one milestone;
  the loop never pulls issues from outside it. To work a different batch, finish
  or `--reset` the current milestone first, then
  `--start --milestone "<other>"`.
- **Branch naming**: `issue-<number>-<kebab-description>` — lowercase, digits
  and hyphens only (e.g. `issue-42-fix-stage2-redirect`). The script derives
  this automatically from the issue title.
- **Quality gate**: `--submit` refuses to proceed if `deno task ci` fails.
- **Issue linking**: the PR body contains `Closes #<id>` so merging closes the
  issue automatically.
- **Autonomous merge**: `--submit` merges the PR itself once CI is green — there
  is no manual approval gate. This is by design for this skill; do not add a
  confirmation step around it.
- **State persistence**: `state.json` is the only source of truth for the
  selected `milestone` and the in-progress/queued/completed issues across
  invocations. Don't hand-edit it except via `--reset`/`--skip`.
