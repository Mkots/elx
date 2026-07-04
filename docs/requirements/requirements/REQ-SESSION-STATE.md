---
id: "REQ-SESSION-STATE"
type: requirement
name: "Session state (PostgreSQL)"
specification: >
  The system SHALL bind each test run to a sessionId cookie and SHALL store intermediate
  progress and final scores in PostgreSQL so session state survives redeploys and
  remains queryable with the rest of the test data.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DEPLOYMENT"
---

# Session State (PostgreSQL)

Sources: [`tech-details/tech-stack.md`](../../tech-details/tech-stack.md),
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md).
Justification: [ADR-SESSION-STORE](../decisions/ADR-SESSION-STORE.md). Current
decision:
[ADR-SESSION-STORE-POSTGRES](../decisions/ADR-SESSION-STORE-POSTGRES.md).

## Requirements

1. **Session identification:** store `sessionId` in a cookie and use it to
   restore state between requests.
2. **Progress storage:** store selected words, per-item answers, partial state,
   final scores, and truthfulness under the `sessionId` in PostgreSQL.
3. **Persistence:** public test sessions and admin sessions SHALL survive
   redeployments through PostgreSQL persistence; see
   [REQ-DEPLOYMENT](REQ-DEPLOYMENT.md).

## Acceptance Criteria

- A redeployment does not reset active sessions.
- Admin sessions expire according to their database `expires_at` timestamp.
