---
name: plan-brainstorm
description: Refines an abstract plan or idea into a strict development plan through an interactive brainstorm with the user. Use this when the user has a rough plan (e.g. pipeline/notes/ENRICHERS_PLAN.md) or a vague feature idea and wants to turn it into a concrete, issue-ready dev plan by answering clarifying questions.
---

# Plan Brainstorm Skill

Takes an abstract plan (a `*_PLAN.md` file or a spoken idea) and turns it into a
strict development plan through a question-driven brainstorm with the user. The
output plan is directly convertible into GitHub issues by the `gh-issue-creator`
skill.

## Workflow

1. **Input**: identify the source plan (file path or user description). If none
   is given, ask for one.
2. **Ground in reality** (before asking the user anything):
   - Read the source plan fully.
   - Verify its claims against the current repo — plans go stale. Check the
     files, tables, tasks, and docs it mentions (`docs/data-model.md`,
     `docs/roadmap/`, `docs/requirements/`, actual code). Note every mismatch.
   - Collect what is already decided elsewhere (requirements, past issues,
     AGENTS.md) so you don't re-ask settled questions.
3. **Brainstorm loop** — one round at a time:
   - Ask **3–7 numbered questions** per round, most important first. Only ask
     questions whose answers change scope, order, or design — not things you can
     find in the repo yourself.
   - For every question offer a **recommended default** so the user can reply
     tersely ("1a, 2 yes, 3 later").
   - Cover, over the rounds: scope (in/out, MVP vs later), ordering and
     dependencies, acceptance criteria, data/schema impact, migration needs,
     edge cases, and anything the source plan left as "TBD" or hand-waved.
   - Record each answer as a **decision**; unanswered items become explicit
     **open questions** or **deferred** items. Stop when new questions stop
     changing the plan — usually 1–3 rounds; don't drag it out.
4. **Write the dev plan**:
   - Default location `docs/plans/<kebab-topic>-dev-plan.md` (confirm with the
     user; they may prefer it next to the source plan).
   - Write it in **English** — it feeds directly into issue creation.
   - Do not modify the source plan; link to it instead.
5. **Handoff**: offer to run `gh-issue-creator` on the new plan.

## Dev plan format

```markdown
# <Topic> — Development Plan

Source: <path to abstract plan>. Series tag: `[<Series>]`.

## Goal

One paragraph: what will exist when this is done, and how we know it works.

## Decisions

Numbered list of decisions fixed during the brainstorm (with a short "why").
Implementers must not relitigate these.

## Work items

One subsection per future issue, in execution order:

### <n>. <Imperative title>

- **Depends on**: <items or "—">
- **Context**: current state, why needed (concrete files/tables).
- **Deliverable**: numbered concrete outputs.
- **Acceptance criteria**: verifiable checklist (code items: `deno task ci`
  green).

## Out of scope

What was explicitly cut or deferred, and why.

## Open questions

Only questions that don't block the first work items; each with an owner or a
trigger for when it must be answered.
```

## Standards

- **Verify before asking**: never ask the user something the repo already
  answers; never carry a stale claim from the source plan into the dev plan.
- **Questions must be decidable**: each one concrete, with options and a
  recommended default — not "what do you think about X?".
- **Every work item is PR-sized** and has acceptance criteria; if you can't
  write criteria for an item, it isn't specified enough — ask another question
  or move it to open questions.
- **Decisions are traceable**: the Decisions section is the contract; work items
  must not contradict it.
- **English output, user-language conversation**: discuss with the user in their
  language; write the dev plan in English.
- **Don't start implementing** — this skill ends at the written plan and the
  handoff offer.
