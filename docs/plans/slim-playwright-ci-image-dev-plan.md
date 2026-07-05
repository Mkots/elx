# Slim Chromium-only E2E Image + Deno 2.9.0 via Mise — Development Plan

Source: chat idea (speed up e2e `Initialize containers`), incubated via
`incubate-idea` + `plan-brainstorm`. Series tag: `[CI-Image]`.

## Goal

The e2e job stops pulling the ~2.2 GB
`mcr.microsoft.com/playwright:v1.61.0-noble` (3 browsers) image on every run and
instead pulls a custom **Chromium-only** image with **Deno baked in**, published
to GHCR as `ghcr.io/mkots/elx-playwright`. Because Deno + Chromium + OS deps are
baked in, `e2e.yaml` drops both the `Install unzip` and `setup-deno` steps and
just swaps its `container:` line — cutting the `Initialize containers` step
materially below the current ~43 s.

Alongside, Deno is standardized on a **single version (2.9.0)** across CI,
Docker, DevContainer, and local dev via **Mise** (`mise.toml` as the source of
truth), resolving the current 2.8.3-vs-2.9.0 drift.

Done when: `deno task ci` green; the e2e workflow runs against
`elx-playwright:v1.61.0` with no deno-setup steps; every deno-version reference
resolves to 2.9.0; and a CI guard fails if the e2e image tag drifts from the
`@playwright/test` version in `deno.json`.

## Decisions

Fixed during the brainstorm — implementers must not relitigate these.

1. **Custom image base = `denoland/deno:debian-2.9.0`, NOT the mcr Playwright
   image.** Basing on the mcr image can't shrink it (3 browsers already in its
   layers). Basing on the deno image and running
   `deno run -A npm:playwright@1.61.0 install --with-deps chromium` yields
   deno + Chromium + OS deps only, and bakes deno so no runner-side setup is
   needed.
