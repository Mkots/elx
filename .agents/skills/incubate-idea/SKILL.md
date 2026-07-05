---
name: incubate-idea
description: Automates the pipeline of taking a raw idea or feature description, researching its repository impact, aligning with the user, and producing a structured, token-optimized development plan.
---

# Idea Incubator & Pipeline Skill

This skill automates the workflow of taking an abstract idea (e.g., from
`docs/idea.md` or a chat prompt) and turning it into a structured, issue-ready,
token-optimized development plan under `docs/plans/`.

It is a thin wrapper around the `plan-brainstorm` skill: `incubate-idea` adds an
isolated repository-research phase up front and a token-optimization pass on
top, then **delegates the interactive brainstorm and the actual dev-plan
authoring to `plan-brainstorm`**. Do not re-implement the brainstorm loop or the
dev-plan format here — invoke `plan-brainstorm` and let it own that.

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
   - This proposal is not the deliverable — it is the seed you hand to
     `plan-brainstorm` in the next step.

4. **Brainstorm & Author the Plan — delegate to `plan-brainstorm`**:
   - **MANDATORY**: Invoke the `plan-brainstorm` skill to run the interactive
     brainstorm loop and write the dev plan. Do not run your own question loop
     or hand-write the plan file here.
   - Hand it the research summary (step 2) and the technical proposal (step 3)
     as **ground truth** so it does not re-ask or re-derive what research
     already settled — `plan-brainstorm`'s "Ground in reality" step should
     consume these instead of re-reading the repo from scratch.
   - Let `plan-brainstorm` own: the numbered-questions-with-defaults rounds, the
     Decisions/Work items/Open questions structure, the
     `docs/plans/<kebab-name>-dev-plan.md` output path, and its formatting
     standards.

5. **Token-Optimization Pass (this skill's added value)**:
   - After `plan-brainstorm` has written the dev plan, extend **each work item**
     with a **Token-Saving Checklist**:
     - _Subagent Instruction_: Specify if the item should be implemented by a
       subagent (using `self` sandbox).
     - _Targeted Verification_: State the exact commands to run for verification
       (e.g., `deno test tests/unit_name_test.ts` or `deno lint ui/pages/`),
       reminding future agents _not_ to run verbose global commands like
       `deno task ci` until the final step.
   - This is the one part of the plan format that `plan-brainstorm` does not
     produce on its own; everything else in the file stays as `plan-brainstorm`
     wrote it.

6. **Handoff**:
   - Offer to run the `gh-issue-creator` skill to turn the dev plan into
     structured, dependency-linked GitHub issues. (`plan-brainstorm` also offers
     this handoff; make it once, not twice.)

## Standards & Formatting

The dev-plan path, structure, granularity, language, and traceability rules are
owned by `plan-brainstorm` (see its "Dev plan format" and "Standards" sections)
— follow those rather than restating them. This skill only adds:

- **Research-first**: never enter the brainstorm without the step-2 research
  summary; that is what keeps the brainstorm from re-reading the repo.
- **Token-Saving Checklist**: every work item must carry one (see step 5). A
  plan produced by this skill is incomplete without it.
