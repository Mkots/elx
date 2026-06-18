---
id: "REQ-BACKUPS"
type: requirement
name: "Database backups"
specification: >
  The system SHALL back up PostgreSQL via scheduled pg_dump uploaded to DO Spaces with
  retention rotation, and restores from those dumps SHALL be verified periodically.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DEPLOYMENT"
  - "REQ-DATA-PERSISTENCE"
---

# Database Backups

Source:
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md). The
decision not to use a managed database is justified by
[ADR-HOSTING](../decisions/ADR-HOSTING.md).

## Requirements

1. **Postgres backup:** run `pg_dump` on a schedule in a container or on the
   host, upload dumps to S3-compatible DO Spaces, and rotate them by retention
   period.
2. **Restore verification:** periodically test restoration from a dump.

## Acceptance Criteria

- A tested restore procedure exists; an untested backup is not considered a
  valid backup.
