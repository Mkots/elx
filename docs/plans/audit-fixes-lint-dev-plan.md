# Code-Audit Fixes & Preventive Linters — Development Plan

Source: chat-provided code-audit (7 findings), incubated via `incubate-idea` +
`plan-brainstorm`. Series tag: `[Audit-Lint]`.

## Goal

Every code-audit finding is remediated **and** guarded against regression by an
automated check that runs in `deno task ci`:

- **Track A (CI/YAML):** all 22 external GitHub Actions `uses:` refs are pinned
  to full 40-char commit SHAs (with a `# vX` comment so Dependabot still bumps
  them), and a `pinact --check` step fails CI if any ref regresses to a tag.
- **Track B (JS/TS):** a single custom Deno lint plugin
  (`tools/lint/audit_rules.ts`, wired via `deno.json` → `lint.plugins`) exposes
  5 error-level rules with autofixers covering findings #2–#7; all existing
  flagged call-sites are rewritten to satisfy them.

Done when: `deno task ci` is green, `deno lint` reports zero audit-rule
violations across the linted tree, `pinact --check` passes, and every workflow
ref is a SHA.

## Decisions

Fixed during the brainstorm — implementers must not relitigate these.

1. **Actions enforcement = `pinact --check` in CI.** Purpose-built, auto-pins to
   SHA, keeps a `# vX` trailing comment, low-noise. Not zizmor (broader scope
   than this audit needs), not a hand-rolled grep guard (manual pinning burden).
2. **Pin format = full 40-char commit SHA + trailing `# vX` comment.**
   Dependabot (already configured in `.github/dependabot.yml`, github-actions
   weekly) updates SHA-pinned refs and preserves the comment, so pinning does
   not break auto-updates.
3. **Lint rules are error-level and ship autofixers.** Rules fail `deno lint`/CI
   and provide a Deno lint `fix` so `deno lint --fix` rewrites call-sites. Not
   warn-only (weak guard).
4. **One plugin, one file** — `tools/lint/audit_rules.ts` exports a single
   plugin named `audit` with all 5 rules. Simple wiring, appropriate for repo
   size.
5. **`.agents/skills/` is excluded from linting.** It is vendored agent tooling,
   not shipped app code. Its audit hits (issue_loop.ts sort + 2 regex replaces)
   are out of scope and not fixed. Add `.agents/skills` to `deno.json`
   `lint.exclude`.
6. **Rule → fix → guard ordering per rule.** Implement the rule first, let it
   flag the real sites, fix the sites, and leave the rule as the regression
   guard. The JS/TS work items are sequential (each depends on the scaffold) so
   the single plugin file evolves linearly and avoids merge conflicts.
7. **`Number()`/`String()` function-call coercions are left alone** (finding #7
   only targets `Array()` constructor-mode calls; coercion calls are correct).

## Rule inventory (Track B)

| Rule id                      | Findings | Rewrites                                                                                                                                                                                         | Real sites to fix                                                                                |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `audit/prefer-number-static` | #3, #4   | `parseInt`→`Number.parseInt`, `isNaN`→`Number.isNaN` (also `isFinite`→`Number.isFinite`)                                                                                                         | 4 + 9 = 13                                                                                       |
| `audit/require-sort-compare` | #2, #5   | flag `.sort()`/`.toSorted()` with no compare fn; fixer inserts `(a, b) => …` (string args → `String(a).localeCompare(String(b))`); **exempt** the `JSON.stringify(x.sort())` normalization idiom | 3                                                                                                |
| `audit/prefer-replace-all`   | #6       | `.replace(/…/g, …)` → `.replaceAll(…)` (regex without `g` untouched)                                                                                                                             | 2 in-scope (playwright.config.ts:13, build_wiki.ts:545) + ui/pages/AdminTicketDetailPage.tsx:382 |
| `audit/require-new-array`    | #7       | `Array(…)` → `new Array(…)`                                                                                                                                                                      | 1 (tests/admin_tickets_test.ts:112)                                                              |

Excluded-by-decision-5 sites (not counted / not fixed):
`.agents/skills/gh-issue-solver/scripts/issue_loop.ts` (1 sort + 2 replaces).

## Work items

One subsection per future issue, in execution order.

### 1. Pin GitHub Actions to commit SHAs and enforce with pinact

- **Depends on**: —
- **Context**: 22 external `uses:` refs across 11 files in `.github/workflows/`
  (`ci.yaml`, `e2e.yaml`, `quality.yaml`, `deploy.yaml`, `image.yaml`,
  `requirements.yaml`, `wiki-sync.yaml`, `seed.yaml`, `ghcr-cleanup.yaml`,
  `cleanup-closed-pr-branches.yml`) are pinned to tags, not SHAs (finding #1,
  supply-chain risk). `.github/dependabot.yml` already tracks github-actions.
