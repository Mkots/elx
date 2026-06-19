---
id: "VER-APP-ROUTE"
type: verification
name: "App index and healthcheck route integration tests"
method: itest
verifies:
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-OBSERVABILITY"
---

# Verification: App Route Integration Tests

Covers the index and health check endpoints against [REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md) and [REQ-OBSERVABILITY](../requirements/REQ-OBSERVABILITY.md).

## Code under verification

- `app.ts` — contains the Hono application definition, including routes for the homepage and health checks.

## Tests

- `tests/app_test.ts` (`deno test` + Hono app.request):
  - GET / returns server-rendered HTML;
  - GET /health returns service status.

## Requirement coverage

- _Server rendering_ — GET `/` returns server-rendered HTML with the homepage heading and description.
- _Healthcheck_ — GET `/health` returns service status metadata used by external monitors.
