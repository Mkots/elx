# Technical Details

Architecture, infrastructure, and tooling documentation for the ELX project.

## Documents

| Document | Description |
|----------|-------------|
| [Technology Stack](tech-stack.md) | Core architecture: Deno + Hono SSR/MPA, Deno KV, PostgreSQL, Drizzle ORM |
| [Operations Stack](ops-tech-stack.md) | Deployment, CI/CD, hosting, Docker Compose, observability |
| [Test Stack](test-tech-stack.md) | Testing pyramid: deno test, Playwright E2E, SARA traceability |

## Architecture Summary

- **Runtime:** Deno with TypeScript
- **Framework:** Hono (SSR/MPA, not SPA)
- **Frontend:** Server-side JSX + HTML forms, minimal client JS
- **Sessions:** Deno KV (local SQLite backend)
- **Database:** PostgreSQL + Drizzle ORM
- **Hosting:** Single DigitalOcean Droplet + Docker Compose
- **CI/CD:** GitHub Actions → GHCR → SSH deploy

## Key Principles

1. **Server-side rendering** — no client-side scoring or logic tampering
2. **Offline question bank** — all data generated before runtime, only SELECT at runtime
3. **MVP scale** — one node, minimal infrastructure, defer complexity until needed
