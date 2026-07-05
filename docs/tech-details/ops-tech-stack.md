# LexTALE DevOps / Operations Stack (Deno + SSR)

## Principle

Operations are designed for the **Deno + SSR/MPA + Deno KV + PostgreSQL**
architecture described in [tech-stack.md](./tech-stack.md) and for MVP scale:
few moving parts and no premature infrastructure as code.

**Hosting is fixed to one DigitalOcean Droplet**, a self-hosted VM with Docker.
**Everything runs in one Docker Compose project:** the application, Postgres,
and reverse proxy share one node. Managed services, including a managed
database, are too expensive for the MVP. This leads to the following decisions:

- **Deno KV** uses its local SQLite backend in a single instance. Its file must
  be stored on a persistent path that survives redeployments.
- **PostgreSQL** runs in a container on the same Droplet, with data on a
  persistent volume and backups managed by the project.
- Sessions do not scale horizontally. Moving beyond one instance will require a
  separate KV backend, which is acknowledged but deferred beyond the MVP.

### Orchestration: Docker Compose, Not k3s

Use **Docker Compose** for one Droplet. Even lightweight k3s adds a control
plane, ingress controller, manifests, and its own storage without benefit while
there is only one node. k3s or Kubernetes remains a future upgrade path when
multiple nodes are needed.

---

## Containerization

- **Docker** with a version-pinned `denoland/deno` base image, never `latest`.
- **Multi-stage build:** cache dependencies with `deno cache` separately from
  application code so the dependency layer is reusable across builds.
- Start Deno with explicit permission flags such as `--allow-net` and
  `--allow-env`, without `--allow-all`.
- Commit `deno.lock` for reproducible builds.

## Local Development

- **Docker Compose:** starts the application and **PostgreSQL** with one command
  and keeps database behavior aligned with production.
- **Hot reload:** `deno task dev` runs `deno run --watch`.
- **Configuration:** load a local `.env` through `--env-file` or `Deno.env`.
  Keep it in `.gitignore` and provide `.env.example`.

## CI/CD: GitHub Actions

The push and pull request pipeline runs:

1. `deno fmt --check` for formatting.
2. `deno lint` for static analysis.
3. `deno test` and `deno coverage` for unit and integration tests; see
   [test-tech-stack.md](./test-tech-stack.md).
4. **Playwright E2E** against the running server and Postgres service. This runs
   inside a custom slim Docker image
   (`ghcr.io/vitalijkomarov/elx-playwright:v1.61.0`), which is built and
   published by `.github/workflows/image-playwright.yaml` and cleaned up via
   `.github/workflows/ghcr-cleanup.yaml`.
5. **SARA** (`sara check`) for requirement traceability. Broken links, duplicate
   IDs, cycles, or orphans block the merge. SARA is a single Rust binary without
   a JRE; see [test-tech-stack.md](./test-tech-stack.md).
6. Build and publish a Docker image to GHCR, tagged with the Git SHA and semver.
7. Deploy to the selected hosting environment.

> **Seeders** (`deno task seed:*`, Stage 0) run as a separate one-off release
> job or a manual maintenance command against the database. They are **not part
> of application startup**.

## Hosting and Deployment: DigitalOcean Droplet

- **Droplet:** an entry-level Ubuntu LTS instance with 1-2 vCPUs and 1-2 GB RAM
  for the MVP, vertically scalable by resizing. Provision it with `cloud-init`
  user data that installs Docker and the Docker Compose plugin, creates an
  unprivileged user, and applies basic hardening.
- **Docker Compose layout:**
  - `app`: the Deno/Hono container.
  - `caddy`: a reverse proxy with automatic Let's Encrypt HTTPS and no Certbot.
  - `postgres`: the database container on the same Droplet.
- **Persistence:**
  - Store the **Deno KV** file on a bind mount or volume outside the container
    so it survives redeployment.
  - Store Postgres data on a named volume, preferably backed by DigitalOcean
    Block Storage for reliability.
- **Network and access:**
  - Open only ports 80 and 443 in the **DigitalOcean Cloud Firewall**. Restrict
    port 22 by IP where possible.
  - Use a **Reserved IP** for a stable address across resizing or recreation.

### Deployment from GitHub Actions

1. CI builds the image and pushes it to **GHCR** or **DigitalOcean Container
   Registry**.
2. The deployment step connects to the Droplet over **SSH** and runs
   `docker compose pull && docker compose up -d` using a key from GitHub
   Secrets. Roll back by switching the image tag to the previous version.
