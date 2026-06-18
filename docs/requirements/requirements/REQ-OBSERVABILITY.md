---
id: "REQ-OBSERVABILITY"
type: requirement
name: "Observability"
specification: >
  The system SHALL expose a GET /health endpoint for an external uptime monitor, SHALL emit
  structured JSON logs to stdout, SHALL report runtime exceptions to Sentry, and SHALL rely on
  DigitalOcean Monitoring for droplet metrics and alerts.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DEPLOYMENT"
---

# Observability

Source:
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md). The
minimum sufficient MVP stack is justified by [ADR-HOSTING](../decisions/ADR-HOSTING.md).

## Requirements

1. **Healthcheck:** expose `GET /health` to an external uptime monitor.
2. **Logs:** emit structured JSON to stdout through Hono logger middleware. On
   the Droplet, use Docker's json-file driver with `max-size` and `max-file`
   rotation.
3. **Errors:** report runtime exceptions to Sentry through its Deno SDK.
4. **Metrics and alerts:** use built-in DigitalOcean Monitoring for CPU, RAM,
   and disk. Defer APM and Prometheus.

## Acceptance Criteria

- The external monitor detects service failure through `/health`.
