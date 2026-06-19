---
id: "VER-STAGE1-E2E"
type: verification
name: "Stage 1 end-to-end browser tests"
method: e2e
verifies:
  - "REQ-WORD-SELECTION"
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-SESSION-STATE"
---

# Verification: Stage 1 End-to-End Tests

Covers real browser interaction with Stage 1 against
[REQ-WORD-SELECTION](../requirements/REQ-WORD-SELECTION.md),
[REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md), and
[REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md).

## Code under verification

- `routes/stage1.tsx` — implements Hono server-side JSX for Stage 1 word grid
  rendering.

## Tests

- `tests/e2e/stage1.spec.ts` (Playwright E2E):
  - stage 1 renders word grid with checkboxes;
  - stage 1 form submits and redirects to stage 2;
  - stage 1 sets sessionId cookie on submit;
  - stage 1 is accessible without JavaScript.

## Requirement coverage

- _Word bank_ and _Selection interface_ — browser renders 60 words in a
  responsive grid, with checkbox selectors.
- _Navigation_ and _GET/POST/302 flow_ — form submission triggers a POST which
  sets a `sessionId` cookie and returns a `302` redirect to `/stage/2`.
- _JavaScript-free accessibility_ — verified that Deno SSR/MPA architecture
  allows complete form flow operations without any client-side JavaScript
  enabled in the browser.
