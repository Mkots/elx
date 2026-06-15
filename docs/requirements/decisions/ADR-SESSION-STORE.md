---
id: "ADR-SESSION-STORE"
type: decision
name: "Session storage: Deno KV"
status: accepted
justifies:
  - "REQ-SESSION-STATE"
---

# Session Storage: Deno KV

## Context

Test progress, including selected words and partial scores, must be stored
temporarily and associated with a session. Sources:
[`tech-details/tech-stack.md`](../../tech-details/tech-stack.md),
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md).

## Decision

Use built-in **Deno KV**, backed by local SQLite in the single deployed
instance. Store the KV file on a persistent path that survives redeployments.

## Consequences

- **+** No additional infrastructure, native runtime support, and a good fit for
  ephemeral session state.
- **-** Sessions cannot scale horizontally. Moving beyond one instance will
  require a separate KV backend, which is deliberately deferred for the MVP.
