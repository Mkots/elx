---
id: "VER-ADMIN-E2E"
type: verification
name: "Admin panel end-to-end browser tests"
method: e2e
verifies:
  - "REQ-ADMIN-PANEL"
  - "REQ-DATA-PERSISTENCE"
  - "REQ-SYNONYMS-ANTONYMS"
  - "REQ-SPELLING"
  - "REQ-MEANING"
---

# Verification: Admin Panel End-to-End Tests

Covers secure administrator flows, content updates, exports and sorting/searching within the admin interface against [REQ-ADMIN-PANEL](../requirements/REQ-ADMIN-PANEL.md), [REQ-DATA-PERSISTENCE](../requirements/REQ-DATA-PERSISTENCE.md), [REQ-SYNONYMS-ANTONYMS](../requirements/REQ-SYNONYMS-ANTONYMS.md), [REQ-SPELLING](../requirements/REQ-SPELLING.md), and [REQ-MEANING](../requirements/REQ-MEANING.md).

## Code under verification

- `routes/admin.tsx` — implements visual layouts and interfaces for administrator portal actions.

## Tests

- `tests/e2e/admin.spec.ts` (Playwright E2E):
  - unauthenticated users are redirected from /admin to /admin/login;
  - login with invalid credentials shows error message;
  - login with valid credentials, navigation, and logout;
  - Words CRUD cycle;
  - Data export downloads CSV and JSON files;
  - Challenges CRUD cycles (Synonyms, Spelling, Definitions);
  - Test History view, search and sort.

## Requirement coverage

- _Authentication_ — redirects unauthorized visitors to login, displaying correct login errors.
- _Dashboard and Navigation_ — provides working navigation links between Words, Challenges and History dashboards.
- _Words and Challenges CRUD_ — full end-to-end browser CRUD cycle (create, search, edit, verify changes, delete) on live PostgreSQL data.
- _Test History & Export_ — verifies completed runs, searches by session ID, sorts table and handles secure JSON/CSV downloads in the browser.
