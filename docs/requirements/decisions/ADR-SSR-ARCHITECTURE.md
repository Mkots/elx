---
id: "ADR-SSR-ARCHITECTURE"
type: decision
name: "Architecture: Deno + Hono, SSR/MPA instead of SPA"
status: accepted
justifies:
  - "REQ-SSR-STAGE-FLOW"
  - "REQ-VERIFICATION-SCORING"
---

# Deno + Hono, SSR/MPA Instead of SPA

## Context

The scored vocabulary test needs simplicity and protection against client-side
tampering. Source:
[`tech-details/tech-stack.md`](../../tech-details/tech-stack.md).

## Decision

Use SSR/MPA on **Deno + Hono** instead of an SPA. Server-side JSX produces
complete HTML, while HTML forms and `302` redirects drive stage transitions.
Logic, scoring, and state remain entirely on the server, with minimal
client-side JavaScript.

## Consequences

- **+** Prevents client-side score tampering, avoids shipping scoring logic to
  the browser, and makes rendering easy to test as an HTML string.
- **-** Every action requires a server round trip, which limits rich
  interactivity.
