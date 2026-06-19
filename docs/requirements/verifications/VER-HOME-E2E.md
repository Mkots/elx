---
id: "VER-HOME-E2E"
type: verification
name: "Homepage and healthcheck end-to-end browser tests"
method: e2e
verifies:
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-OBSERVABILITY"
---

# Verification: Homepage and Healthcheck End-to-End Tests

Covers home page rendering and start button navigation in a real browser against [REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md) and [REQ-OBSERVABILITY](../requirements/REQ-OBSERVABILITY.md).

## Code under verification

- `app.ts` — handles home page SSR and health check endpoints.

## Tests

- `tests/e2e/home.spec.ts` (Playwright E2E):
  - home page renders heading and start button;
  - start test button navigates to stage 1;
  - health endpoint returns ok.

## Requirement coverage

- _Server rendering_ — browser successfully renders homepage titles and CTA button with correct CSS.
- _GET/POST/302 flow_ — clicking the start button performs a redirection to `/stage/1`.
- _Healthcheck_ — automated API clients can verify backend health status via `/health`.
