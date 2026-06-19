---
id: "VER-STAGE2-ROUTE"
type: verification
name: "Stage 2 route integration tests"
method: itest
verifies:
  - "REQ-VERIFICATION-SCORING"
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-SESSION-STATE"
---

# Verification: Stage 2 Route Integration Tests

Covers the HTTP endpoint and card-by-card transition flow of the second stage of word verification against [REQ-VERIFICATION-SCORING](../requirements/REQ-VERIFICATION-SCORING.md), [REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md), and [REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md).

## Code under verification

- `routes/stage2.tsx` — implements Hono routes for GET and POST `/stage/2`, processing interactive word verification.

## Tests

- `tests/stage2_route_test.ts` (`deno test` + Hono app.request):
  - GET /stage/2 redirects to /stage/1 when no session cookie;
  - GET /stage/2 redirects to /stage/1 when word selection is empty;
  - GET /stage/2 returns HTML with the first verification card;
  - GET /stage/2 renders htmx Know/Don't know buttons;
  - POST /stage/2 redirects to /stage/1 when no session cookie;
  - POST /stage/2 htmx request stores answer and returns next card;
  - POST /stage/2 final htmx request stores result and sends HX redirect;
  - POST /stage/2 computes score and redirects to /result;
  - POST /stage/2 applies pseudoword penalty when pseudoword is claimed;
  - POST /stage/2 sets session cookie in response.

## Requirement coverage

- _Verification cards_ — GET/POST requests return individual cards with "Know"/"Don't know" buttons dynamically utilizing htmx.
- _Truthfulness score_ and _Scoring algorithm_ — POSTs correctly record answers on the server and apply pseudoword penalties during the final score calculation.
- _GET/POST/302 flow_ — GETs without valid session states redirect to `/stage/1`, and completing the stage redirects to `/result`.
