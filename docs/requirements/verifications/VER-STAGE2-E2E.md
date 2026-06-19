---
id: "VER-STAGE2-E2E"
type: verification
name: "Stage 2 end-to-end browser tests"
method: e2e
verifies:
  - "REQ-VERIFICATION-SCORING"
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-SESSION-STATE"
---

# Verification: Stage 2 End-to-End Tests

Covers real browser interaction with Stage 2 and results viewing against [REQ-VERIFICATION-SCORING](../requirements/REQ-VERIFICATION-SCORING.md), [REQ-SSR-STAGE-FLOW](../requirements/REQ-SSR-STAGE-FLOW.md), and [REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md).

## Code under verification

- `routes/stage2.tsx` — implements Hono server-side JSX for Stage 2 interactive word verification.
- `routes/result.tsx` — renders the final score summary page.

## Tests

- `tests/e2e/stage2.spec.ts` (Playwright E2E):
  - stage 2 renders one verification card after stage 1 submission;
  - stage 2 shows Know and Don't know buttons;
  - stage 2 advances one htmx card at a time;
  - stage 2 result page shows score and truthfulness;
  - stage 2 is accessible without JavaScript;
  - /result redirects to /stage/2 after stage 1 but before stage 2.

## Requirement coverage

- _Verification cards_ — browser displays cards one by one with "Know" and "Don't know" options, utilizing HTMX to dynamically swap content.
- _Truthfulness score_ and _Scoring algorithm_ — completing all cards calculates scores and redirects to `/result` showing correct results.
- _JavaScript-free accessibility_ — verified that fallback HTML forms allow the entire verification flow to run properly when client-side JavaScript/HTMX is disabled.
- _GET/POST/302 flow_ — unauthorized entry or direct `/result` access without valid verification progress results in correct redirections.
