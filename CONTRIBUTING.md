# Contributing to ELX

Thanks for your interest in contributing!

## Development Setup

```bash
cp .env.example .env
docker compose -f compose.dev.yaml up -d postgres
deno task --env-file=.env dev
```

## Before Submitting a PR

1. **Format**: `deno task fmt`
2. **Lint**: `deno task lint`
3. **Type check**: `deno task check`
4. **Tests**: `deno task test`

All of these run automatically via lefthook on pre-commit and pre-push.

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add word scoring endpoint
fix: handle empty search query
docs: update API reference
chore: bump dependencies
```

## Pull Requests

- Keep PRs focused on a single change.
- Include a clear description of what and why.
- Reference related issues with `Closes #123`.
- Ensure CI passes before requesting review.

## Requirements

This project uses [SARA](https://github.com/AstraZeneca/sara) for requirements
tracing. If your change affects documented requirements in `docs/requirements/`,
update them accordingly.
