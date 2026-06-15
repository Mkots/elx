---
id: "ADR-HOSTING"
type: decision
name: "Hosting: one DigitalOcean Droplet + Docker Compose"
status: accepted
justifies:
  - "REQ-DEPLOYMENT"
  - "REQ-BACKUPS"
  - "REQ-OBSERVABILITY"
---

# One DigitalOcean Droplet + Docker Compose

## Context

The MVP needs minimal cost and as few moving parts as possible. Source:
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md).

## Decision

Host everything on **one DigitalOcean Droplet** in one **Docker Compose**
project: `app` (Deno/Hono), `caddy` (reverse proxy with automatic Let's Encrypt
HTTPS), and `postgres`. Provision with `cloud-init`. Manage backups with
`pg_dump` to DO Spaces. Use structured logs, Sentry, DO Monitoring, and an
external uptime monitor for observability.

## Deliberately Excluded

- **k3s/Kubernetes/DO App Platform:** excessive for one node; retain it as a
  future upgrade path.
- **DO Managed Database:** too expensive for the MVP; a Postgres container and
  `pg_dump` to Spaces are sufficient.
- **Terraform/Pulumi:** premature; `cloud-init` and Compose are sufficient.

## Consequences

- **+** Inexpensive, simple, and quick to deploy over SSH.
- **-** One node is a single point of failure; horizontal scaling will require
  revisiting this decision.
