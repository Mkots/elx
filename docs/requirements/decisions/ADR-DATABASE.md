---
id: "ADR-DATABASE"
type: decision
name: "Database: PostgreSQL + Drizzle ORM"
status: accepted
justifies:
  - "REQ-DATA-PERSISTENCE"
---

# PostgreSQL + Drizzle ORM

## Context

The word bank, answers, dictionaries, and history need persistent storage with
strongly typed queries. Source:
[`tech-details/tech-stack.md`](../../tech-details/tech-stack.md).

## Decision

Use **PostgreSQL** as the DBMS and **Drizzle ORM** with the Deno `postgres`
driver for type-safe SQL queries. Manage the schema and migrations with Drizzle
Kit and apply them as a separate release step.

## Consequences

- **+** Mature relational database, strong typing, and explicit migrations.
- **-** Requires a running database in development, CI, and production, with
  environment parity through Docker Compose or Testcontainers.
