---
id: "REQ-DATA-PERSISTENCE"
type: requirement
name: "Persistent data storage (PostgreSQL + Drizzle)"
specification: >
  The system SHALL store the question bank and test history in PostgreSQL via Drizzle ORM,
  apply the schema through migrations as a separate release step, and at runtime perform only
  SELECT queries.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DEPLOYMENT"
---

# Persistent Data Storage (PostgreSQL + Drizzle)

Sources: [`tech-details/tech-stack.md`](../../tech-details/tech-stack.md),
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md).
Justification: [ADR-DATABASE](../decisions/ADR-DATABASE.md) and [ADR-OFFLINE-QUESTION-BANK](../decisions/ADR-OFFLINE-QUESTION-BANK.md).

## Requirements

1. **Database schema:** use Drizzle to model words with reality and difficulty,
   correct answers, distractors, synonym and antonym dictionaries, definitions,
   context sentences, and test history.
2. **Runtime reads:** the user request path performs only `SELECT` queries.
   Seeders in [REQ-QUESTION-BANK](REQ-QUESTION-BANK.md) and test history recording perform writes.
3. **Migrations:** run Drizzle Kit `generate` and `migrate` as a separate
   release step, not during application startup.

## Acceptance Criteria

- The schema is versioned and applied through migrations.
- The database port is not exposed publicly; only the application can access it
  over the internal Compose network.
