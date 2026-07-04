---
id: "ADR-SESSION-STORE-POSTGRES"
type: decision
name: "Session storage: PostgreSQL"
status: accepted
justifies:
  - "REQ-SESSION-STATE"
supersedes:
  - "ADR-SESSION-STORE"
---

# Session Storage: PostgreSQL

## Context

ELX already uses PostgreSQL for tickets, questions, scores, and admin views.
Keeping runtime sessions in a second store made local development, deployment,
inspection, and cleanup harder. Test sessions also became research data once
stage progress and answers started being recorded.

## Decision

Store public test sessions in `test_sessions` and item answers in
`test_answers`. Store admin login sessions in `admin_sessions` with an
`expires_at` timestamp. Expired admin sessions are purged during login/auth
checks; abandoned public test sessions are retained as research data.

## Consequences

- **+** PostgreSQL is the single state store for app data, user progress, admin
  sessions, and analytics.
- **+** Session rows are visible to SQL tools and can be backed up with the rest
  of the application data.
- **+** Admin session expiry is enforceable without a separate runtime store.
- **-** Anonymous test sessions now create durable rows even when abandoned;
  this is accepted because abandoned sessions are useful funnel data.
