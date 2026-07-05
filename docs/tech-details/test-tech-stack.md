# LexTALE Project Test Stack (Deno + SSR)

## Principle

The test stack follows the **Deno + SSR/MPA** architecture described in
[tech-stack.md](./tech-stack.md) instead of copying SPA/Node conventions. The
main consequences are:

- There is almost no client-side JavaScript, so client mock servers and
  hydration-based component runners are unnecessary.
- Logic, scoring, and rendering live on the server and can be covered by fast
  browserless unit and integration tests.
- External APIs such as Datamuse and dictionary services are called only by
  offline seeders, **not at runtime**, so application tests do not need to mock
  them.

## Test Pyramid

### 1. Unit / Integration: Built-in `deno test`

**This is the primary layer and contains most tests.** Deno's runner provides
TypeScript support, assertions (`@std/assert`), mocks and stubs
(`@std/testing/mock`), snapshots (`@std/testing/snapshot`), coverage
(`deno coverage`), and benchmarks (`deno bench`) out of the box. A third-party
runner such as Vitest is unnecessary because it adds npm/Vite compatibility for
features Deno already provides natively.

Coverage includes:

- **Scoring and penalties** for Stages 1-2, the most critical pure server-side
  logic.
- **Server-side form answer validation.**
- **Seeders** for Stage 0, including correct-answer unambiguity and distractor
  quality checks.

### 2. HTTP / Routes: Hono `app.request()`

Hono can test the application **without starting a server**:
`await app.request(new Request(...))` returns a `Response`. This is suitable for
checking:

- `GET /stage/:id` returns correct HTML.
- `POST /stage/:id` returns a `302` to the next stage and updates state.
- Edge cases such as a broken session or invalid form.

State:

- **Session state:** use the PostgreSQL-backed session helpers against a test
  database.
- **PostgreSQL:** use a real test database in Docker through Testcontainers or
  Docker Compose and run Drizzle migrations. This tests real SQL queries rather
  than imitations.

### 3. JSX Component Rendering

Server-side JSX renders to an HTML string and is not hydrated, so a component
runner is unnecessary. Call the render function and verify the result with:

- an HTML snapshot through `@std/testing/snapshot`, or
- DOM parsing and queries through [`deno-dom`](https://deno.land/x/deno_dom)
  (`@b-fuze/deno-dom`).

### 4. E2E: Playwright

This is the most valuable layer for the application because it checks the real
browser flow: word selection, form submission, `302` redirect, and final score.
It also verifies operation without JavaScript or with minimal Vanilla JS.

- Run it against a started Deno server in a separate process, as E2E is already
  out of process.
- Integrate it as a Node tool or through an `npm:` specifier in Deno.
- E2E tests run in CI using a custom, slim Docker image
  (`ghcr.io/mkots/elx-playwright:v1.61.0`).
- This image is Chromium-only to minimize download sizes, setup overhead, and
  build time in CI. It is based on the official Deno Debian image and installs
  only the Playwright Chromium browser and its system dependencies.
- The image is built and published to GHCR by
  `.github/workflows/image-playwright.yaml` on changes to
  `Dockerfile.playwright` or via manual dispatch.

> **Alternative:** [Astral](https://github.com/lino-levan/astral) is a native
> Deno browser driver similar to Puppeteer and does not require a Node bridge.
> It is easier to install, but Playwright has more mature features such as
> traces, automatic waits, and multiple browser support. Playwright is the
> default.

### 5. Requirement Traceability: SARA

This cross-cutting layer treats **requirements as a knowledge graph** and
generates a traceability matrix and coverage report while detecting broken or
dangling links, duplicate IDs, cycles, and orphans.

**Why it fits:** requirements live in `requirements/` as ordinary Markdown files
with YAML frontmatter. They are versioned in Git, human-readable, and parseable
without runtime integration.

**Implementation:** SARA is a single **Rust** binary with no JRE or other
runtime dependencies. Install it with
`cargo install --git https://github.com/cledouarec/sara sara-cli` (requires
rustc >= 1.95). It runs as a separate command or CI step and is not an
application dependency.

> OpenFastTrace was considered previously but rejected because its Java CLI
> **requires a JRE**, which is too heavy. The decision is recorded in
> `requirements/decisions/ADR-TEST-TRACEABILITY.md`.

**Custom lightweight model in `requirements/model.yaml`:** `solution` (`SOL`) to
`requirement` (`REQ`), plus `decision`/ADR (`justifies`) and `verification`
(`verifies`, for tests and coverage). Relations are `refines`, `depends_on`,
`justifies`, `supersedes`, and `verifies`.

A requirement is a Markdown file with frontmatter. Its `specification` must
contain an RFC 2119 keyword such as SHALL or MUST:

```markdown
---
id: "REQ-WORD-SELECTION"
type: requirement
name: "Core LexTALE word selection"
specification: >
  The system SHALL present a grid of 60 words ... and SHALL let the user mark known words.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUESTION-BANK"
---

Requirement body: acceptance criteria and related details.
```

Coverage is represented by separate `verification` items related to a
requirement through `verifies`. These items are created as tests are written
instead of using tags in code as OFT would.

**Commands** from the `requirements/` directory:

```bash
sara check               # validate the graph; CI gate that blocks merges on defects
sara report coverage     # coverage
sara report matrix       # traceability matrix
sara query REQ-WORD-SELECTION --upstream
```

A failed `sara check` caused by broken links, duplicates, cycles, or orphans
blocks CI.

## Excluded Tools and Rationale

| Tool              | Decision | Rationale                                                                                               |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| **Vitest**        | No       | Node/Vite runner; `deno test` provides the same capabilities natively without an npm layer.             |
| **mirage.js**     | No       | Client API mock for SPAs; SSR/MPA has no client-side fetch calls to intercept.                          |
| **playwright-ct** | No       | Component testing for client hydration; server JSX is tested as an HTML string.                         |
| **OpenFastTrace** | No       | Java CLI that requires a JRE; SARA provides traceability as a Rust binary without runtime dependencies. |

## Final Stack

- **`deno test`** with `@std/assert`, `@std/testing/mock`, and
  `@std/testing/snapshot` for unit and integration tests.
- **Hono `app.request()`** for route and redirect tests.
- **PostgreSQL-backed session helpers** and **Testcontainers/Postgres** for
  state.
- **`deno-dom`** for HTML rendering checks.
- **Playwright**, with Astral as an alternative, for E2E tests.
- **`deno coverage`** for code coverage.
- **SARA** (Rust CLI) for the requirement traceability matrix from requirements
  through ADRs and design to tests.