- **Deliverable**:
  1. Every external action ref rewritten to `owner/repo@<40-char-sha> # vX` (run
     `pinact run` locally, or resolve each SHA via the GitHub API). First- party
     `denoland/*`, `actions/*`, `docker/*`, `dorny/*`, `appleboy/*`,
     `dataaxiom/*` all included.
  2. A `pinact --check` (or equivalent `pinact run --check`) step added to
     `quality.yaml` (or the umbrella `ci.yaml`) that fails when any ref is not a
     SHA. Pin pinact itself to a SHA where it is `uses:`-invoked, or install a
     pinned version in the job.
  3. Optional `pinact.yaml` config committed if non-default behavior is needed.
- **Acceptance criteria**:
  - `grep -rEn '@v[0-9]' .github/workflows/` returns no external-action refs
    (only trailing `# vX` comments remain).
  - The new CI step passes on the pinned tree and fails if a ref is reverted to
    a tag (verify by temporarily un-pinning one ref locally).
  - Existing CI jobs still run (SHAs resolve to the same versions).
  - `deno task ci` green (unaffected, but confirm no workflow syntax breakage
    via the Actions run on the PR).
- **Token-Saving Checklist**:
  - _Subagent Instruction_: Implement in a `self`-sandboxed subagent — the SHA
    resolution + 22 edits are mechanical and log-heavy; keep them out of the
    main context.
  - _Targeted Verification_: `grep -rEn '@v[0-9]' .github/workflows/` and the
    pinact check only. Do **not** run `deno task ci` for this item (no JS/TS
    touched); rely on the PR's Actions run for workflow validation.

### 2. Scaffold the audit lint plugin and add `prefer-number-static`