3. `.github/workflows/ghcr-cleanup.yaml` runs daily via
   `dataaxiom/ghcr-cleanup-action` and deletes `sha-*` GHCR tags (and dangling
   manifests) older than 1 day for both `elx` and `elx-playwright` packages.
   Release builds carry extra tags (`latest`, the semver `x.y.z`/`x.y`) on the
   **same digest** as their `sha-*` tag; the action excludes any version that
   has one of those tags from every rule before applying
   `delete-tags`/`older-than`, so a release's `sha-*` tag survives too — only
   commits that were never released lose their `sha-*` tag. Because
   `deploy.yaml` deploys by `sha-<commit>` tag, rolling back to an unreleased
   commit whose image has aged past the 1-day window will fail to pull — the
   running container on the Droplet keeps working (Docker caches the image
   locally), but redeploying that exact old tag requires rebuilding the image
   first.

## Database and Migrations

- **Postgres runs as the `postgres` container on the Droplet.** A managed
  database is excluded to reduce cost. Data lives on a persistent volume, and
  the database is reachable only by the application on the internal Compose
  network; its port is not published externally.
- **Backups are project-managed:** run `pg_dump` from cron in a container or on
  the host, upload dumps to inexpensive S3-compatible **DO Spaces**, and rotate
  them by retention period. Test restoration from a dump periodically.
- **Drizzle Kit migrations:** run `drizzle-kit generate` and `migrate` as a
  **separate release step** against the database, never during application
  startup.

## Configuration and Secrets

- Use **environment variables** as the only configuration source, following the
  twelve-factor approach.
- Keep deployment SSH keys, registry credentials, and the database connection
  string in **GitHub Actions Secrets**. On the Droplet, keep a protected `.env`
  next to `compose.yaml`, outside the repository, owned by the deployment user
  with mode `600`.

## Observability

- **Logs:** structured JSON on stdout through Hono's `logger` middleware. On the
  Droplet, use `docker compose logs` and the Docker json-file driver with
  `max-size` and `max-file` rotation.
- **Errors:** report runtime exceptions to **Sentry** using its Deno SDK.
- **Droplet metrics and alerts:** use built-in **DigitalOcean Monitoring** for
  CPU, RAM, and disk alerts.
- **Uptime:** point an external uptime monitor at `GET /health`.
- This is sufficient for the MVP. Add APM or Prometheus later if needed.

## Repository Quality and Maintenance

- **Git hooks:** use [Lefthook](https://github.com/evilmartians/lefthook), which
  is language-agnostic, to run `deno fmt` and `deno lint` on pre-commit and fast
  tests on pre-push.
- **Dependency updates:** use **Renovate**, which understands `deno.json` and
  `deno.lock`, to open automated update pull requests.
- **Versioning:** use semver for releases and Git SHA tags for images.

## Excluded at the Start

| Tool or practice                              | Rationale                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| **k3s / Kubernetes / DO App Platform / DOKS** | Excessive for one node; the control plane and manifests provide no benefit yet.         |
| **DO Managed Database**                       | Too expensive for the MVP; a Postgres container and `pg_dump` to Spaces cover the need. |
| **Terraform / Pulumi (IaC)**                  | Premature; `cloud-init` and Compose are sufficient for one Droplet.                     |
| **Dedicated Deno KV infrastructure**          | Unnecessary while one application instance is sufficient.                               |
| **Prometheus/Grafana APM**                    | Excessive for the MVP; structured logs, Sentry, and DO Monitoring are sufficient.       |

## Final Stack

- **Docker** with a multi-stage `denoland/deno` image and **Docker Compose** for
  builds, the local environment, and the Droplet layout.
- **GitHub Actions** for CI/CD: format, lint, test, E2E, SARA, build, registry
  publication, and SSH deployment.
- A **DigitalOcean Droplet** with Ubuntu, Docker Compose, and `cloud-init`, plus
  **Caddy** for automatic HTTPS, all on one node.
- A **Postgres container** on the Droplet, **`pg_dump` to DO Spaces** for
  backups, and **Drizzle Kit** for migrations.
- **DO Cloud Firewall and Reserved IP** for networking.
- **Persistent volumes** for the Deno KV file and Postgres data.
- **GitHub Secrets and a protected Droplet `.env`** for configuration and
  secrets.
- **Sentry, structured logs, DO Monitoring, and an uptime monitor** for
  observability.
- **Lefthook and Renovate** for repository maintenance.
