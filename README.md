# ELX

A minimal LexTALE application scaffold built with Deno, Hono, and server-side
JSX.

## Requirements

- Deno `2.9.0`
- Docker with the Compose plugin
- [hk](https://hk.jdx.dev/) for git hooks
- Zed with Dev Containers support when developing inside a container

## Local Development

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up -d postgres
deno task --env-file=.env dev
```

Application: <http://localhost:8000>\
Healthcheck: <http://localhost:8000/health>

Adminer can be started alongside Postgres for browser-based database access:

```bash
docker compose -f compose.dev.yaml up -d postgres adminer
```

Adminer: <http://localhost:8080>

Use these connection settings on the login screen:

- System: `PostgreSQL`
- Server: `postgres`
- Username: `elx`
- Password: `elx`
- Database: `elx`

Fully containerized local startup:

```bash
docker compose -f compose.dev.yaml up --build
```

This also starts Adminer, so the database UI is available at
<http://localhost:8080>.

## Dev Container in Zed

Open the repository as a Dev Container. The configuration installs Deno and the
Docker CLI, mounts the host's `/var/run/docker.sock`, and forwards ports `8000`,
`5432`, and `8080`.

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

## Word Import

To import words from external CSV or JSON files, use the `import:words` task.

Example config to import a CEFR vocabulary list with columns
`headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold` (where `Threshold`
is mapped to the definition):

```json
{
  "format": "csv",
  "delimiter": ",",
  "hasHeader": true,
  "fields": {
    "value": { "from": "headword" },
    "isReal": { "from": "pos", "default": true },
    "difficulty": {
      "from": "CEFR",
      "map": {
        "A1": 1,
        "A2": 2,
        "B1": 3,
        "B2": 4,
        "C1": 5,
        "C2": 5
      },
      "default": 1
    },
    "definition": { "from": "Threshold" }
  },
  "onConflict": "update"
}
```

For more details on mapping options and formats, see
[Word Import Mapping Configuration](docs/import-config.md).

## Git Hooks

Install hk to enable pre-commit and pre-push hooks:

```bash
brew install hk   # macOS
hk install
```

Pre-commit runs `deno fmt --check` and `deno lint` on staged files. Pre-push
runs `deno task check` (type-check) and `deno task test`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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

## Wiki Sync

`.github/workflows/wiki-sync.yaml` mirrors `docs/` into the GitHub wiki
repository `Mkots/elx.wiki.git` on each push to `main` or `master` that changes
documentation.

Configure the repository secret `WIKI_SYNC_TOKEN` before enabling the workflow.
Use a GitHub token that can push to `Mkots/elx.wiki.git`. The workflow treats
`docs/` as the source of truth and deletes wiki pages removed from `docs/`. The
publish step builds a reader-facing wiki view instead of copying the source tree
verbatim:

- YAML frontmatter is stripped from published pages and rendered as a compact
  metadata section.
- Internal links are rewritten to GitHub Wiki page routes without `.md`.
- Nested source paths are flattened into stable wiki page names such as
  `Requirements`, `Technical-Details`, and `REQ-WORD-SELECTION`.
- `_Sidebar.md` and `_Footer.md` are generated automatically.

Create and maintain `docs/Home.md` as the source landing page for the generated
wiki home.