- **Depends on**: —
- **Context**: `deno.json` `lint` currently has only an `exclude` list, no
  `plugins`. Deno 2.8.3 (pinned in CI) supports lint plugins (stable since 2.2).
  This item stands up `tools/lint/audit_rules.ts`, wires it in, and lands the
  first + largest rule: `prefer-number-static` (findings #3 & #4, 13 sites).
- **Deliverable**:
  1. `tools/lint/audit_rules.ts` exporting a plugin
     `{ name: "audit", rules: {…} }` with `prefer-number-static` implemented
     (CallExpression visitor matching global `parseInt`/`isNaN`/`isFinite`
     identifiers not preceded by `Number.`; autofixer prepends `Number.`).
  2. `deno.json` updated: `lint.plugins: ["./tools/lint/audit_rules.ts"]` and
     `.agents/skills` added to `lint.exclude` (Decision 5).
  3. All 13 sites fixed via `deno lint --fix`: `playwright.config.ts:25,26`,
     `scripts/importer_core.ts:118,119,161,162,244,245`,
     `routes/admin/words.ts:192,282,299,352,389`.
  4. A unit test `tools/lint/audit_rules_test.ts` using
     `Deno.lint.runPlugin`-style assertions (or `deno.test` + `lint --json`
     harness) covering a passing and a failing snippet for the rule.
  5. If a new task is introduced (e.g. `test:lint-rules`), update AGENTS.md map
     so `tests/agent_docs_test.ts` stays green.
- **Acceptance criteria**:
  - `deno lint` reports zero `parseInt`/`isNaN`/`isFinite` global usages in the
    linted tree; the rule flags a reintroduced usage.
  - `tools/lint/audit_rules_test.ts` passes.
  - `deno task ci` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent — rule authoring + AST
    iteration is exploratory; keep trial-and-error out of main context.
  - _Targeted Verification_:
    `deno lint tools/ routes/admin/words.ts scripts/importer_core.ts playwright.config.ts`
    and `deno test tools/lint/audit_rules_test.ts`. Run `deno task ci` **once**
    at the end, not per-iteration.

### 3. Add `require-sort-compare` rule and fix unsorted call-sites

- **Depends on**: Item 2 (plugin scaffold + `deno.json` wiring).
- **Context**: 3 risky sorts without a comparator (findings #2 & #5):
  `tests/admin_tickets_test.ts:446,449` (string array),
  `db/repositories/tickets.ts:107`
  (`[...new Set(wordPool.map(w => w.bankVersion))].sort()` over numeric-ish
  values). Good existing sites already use `localeCompare`
  (`db/repositories/words.ts:318`, `scripts/build_wiki.ts:439`) and must stay
  unflagged.
- **Deliverable**:
  1. `audit/require-sort-compare` rule added to the plugin: flags
     `.sort()`/`.toSorted()` with zero arguments; **exempts** the pattern where
     the sort result is the argument of a `JSON.stringify(...)` compared with
     `===`/`!==` (the normalization idiom). Autofixer inserts a comparator —
     `(a, b) => String(a).localeCompare(String(b))` for string-ish arrays,
     `(a, b) => a - b` for numeric.
  2. The 3 sites fixed (tickets.ts numeric-string sort gets an explicit
     numeric/`localeCompare` comparator per its element type).
  3. Test cases added to `tools/lint/audit_rules_test.ts`: a bare `.sort()`
     (fail), a `.sort(cmp)` (pass), and the `JSON.stringify(x.sort())` idiom
     (pass/exempt).
- **Acceptance criteria**:
  - The two known-good `localeCompare` sites remain unflagged.
  - The `JSON.stringify(a.sort())===JSON.stringify(b.sort())` idiom is not
    flagged.
  - `deno lint` flags a new bare `.sort()`; the 3 real sites are fixed.
  - `deno task ci` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent.
  - _Targeted Verification_:
    `deno lint db/repositories/tickets.ts tests/admin_tickets_test.ts tools/`
    and `deno test tools/lint/audit_rules_test.ts`. Full `deno task ci` once at
    the end.

### 4. Add `prefer-replace-all` and `require-new-array` rules and fix sites

- **Depends on**: Item 2 (plugin scaffold).
- **Context**: two small rules complete the plugin. `#6`: `.replace(/…/g, …)`
  in-scope sites are `playwright.config.ts:13`, `scripts/build_wiki.ts:545`, and
  `ui/pages/AdminTicketDetailPage.tsx:382`. `#7`: single
  `Array(count).fill(...)` at `tests/admin_tickets_test.ts:112`.
  `.agents/skills/` hits are excluded per Decision 5.
- **Deliverable**:
  1. `audit/prefer-replace-all` rule: flags
     `.replace(<regex-literal with g flag>, …)`; autofix rewrites to
     `.replaceAll(...)` when the first arg is a global regex (leave non-global
     regex and string-first-arg untouched). Note: fixer must preserve the regex
     (replaceAll accepts a global regex) — the minimal safe fix is swapping the
     method name to `replaceAll`.
  2. `audit/require-new-array` rule: flags `Array(...)` CallExpression without
     `new`; autofix wraps with `new`. Does **not** touch `String()`/`Number()`.
  3. The 3 replace sites + 1 Array site fixed.
  4. Test cases for both rules added to `tools/lint/audit_rules_test.ts`
     (including a non-global `.replace(/…/, …)` that must stay unflagged and a
     `Number()` coercion that must stay unflagged).
- **Acceptance criteria**:
  - No global-regex `.replace` and no bare `Array(` in the linted tree; new
    occurrences are flagged.
  - Non-global `.replace` and `String()`/`Number()` coercions remain unflagged.
  - `deno task ci` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent.
  - _Targeted Verification_:
    `deno lint ui/ scripts/build_wiki.ts playwright.config.ts tests/admin_tickets_test.ts tools/`
    and `deno test tools/lint/audit_rules_test.ts`. Full `deno task ci` once at
    the end.

## Out of scope

- **`.agents/skills/gh-issue-solver/scripts/issue_loop.ts`** audit hits (1 sort,
  2 global-regex replaces) — vendored agent tooling, excluded from linting
  (Decision 5). Not fixed.
- **zizmor / broader Actions security scanning** — pinact covers the audited
  finding; a wider GHA security posture review is a separate effort.
- **`Number()`/`String()`/`Boolean()` function-call coercions** — correct as-is,
  not constructor-mode (Decision 7).
- **Migrating `parseInt` radix conventions** — all 4 calls already pass radix
  10; only the `Number.` prefix changes.

## Open questions

Non-blocking; resolve during the relevant item.

1. **Does the repo's Deno lint plugin API expose a stable `fix`/autofix hook in
   2.8.3?** (Item 2 trigger.) If autofixers are not stably supported, fall back
   to error-only rules + manual site fixes (rules still guard regressions); the
   fixer is a convenience, not a correctness requirement. Owner: implementer of
   Item 2.
2. **Where to invoke `pinact --check` — its own step in `quality.yaml` or a new
   lightweight `security.yaml` job dispatched by `ci.yaml`?** (Item 1.) Default:
   a step in `quality.yaml` to avoid a new workflow file. Owner: implementer of
   Item 1.
