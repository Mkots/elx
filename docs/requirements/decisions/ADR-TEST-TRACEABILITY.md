---
id: "ADR-TEST-TRACEABILITY"
type: decision
name: "Tests and traceability: deno test + Playwright + SARA"
status: accepted
justifies:
  - "REQ-QUALITY-GATES"
supersedes:
  - "ADR-OFT-TRACEABILITY"
---

# Tests and Traceability: deno test + Playwright + SARA

## Context

The Deno + SSR/MPA architecture has almost no client-side JavaScript; logic and
rendering live on the server. It needs fast tests and lightweight requirement
traceability without heavy dependencies. Source:
[`tech-details/test-tech-stack.md`](../../tech-details/test-tech-stack.md).

## Decision

- **Unit/Integration:** built-in `deno test` with `@std/assert`,
  `@std/testing/mock`, `@std/testing/snapshot`, and `deno coverage`.
- **Routes:** Hono `app.request()` without starting a server; use
  `Deno.openKv(":memory:")` with Testcontainers/Postgres for state and
  `deno-dom` for HTML.
- **E2E:** Playwright against a running server.
- **Traceability:** **SARA** (Rust CLI), with requirements stored as Markdown
  and YAML frontmatter in a graph of `refines`, `depends_on`, `justifies`, and
  `verifies` relations. `sara check` blocks merges in CI.

## Why SARA Instead of OFT

OFT requires a JRE and is too heavy. SARA is a single Rust binary with no
runtime dependencies and works with ordinary Markdown files. It supersedes
[ADR-OFT-TRACEABILITY](ADR-OFT-TRACEABILITY.md).

## Consequences

- **+** No JRE; requirements remain readable and versioned in Git; one command
  validates the graph.
- **-** Coverage uses separate `verification` items and relations instead of
  code tags, requiring discipline when adding tests.
