---
id: "REQ-SSR-STAGE-FLOW"
type: requirement
name: "SSR rendering and stage flow"
specification: >
  The system SHALL render pages server-side (JSX via Hono) with minimal client JS, SHALL drive
  stage transitions via HTML forms (GET renders, POST validates and updates session, then 302
  redirect to the next stage), and SHALL perform all answer validation and scoring on the server.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-SESSION-STATE"
---

# SSR Rendering and Stage Flow

Source: [`tech-details/tech-stack.md`](../../tech-details/tech-stack.md).
Justification: [[ADR-SSR-ARCHITECTURE]].

## Requirements

1. **Server rendering:** render HTML on the server through Hono JSX. Use minimal
   Vanilla JS only for simple effects, and keep the application fully functional
   without JavaScript.
2. **GET/POST/302 flow:** `GET /stage/:id` renders; `POST /stage/:id` accepts
   the form, processes it on the server, updates session state, and returns a
   `302` to `/stage/:id+1`.
3. **Server validation and anti-tampering:** validate all answers and calculate
   and store scores and state only on the server.
4. **Optional challenges:** let the user start them after the core Stages 1-2.

## Acceptance Criteria

- The test can be completed without client-side JavaScript.
- The client does not participate in scoring.
