---
id: "VER-STAGE1-ROUTE"
type: verification
name: "Stage 1 route integration tests"
method: itest
verifies:
  - "REQ-WORD-SELECTION"
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-SESSION-STATE"
---

# Verification: Stage 1 Route Integration Tests

Covers the HTTP endpoint and flow of the first stage of word selection against
[REQ-WORD-SELECTION](../requirements/REQ-WORD-SELECTION.md),
[REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md), and
[REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md).

## Code under verification

- `routes/stage1.tsx` — implements Hono routes for GET and POST `/stage/1`,
  displaying the word grid and handling submissions.

## Tests

- `tests/stage1_route_test.ts` (`deno test` + Hono app.request):
  - GET /stage/1 returns HTML with word grid;
  - GET /stage/1 renders a form that POSTs to /stage/1;
  - POST /stage/1 saves selection and redirects to /stage/2;
  - POST /stage/1 creates a new session cookie when none present;
  - POST /stage/1 handles empty selection (no words checked).

## Requirement coverage

- _Word bank_ and _Selection interface_ — GET request returns server-rendered
  HTML containing a grid of words with checkbox forms.
- _Navigation_ and _GET/POST/302 flow_ — POSTing selections responds with a
  `302` redirect to `/stage/2`, persisting selections in session state and
  creating new session cookies if none exist.
