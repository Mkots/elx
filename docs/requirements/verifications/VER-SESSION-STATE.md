---
id: "VER-SESSION-STATE"
type: verification
name: "Session ID parsing and cookie generation unit tests"
method: utest
verifies:
  - "REQ-SESSION-STATE"
---

# Verification: Session State Unit Tests

Covers sessionId extraction and cookie header assembly against [REQ-SESSION-STATE](../requirements/REQ-SESSION-STATE.md).

## Code under verification

- `session.ts` — contains helper functions `parseSessionId` and `sessionCookie` to manage HTTP cookie-based session identification.

## Tests

- `tests/session_test.ts` (`deno test`):
  - parseSessionId extracts sessionId from a simple cookie header;
  - parseSessionId finds sessionId among multiple cookies;
  - parseSessionId returns undefined when cookie header is null;
  - parseSessionId returns undefined when sessionId cookie is absent;
  - parseSessionId returns undefined for an empty sessionId value;
  - sessionCookie builds a correct Set-Cookie header.

## Requirement coverage

- _Session identification_ — `parseSessionId` and `sessionCookie` correctly extract and construct the `sessionId` cookies used to bind each test run to a session.