2. **Deno standardized on 2.9.0 via Mise, everywhere.** `mise.toml` at repo root
   pins `deno = "2.9.0"` as the single source of truth. CI workflows use
   `jdx/mise-action` (SHA-pinned, per the repo's actions-pinning norm) instead
   of `denoland/setup-deno`; DevContainer uses the mise feature; the app
   Dockerfile already uses 2.9.0. This resolves the 2.8.3→2.9.0 drift by moving
   everything **up** to 2.9.0. The slim image's `FROM` tag must equal the
   mise-pinned number.
3. **Image tag = Playwright version (`:v1.61.0`), reproducible, guarded.** e2e
   references the exact version tag. A CI guard (a `tests/` unit test in the
   repo's existing agent-docs style) fails if the e2e `container:` tag ≠ the
   `@playwright/test` version in `deno.json`, so a Dependabot npm bump forces an
   image rebuild + e2e tag update. Not `:latest` (non-reproducible).
4. **Separate `image-playwright.yaml` workflow, independent of `ci.yaml`.** The
   app-image job in `ci.yaml` runs _after_ e2e; making e2e depend on an image
   built there would deadlock. The Playwright image builds in its own workflow
   (triggered on `Dockerfile.playwright` changes + `workflow_dispatch`), so e2e
   only ever references an already-published tag.
5. **GHCR package `elx-playwright` is public.** e2e (including PRs from forks)
   pulls without auth; no login step. Matches the simplicity of the existing
   setup. Add a dedicated cleanup rule (the existing `ghcr-cleanup.yaml` only
   prunes `elx`).
6. **No CI timing assertion (fire-and-forget).** The win is visible in the
   Actions "Initialize containers" timing; no brittle threshold step is added.
7. **Rollout order via work-item dependencies.** The image must exist in GHCR
   before e2e switches to it: WI-2 publishes it (on merge / manual dispatch);
   WI-3 flips e2e and depends on WI-2.
8. **Each work item is an independently-green PR.** Sequential ordering keeps
   every intermediate state passing (e.g. WI-1 bumps e2e's `setup-deno` to
   2.9.0; WI-3 later removes that step once the image bakes deno).

## Work items

One subsection per future issue, in execution order.

### 1. Standardize Deno on 2.9.0 via Mise across CI, Docker, DevContainer, local

- **Depends on**: —
- **Context**: Deno version is currently split: CI pins **2.8.3**
  (`quality.yaml:32,55,78,101`, `e2e.yaml:50`, `wiki-sync.yaml:27`,
  `copilot-setup-steps.yml:46`), DevContainer `2.8.3`
  (`.devcontainer/devcontainer.json:6`), README `2.8.3` (`README.md:8`), but the
  app `Dockerfile` uses **2.9.0**. No `mise.toml`/`.tool-versions` exists. This
  item makes Mise the single source of truth at **2.9.0**.
- **Deliverable**:
  1. `mise.toml` at repo root pinning `[tools] deno = "2.9.0"`.
  2. Replace every `denoland/setup-deno@… (deno-version: 2.8.3)` with
     `jdx/mise-action@<sha>` (SHA-pinned) in `quality.yaml` (4 jobs),
     `wiki-sync.yaml`, `copilot-setup-steps.yml`, and `e2e.yaml` (e2e's
     deno-setup is removed entirely in WI-3, but bump it here so this PR is
     self-consistent).
  3. DevContainer: switch the deno feature to the mise feature (or pin the deno
     feature to `2.9.0`) so it resolves `mise.toml`.
  4. Update `README.md` (and any doc) deno-version references to 2.9.0.
  5. Confirm `Dockerfile` stays on 2.9.0 (already aligned).
- **Acceptance criteria**:
  - `grep -rn "2.8.3" .github/ .devcontainer/ README.md` returns nothing.
  - Every CI job installs Deno 2.9.0 via mise; `deno task ci` green.
  - `jdx/mise-action` is pinned to a 40-char SHA with a `# vX` comment.
  - `tests/agent_docs_test.ts` green (update AGENTS.md map if tasks/tooling refs
    change).
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent — mechanical multi-file
    version edits + workflow rewrites; keep churn out of main context.
  - _Targeted Verification_:
    `grep -rn "2.8.3" .github/ .devcontainer/ README.md` and
    `deno test tests/agent_docs_test.ts`. Full `deno task ci` once at the end;
    workflow validity comes from the PR's Actions run.

### 2. Build the slim Chromium-only Playwright image and publish to GHCR

- **Depends on**: WI-1 (2.9.0 is the agreed version the image bakes).
- **Context**: e2e uses `mcr.microsoft.com/playwright:v1.61.0-noble`
  (`e2e.yaml:17`), 3 browsers, ~2.2 GB pull. The repo only runs Chromium
  (`playwright.config.ts` has no `projects`). Existing image infra
  (`image.yaml`) builds only the app image to `ghcr.io/vitalijkomarov/elx` and
  can't host this (circular dep — Decision 4). `ghcr-cleanup.yaml` prunes only
  the `elx` package.
- **Deliverable**:
  1. `Dockerfile.playwright` at repo root: `FROM denoland/deno:debian-2.9.0`,
     then `deno run -A npm:playwright@1.61.0 install --with-deps chromium`, plus
     `unzip` if any tooling still needs it. Keep it single-stage and minimal.
  2. `.github/workflows/image-playwright.yaml`: triggers on `push` touching
     `Dockerfile.playwright` + `workflow_dispatch`; mirrors `image.yaml`
     conventions (buildx, `docker/login-action` with GITHUB_TOKEN,
     `docker/build-push-action` + GHA cache — all SHA-pinned). Pushes
     `ghcr.io/mkots/elx-playwright:v1.61.0` (tag = Playwright version) and
     `:latest`.
  3. Make the `elx-playwright` GHCR package **public** (one-time repo/package
     setting; note in the PR).
  4. Add an `elx-playwright` cleanup rule to `ghcr-cleanup.yaml` mirroring the
     `elx` retention (prune `^sha-.*$`/untagged, keep semver + `latest`).
- **Acceptance criteria**:
  - Manual `workflow_dispatch` publishes `elx-playwright:v1.61.0` to GHCR and it
    is publicly pullable (`docker pull` without auth).
  - Image contains Deno 2.9.0 + Chromium and can run `deno task e2e` locally
    against it (smoke check, not wired into CI yet).
  - `deno task ci` green (no app code touched; workflow validity via Actions
    run).
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent — Dockerfile iteration +
    workflow authoring is log-heavy.
  - _Targeted Verification_: local `docker build -f Dockerfile.playwright .` and
    a Chromium smoke run inside the image. Do **not** run `deno task ci` per
    iteration; run once at the end. e2e is NOT switched in this item.

### 3. Switch e2e to the slim image, drop deno-setup, add the version-sync guard

- **Depends on**: WI-2 (image must be published first — rollout order).
- **Context**: With the image published (WI-2) and baking Deno 2.9.0 (WI-1),
  `e2e.yaml` can drop its `Install unzip` (`:45-46`) and `setup-deno` (`:48-50`)
  steps and swap `container:` (`:17`). The version tag must stay in sync with
  `deno.json`'s `@playwright/test` (Decision 3).
- **Deliverable**:
  1. `e2e.yaml`: `container:` → `ghcr.io/mkots/elx-playwright:v1.61.0`; remove
     the `Install unzip` and `setup-deno` steps; keep the postgres service, Deno
     cache step, and env unchanged.
  2. A CI guard in `tests/` (repo's `agent_docs_test.ts` style) that parses the
     `@playwright/test` version from `deno.json` and the e2e `container:` tag
     from `e2e.yaml` and asserts they match; runs in the existing quality job.
  3. Update docs: `AGENTS.md` (lines 30, 40 — the mcr image references),
     `docs/tech-details/test-tech-stack.md` (63-77),
     `docs/tech-details/ops-tech-stack.md` (49-61) to describe the custom image
     - its build/cleanup workflow.
- **Acceptance criteria**:
  - e2e passes end-to-end against `elx-playwright:v1.61.0`; the
    `Initialize containers` step is visibly faster than the mcr baseline.
  - The sync-guard test fails if the e2e tag and `deno.json` Playwright version
    diverge (verify by temporarily editing one).
  - `deno task ci` green; `tests/agent_docs_test.ts` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent.
  - _Targeted Verification_: `deno test tests/agent_docs_test.ts` and the new
    sync-guard test; e2e correctness is confirmed by the PR's e2e Actions run
    (do not attempt Playwright locally in the agent — per AGENTS.md). Full
    `deno task ci` once at the end.

## Out of scope

- **Multi-browser e2e** (Firefox/WebKit) — the suite runs Chromium only; adding
  browsers later means widening the image or reverting to the mcr image.
- **App runtime image / `image.yaml` changes** — untouched; the app Dockerfile
  already sits on Deno 2.9.0.
- **ARM/multi-arch builds** of the Playwright image — single `linux/amd64` to
  match the `ubuntu-24.04` runners; revisit only if runners change.
- **A CI timing assertion** for container init (Decision 6).

## Open questions

Non-blocking; resolve during the relevant item.

1. **DevContainer mechanism** (WI-1): switch to
   `ghcr.io/devcontainers/features/mise` vs pin the existing
   `devcontainers/features/deno` feature to `2.9.0`? Default: the mise feature,
   to keep one source of truth. Owner: WI-1 implementer.
2. **Does `jdx/mise-action` need `unzip`/extra deps on the mcr-free runners?**
   (WI-1) The GitHub-hosted `ubuntu-24.04` runner has them; only relevant if a
   job runs in a container. Owner: WI-1 implementer.
3. **Exact size/pull win** — measured post-merge from the Actions timing; if the
   Chromium-only image is not meaningfully smaller than expected, revisit the
   base (e.g. slimmer non-deno base + mise). Trigger: first e2e run on the new
   image (WI-3).
