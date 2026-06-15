---
id: "REQ-SESSION-STATE"
type: requirement
name: "Session state (Deno KV)"
specification: >
  The system SHALL bind each test run to a sessionId cookie and SHALL store intermediate
  progress (selected words, partial scores) in Deno KV, whose backing file MUST live on a
  persistent path that survives redeploys.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DEPLOYMENT"
---

# Session State (Deno KV)

Sources: [`tech-details/tech-stack.md`](../../tech-details/tech-stack.md),
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md).
Justification: [[ADR-SESSION-STORE]].

## Requirements

1. **Session identification:** store `sessionId` in a cookie and use it to
   restore state between requests.
2. **Progress storage:** store selected words and partial scores in Deno KV
   under the `sessionId`.
3. **Persistence:** in the single-instance deployment with Deno KV's SQLite
   backend, place the KV file on a persistent bind mount or volume outside the
   container so it survives redeployments; see [[REQ-DEPLOYMENT]].

## Acceptance Criteria

- A redeployment does not reset active sessions.
