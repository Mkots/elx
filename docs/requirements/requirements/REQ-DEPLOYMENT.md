---
id: "REQ-DEPLOYMENT"
type: requirement
name: "Deployment, containerization, and CI/CD"
specification: >
  The system SHALL be built into a Docker image and deployed to a single DigitalOcean droplet
  via Docker Compose (app + Caddy + Postgres) by an automated GitHub Actions pipeline.
status: accepted
refines:
  - "SOL-LEXTALE"
depends_on:
  - "REQ-QUALITY-GATES"
---

# Deployment, Containerization, and CI/CD

Source:
[`tech-details/ops-tech-stack.md`](../../tech-details/ops-tech-stack.md).
Justification: [[ADR-HOSTING]].

## Requirements

1. **Containerization:** use a pinned `denoland/deno` base image, a multi-stage
   build with dependency caching separate from code, explicit permission flags
   without `--allow-all`, and a committed `deno.lock`.
2. **CI pipeline:** on pushes and pull requests, GitHub Actions runs
   `deno fmt --check`, `deno lint`, `deno test`, `deno coverage`, Playwright
   E2E, and SARA traceability checks from [[REQ-QUALITY-GATES]], then builds and
   publishes an image tagged with the Git SHA and semver to GHCR before
   deployment.
3. **Droplet deployment:** provision Ubuntu LTS with `cloud-init`; run `app`,
   automatic-HTTPS `caddy`, and `postgres` in one Docker Compose project. Deploy
   over SSH with `docker compose pull && docker compose up -d`, and roll back by
   switching the image tag.
4. **Network and secrets:** use a DO Cloud Firewall for ports 80, 443, and 22,
   plus a Reserved IP. Use environment variables as the only configuration
   source. Keep CI secrets in GitHub Secrets and a mode-`600` `.env` beside
   `compose.yaml` on the Droplet, outside the repository.

## Acceptance Criteria

- A green pipeline is required for merging and deployment.
- The image is reproducible, and changing the tag performs a rollback.
