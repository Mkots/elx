# ELX

A minimal LexTALE application scaffold built with Deno, Hono, and server-side
JSX.

## Requirements

- Deno `2.8.3`
- Docker with the Compose plugin
- Zed with Dev Containers support when developing inside a container

## Local Development

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up -d postgres
deno task --env-file=.env dev
```

Application: <http://localhost:8000>\
Healthcheck: <http://localhost:8000/health>

Fully containerized local startup:

```bash
docker compose -f compose.dev.yaml up --build
```

## Dev Container in Zed

Open the repository as a Dev Container. The configuration installs Deno and the
Docker CLI, mounts the host's `/var/run/docker.sock`, and forwards ports `8000`
and `5432`.

From the Dev Container, start Postgres through the host Docker daemon and run
the application directly:

```bash
docker compose -f compose.dev.yaml up -d postgres
deno task dev
```

Do not start the `app` service from `compose.dev.yaml` inside the Dev Container:
the `/workspaces/elx` bind mount is not a valid Docker host filesystem path on
macOS.

## Commands

```bash
deno task ci             # fmt, lint, type-check, tests, coverage
deno task --env-file=.env db:generate # create a Drizzle migration
deno task --env-file=.env db:migrate  # apply migrations
deno task e2e            # Playwright E2E
```

## Production

`compose.yaml` expects a production `.env` next to the Compose file. At minimum,
it requires:

```dotenv
APP_IMAGE=ghcr.io/owner/elx
APP_TAG=sha-full-git-sha
DOMAIN=example.com
POSTGRES_DB=elx
POSTGRES_USER=elx
POSTGRES_PASSWORD=replace-me
```

The provisioning template is in `deploy/cloud-init.yaml`. Replace the SSH key
and configure the DigitalOcean Firewall before using it.

GitHub Actions publishes the image to GHCR and deploys over SSH. The
`production` environment requires these secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

`DEPLOY_PATH` must contain a repository checkout and a protected production
`.env`.
