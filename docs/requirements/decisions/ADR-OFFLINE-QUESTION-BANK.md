---
id: "ADR-OFFLINE-QUESTION-BANK"
type: decision
name: "Offline question bank generation, read-only at runtime"
status: accepted
justifies:
  - "REQ-QUESTION-BANK"
  - "REQ-DATA-PERSISTENCE"
---

# Offline Question Bank Generation

## Context

Questions, distractors, and definitions can come from external APIs such as
Datamuse and dictionary services. Calling them at runtime adds latency,
flakiness, and dependence on third-party availability. Source:
[`tech-details/tech-stack.md`](../../tech-details/tech-stack.md).

## Decision

Generate and validate the entire bank **in advance with offline seeder scripts**
and store it in PostgreSQL. The user request path only performs `SELECT`
queries.

## Consequences

- **+** Deterministic tests, low latency, independence from third-party
  services, and one-time distractor quality validation.
- **-** Updating the bank is a separate offline process run as a one-off release
  job.
