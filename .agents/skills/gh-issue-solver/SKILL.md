---
name: gh-issue-solver
description: Automates the end-to-end workflow of resolving GitHub issues. Use this to list open issues, select one to work on, create a branch, implement the fix, and open a PR that closes the issue.
---

# GitHub Issue Solver Skill

Semi-autonomous workflow for resolving GitHub issues in this repository.

## Workflow

1. **Selection**:
   - If the user already provided an issue number, skip to Preparation.
   - Otherwise list open issues with `gh issue list` and ask the user to pick
     one. Confirm the selected issue before starting work.
2. **Preparation**:
   - Fetch issue details: `gh issue view <id>`.
   - Ensure the working tree is clean (`git status`); stop and ask the user how
     to proceed if it isn't.
   - Branch from the up-to-date default branch:
     `git fetch origin <default-branch> && git checkout -b issue-<id>-<kebab-description> origin/<default-branch>`.
3. **Implementation**:
   - Analyze the issue, plan the change, implement it.
   - **Validation**: run `deno task ci` (fmt:check + lint + check + tests) and
     fix failures until it passes.
4. **Submission**:
   - Commit using the conventional commit format used in this repo (`feat:`,
     `fix:`, `build(deps):`, ...).
   - Push the branch: `git push -u origin <branch-name>`.
   - Create the PR with an explicit title and body — do not rely on `--fill`, it
     never adds issue links on its own:
     `gh pr create --title "<conventional title>" --body "<summary>` + blank
     line + `Closes #<id>"`.

## Standards

- **Branch naming**: `issue-<number>-<kebab-description>` — lowercase, digits
  and hyphens only (e.g. `issue-42-fix-stage2-redirect`).
- **Quality gate**: never create a PR if `deno task ci` fails.
- **Issue linking**: the PR body must contain `Closes #<id>` so merging closes
  the issue automatically.
- **Semi-autonomous**: confirm the selected issue with the user, then work
  autonomously until the PR is ready or a major blocker is encountered.
