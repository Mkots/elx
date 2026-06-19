---
id: "VER-ADMIN-ROUTE"
type: verification
name: "Admin panel routes and CRUD integration tests"
method: itest
verifies:
  - "REQ-ADMIN-PANEL"
  - "REQ-DATA-PERSISTENCE"
---

# Verification: Admin Panel Routes and CRUD Integration Tests

Covers admin panel access, authentication, words, challenges CRUD operations and history exporting against [REQ-ADMIN-PANEL](../requirements/REQ-ADMIN-PANEL.md) and [REQ-DATA-PERSISTENCE](../requirements/REQ-DATA-PERSISTENCE.md).

## Code under verification

- `routes/admin.tsx` — implements Hono route handlers for secure administrator interactions, dashboard rendering, content editing and data exporting.

## Tests

- `tests/admin_test.ts` (`deno test` + Hono app.request):
  - GET /admin redirects unauthenticated user to login;
  - GET /admin/login renders login page;
  - POST /admin/login handles authentication and session creation;
  - GET /admin/words lists words and filters them;
  - GET /admin/words/new renders edit form;
  - POST /admin/words/new validation and creation;
  - GET and POST /admin/words/:id/edit prefill and update;
  - POST /admin/words/:id/delete safe checks;
  - GET /admin/challenges lists synonyms, spelling, and definitions;
  - GET /admin/challenges/:type/new renders edit form;
  - POST /admin/challenges/:type/new validation and creation;
  - GET and POST /admin/challenges/:type/:id/edit prefill and update;
  - POST /admin/challenges/:type/:id/delete deletes challenges;
  - GET /admin/history lists and sorts/filters test sessions;
  - GET /admin/history/export exports CSV and JSON formats.

## Requirement coverage

- _Authentication_ — redirects unauthorized users attempting access to `/admin` paths to `/admin/login`.
- _Words and Challenges CRUD_ — handles data validation, creation, editing and deletion.
- _Test History & Export_ — lists test sessions, supports sorting/filtering, and provides CSV/JSON format export.
