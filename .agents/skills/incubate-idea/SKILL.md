---
name: incubate-idea
description: Automates the pipeline of taking a raw idea or feature description, researching its repository impact, aligning with the user, and producing a structured, token-optimized development plan.
---

# Idea Incubator & Pipeline Skill

This skill automates the workflow of taking an abstract idea (e.g., from
`docs/idea.md` or a chat prompt) and turning it into a structured, issue-ready,
token-optimized development plan under `docs/plans/`.

## Workflow

1. **Identify Input**:
   - Locate the source idea (e.g., a file under `docs/`, `pipeline/notes/`, or a
     prompt description).
   - If not provided, ask the user to supply the idea.

2. **Isolated Repo Research (Token-Saving Step)**:
   - **MANDATORY**: Spawn a `research` subagent (using `invoke_subagent`) to
     check the current repository files, database schema (`db/schema.ts`), and
     existing documentation.
   - The subagent must explore how the proposed feature fits into the current
     architecture (`app.ts`, `routes/`, `ui/`, `domain/`).
   - The subagent reports back a concise research summary:
     - Affected directories and files.
     - Database migration needs.
     - Known architectural constraints.
     - Existing tests that could be reused or extended.

3. **Draft Technical Proposal**:
   - Based on the subagent's research, draft a brief technical design.
   - Focus on data model changes, API routes, UI components, and test
     strategies.

4. **Align with the User**:
   - Present the proposal to the user.
   - Highlight any design trade-offs, open questions, or dependencies.
   - Use the `/grill-me` command or ask concrete, multi-choice questions to
     settle open decisions.

5. **Generate Token-Optimized Dev Plan**:
   - Create a file at `docs/plans/<kebab-name>-dev-plan.md`.
   - Organize the plan into independent, PR-sized work items.
   - **MANDATORY**: For each work item, add a **Token-Saving Checklist**:
     - _Subagent Instruction_: Specify if the item should be implemented by a
       subagent (using `self` sandbox).
     - _Targeted Verification_: State the exact commands to run for verification
       (e.g., `deno test tests/unit_name_test.ts` or `deno lint ui/pages/`),
       reminding future agents _not_ to run verbose global commands like
       `deno task ci` until the final step.

6. **Handoff**:
   - Offer to run the `gh-issue-creator` skill to turn the dev plan into
     structured, dependency-linked GitHub issues.

## Standards & Formatting

- **Dev Plan Path**: Save to `docs/plans/<kebab-name>-dev-plan.md`.
- **Language**: Discuss in the user's preferred language, but write the final
  dev plan in English.
- **Traceability**: Link back to the original idea file or prompt.
- **Granularity**: Keep each work item limited to a single logical change (e.g.,
  one database schema change + Drizzle generation, or one set of route
  handlers).
