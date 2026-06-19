---
id: "VER-RESULT-ROUTE"
type: verification
name: "Result page route integration tests"
method: itest
verifies:
  - "REQ-VERIFICATION-SCORING"
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-SESSION-STATE"
---

# Verification: Result Page Route Integration Tests

Covers the HTTP endpoint and logic of the final test results page against
[REQ-VERIFICATION-SCORING](../requirements/REQ-VERIFICATION-SCORING.md),
[REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md), and
[REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md).

## Code under verification

- `routes/result.tsx` — implements Hono routes for GET `/result`, rendering the
  final results page with the computed score and truthfulness.

## Tests

- `tests/result_route_test.ts` (`deno test` + Hono app.request):
  - GET /result redirects to /stage/1 when no session cookie;
  - GET /result redirects to /stage/2 when no result in session;
  - GET /result renders score and truthfulness;
  - GET /result renders a link to restart.

## Requirement coverage

- _Result display_ — GET request returns server-rendered HTML showing the
  calculated final score and truthfulness metrics.
- _GET/POST/302 flow_ — GETs without valid session states or completed results
  redirect to the appropriate initial stages (`/stage/1` or `/stage/2`).
