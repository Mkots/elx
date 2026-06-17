# Architecture Decision Records (ADRs)

Key architectural decisions for the ELX project. Each decision is recorded as an ADR with context, decision, and consequences.

## Active Decisions

| ID | Decision | Justifies |
|----|----------|-----------|
| [ADR-DATABASE](ADR-DATABASE.md) | PostgreSQL + Drizzle ORM | REQ-DATA-PERSISTENCE |
| [ADR-HOSTING](ADR-HOSTING.md) | One DigitalOcean Droplet + Docker Compose | REQ-DEPLOYMENT, REQ-BACKUPS, REQ-OBSERVABILITY |
| [ADR-OFFLINE-QUESTION-BANK](ADR-OFFLINE-QUESTION-BANK.md) | Offline question bank generation, read-only at runtime | REQ-QUESTION-BANK, REQ-DATA-PERSISTENCE |
| [ADR-SESSION-STORE](ADR-SESSION-STORE.md) | Session storage: Deno KV | REQ-SESSION-STATE |
| [ADR-SSR-ARCHITECTURE](ADR-SSR-ARCHITECTURE.md) | Deno + Hono, SSR/MPA instead of SPA | REQ-SSR-STAGE-FLOW, REQ-VERIFICATION-SCORING |
| [ADR-TEST-TRACEABILITY](ADR-TEST-TRACEABILITY.md) | deno test + Playwright + SARA | REQ-QUALITY-GATES |

## Superseded

| ID | Decision | Superseded By |
|----|----------|---------------|
| [ADR-OFT-TRACEABILITY](ADR-OFT-TRACEABILITY.md) | OpenFastTrace for traceability | ADR-TEST-TRACEABILITY |
