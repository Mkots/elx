---
id: "REQ-QUALITY-GATES"
type: requirement
name: "Automated quality gates and requirement traceability"
specification: >
  The project SHALL block merges when automated checks (format, lint, tests, E2E) fail or when
  requirement traceability is broken (uncovered requirements, dangling or broken links).
status: accepted
refines:
  - "SOL-LEXTALE"
---

# Automated Quality Gates and Requirement Traceability

Source:
[`tech-details/test-tech-stack.md`](../../tech-details/test-tech-stack.md). Tool
selection is justified by
[ADR-TEST-TRACEABILITY](../decisions/ADR-TEST-TRACEABILITY.md).

## Requirements

1. **CI gates:** failures in `deno fmt --check`, `deno lint`, `deno test`,
   `deno coverage`, or Playwright E2E block merges.
2. **SARA traceability:** keep the requirement-to-ADR/design-to-test graph
   current. `sara check` validates duplicate IDs, dangling links, and cycles;
   `sara report coverage` reports coverage. A failed check blocks merges.
3. **Coverage:** every non-deferred requirement eventually receives a
   `verification` test related through `verifies`.

## Acceptance Criteria

- `sara check` and all tests pass on the branch before merging.
- Requirements with `status: deferred` are excluded from mandatory coverage.
