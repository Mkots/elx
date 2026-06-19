---
id: "REQ-ADMIN-PANEL"
type: requirement
name: "Admin panel and content management"
specification: >
  The system SHALL provide a secure administrator portal to manage words, challenges, and view or
  export test history.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-DATA-PERSISTENCE"
---

# Admin Panel and Content Management

Source: [`routes/admin.tsx`](../../routes/admin.tsx),
[`tests/admin_test.ts`](../../tests/admin_test.ts).

## Requirements

1. **Authentication:** restrict access to the `/admin` path to authenticated
   administrators only via session cookies.
2. **Dashboard:** show high-level metrics of the system, including total word
   counts, active challenges, and test history.
3. **Words Manager (CRUD):** let administrators view, search, filter, create,
   edit, and delete words (real or pseudowords) with their difficulty levels.
4. **Challenges Manager (CRUD):** let administrators view, create, edit, and
   delete optional challenge stages (synonyms, spelling, definitions).
5. **Test History & Export:** display completed test runs and let administrators
   search, sort, and export test history in CSV and JSON formats.

## Acceptance Criteria

- Unauthenticated users trying to access `/admin` are redirected to
  `/admin/login`.
- Changes made in the admin panel are immediately persisted in the database and
  visible in the application.
- Test history can be downloaded as CSV and JSON.
