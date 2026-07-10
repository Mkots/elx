# SARA Item Patterns

Use these patterns only when creating or structurally changing items under
`docs/requirements/`.

## Model Summary

| Type           | Prefix | Directory        | Primary relations                  |
| -------------- | ------ | ---------------- | ---------------------------------- |
| `solution`     | `SOL`  | `solutions/`     | none                               |
| `requirement`  | `REQ`  | `requirements/`  | `refines`, optional `depends_on`   |
| `decision`     | `ADR`  | `decisions/`     | `justifies`, optional `supersedes` |
| `verification` | `VER`  | `verifications/` | `verifies`                         |

Allowed statuses:

- Requirement: `accepted`, `deferred`.
- Decision: `accepted`, `superseded`.
- Verification method: `utest`, `itest`, `e2e`, or a similarly concise method
  already used in existing files.

## Requirement Template

```markdown
---
id: "REQ-NEW-CAPABILITY"
type: requirement
name: "Short capability name"
specification: >
  The system SHALL describe the externally observable obligation in one
  testable statement.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-EXISTING-PREREQUISITE"
---

# Short Capability Name

Source: [`roadmap/example.md`](../../roadmap/example.md).

## Requirements

1. Concrete behavior or constraint.

## Acceptance Criteria

- Observable outcome that implementation and tests can verify.
```

## Decision Template

```markdown
---
id: "ADR-NEW-DECISION"
type: decision
name: "Decision: concise title"
status: accepted
justifies:
  - "REQ-AFFECTED-CAPABILITY"
---

# Concise Decision Title

## Context

Why a decision is needed. Link source material, existing docs, or code.

## Decision

State the selected approach.

## Consequences

- **+** Benefit.
- **-** Trade-off.
```

## Verification Template

```markdown
---
id: "VER-NEW-COVERAGE"
type: verification
name: "Concise test coverage name"
method: itest
verifies:
  - "REQ-AFFECTED-CAPABILITY"
---

# Verification: Concise Test Coverage Name

## Code under verification

- `path/to/file.ts` - implemented behavior.

## Tests

- `tests/example_test.ts`:
  - assertion covered by the test.

## Requirement coverage

- _Requirement phrase_ - how the assertions verify it.
```

## Targeted Search Recipes

Find requirement items by behavior:

```bash
rg -n "stage 2|verification|score|ticket|admin|session" docs/requirements
```

Find references to a specific code/test file:

```bash
rg -n "routes/stage2.ts|tests/stage2_route_test.ts" docs/requirements
```

Inspect one item's graph without SARA CLI:

```bash
rg -n "REQ-WORD-SELECTION|VER-STAGE1-ROUTE|ADR-SSR-ARCHITECTURE" docs/requirements
```
