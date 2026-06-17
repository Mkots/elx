---
name: gh-issue-solver
description: Automates the end-to-end workflow of resolving GitHub issues. Use this to list open issues, select one to work on, create a branch/PR, and implement the necessary changes.
globs: ["**/*"]
alwaysApply: false
---

# GitHub Issue Solver Skill

This skill provides a semi-autonomous workflow for resolving GitHub issues in this repository.

## Workflow

1.  **Discovery**: List open issues using `gh issue list`.
2.  **Selection**: Prompt the user to choose an issue ID.
3.  **Preparation**:
    *   Fetch issue details: `gh issue view <id>`.
    *   Generate branch name: `deno run -A skills/gh-issue-solver/scripts/issue_helper.ts --action branch-name --title "<title>" --number <id>`.
    *   Create and switch to branch: `git checkout -b <branch-name>`.
4.  **Implementation**:
    *   Analyze the issue and create a plan.
    *   Execute the Plan-Act-Validate cycle.
    *   **Validation**: You MUST run `deno task ci` to ensure all tests, linting, and formatting pass.
5.  **Submission**:
    *   Commit changes.
    *   Create a Pull Request: `gh pr create --fill`. The PR should automatically close the issue (include "Closes #<id>" in the description if `--fill` doesn't do it).

## Standards

- **Branch Naming**: Always use the format `issue-<number>-<description>`.
- **Quality Gate**: Never create a PR if `deno task ci` fails.
- **Semi-Autonomous**: Ask the user to confirm the selected issue before starting, then work autonomously until the PR is ready or a major blocker is encountered.

## Commands

- `gh issue list`: View open issues.
- `gh issue view <id>`: Get details for a specific issue.
- `deno task ci`: Run the full CI suite (fmt, lint, check, tests).
- `gh pr create --fill`: Create a PR using metadata from the branch and issue.
