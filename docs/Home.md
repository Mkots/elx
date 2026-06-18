# ELX Wiki

This wiki is synchronized from the repository `docs/` directory.

## Overview

ELX is a LexTALE-style English vocabulary assessment application. Users select
known words from a mix of real English words and pseudowords, then undergo
verification and scoring. Optional challenge stages test synonyms, antonyms,
spelling, and word meaning.

**Key architectural decisions:** Server-side rendering (Deno + Hono SSR/MPA),
offline-generated question bank (PostgreSQL), minimal client JavaScript.

## Quick Start

- [Project Idea](idea.md) — what ELX does and how it works
- [Technology Stack](tech-details/tech-stack.md) — Deno + Hono + PostgreSQL
  architecture
- [Requirements Index](requirements/README.md) — SARA-managed requirements with
  traceability

## Documentation

### [Roadmap](roadmap/index.md)

Development milestones organized as sequential stages:

| Stage | Name                        | Status      |
| ----- | --------------------------- | ----------- |
| 0     | Offline Database Seeding    | Implemented |
| 1     | Core LexTALE Word Selection | Implemented |
| 2     | Verification and Scoring    | Implemented |
| 3     | Synonyms and Antonyms       | Implemented |
| 4     | Contextual Spelling         | Implemented |
| 5     | Meaning (Definitions)       | Implemented |
| 6     | Semantic Usage              | Deferred    |

### [Requirements](requirements/requirements/index.md)

System requirements managed by SARA, organized by category:

- **Core Test Flow** — word selection, verification, scoring, session state
- **Optional Challenges** — synonyms, spelling, meaning, semantic usage
  (deferred)
- **Data & Infrastructure** — question bank, persistence, deployment, backups,
  observability

### [Architecture Decisions](requirements/decisions/index.md)

Key decisions including database (PostgreSQL + Drizzle), hosting (DO Droplet +
Docker Compose), session store (Deno KV), and architecture (SSR/MPA instead of
SPA).

### [Solutions](requirements/solutions/index.md)

Top-level product definitions —
[SOL-LEXTALE](requirements/solutions/SOL-LEXTALE.md) covers the full vocabulary
test scope.

### [Verifications](requirements/verifications/index.md)

Test coverage mapping seeder scripts to requirements via the `verifies`
relation.

### [Technical Details](tech-details/index.md)

Architecture, infrastructure, and tooling:

- [Technology Stack](tech-details/tech-stack.md) — runtime, framework, database,
  ORM
- [Operations Stack](tech-details/ops-tech-stack.md) — deployment, CI/CD,
  hosting, observability
- [Test Stack](tech-details/test-tech-stack.md) — testing pyramid and SARA
  traceability

## Requirements Model

Managed by [SARA](https://github.com/cledouarec/sara) with a custom lightweight
model (`requirements/model.yaml`):

| Type           | Prefix | Purpose                      |
| -------------- | ------ | ---------------------------- |
| `solution`     | SOL    | Entire product               |
| `requirement`  | REQ    | Independently developed unit |
| `decision`     | ADR    | Architecture decision record |
| `verification` | VER    | Test or coverage item        |

## Commands

```bash
cd requirements/
sara check                    # validate graph (CI gate)
sara report coverage          # requirement coverage
sara report matrix            # traceability matrix
sara query REQ-WORD-SELECTION # item relations
```
