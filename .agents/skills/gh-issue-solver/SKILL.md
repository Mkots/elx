---
name: gh-issue-solver
description: Automates the end-to-end workflow of resolving GitHub issues. Use this to list open issues, select one to work on, create a branch, implement the fix, and open a PR that closes the issue.
---

# GitHub Issue Solver Skill

Semi-autonomous workflow for resolving GitHub issues in this repository.

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
   `deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --start [--label <label>]`.
   This loads the open-issue queue into `state.json` and checks out the branch
   for the next issue (or resumes `currentIssue` if one is already in progress).
2. **Implementation**: analyze the issue and implement the fix on the
   checked-out branch. Iterate with `deno task ci` locally until it passes.
3. **Submit**: run
   `deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --submit`.
   This runs `deno task ci`, commits and pushes, opens the PR (with
   `Closes #<id>`), waits for GitHub Actions checks, and merges the PR once
   green. It then automatically advances to the next queued issue.
4. **Status / recovery**: use `--status` to inspect `currentIssue`,
   `remainingIssues`, and `completedIssues`; `--skip` to abandon the current
   issue and move to the next one; `--reset` to clear the queue entirely.

## Standards

- **Branch naming**: `issue-<number>-<kebab-description>` — lowercase, digits
  and hyphens only (e.g. `issue-42-fix-stage2-redirect`). The script derives
  this automatically from the issue title.
- **Quality gate**: `--submit` refuses to proceed if `deno task ci` fails.
- **Issue linking**: the PR body contains `Closes #<id>` so merging closes the
  issue automatically.
- **Autonomous merge**: `--submit` merges the PR itself once CI is green — there
  is no manual approval gate. This is by design for this skill; do not add a
  confirmation step around it.
- **State persistence**: `state.json` is the only source of truth for
  in-progress/queued/completed issues across invocations. Don't hand-edit it
  except via `--reset`/`--skip`.
