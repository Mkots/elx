# Native CSS DX Improvements — Development Plan

Source: chat idea ("improve CSS DX, move to native CSS modules"), incubated via
`incubate-idea` + `plan-brainstorm`. Series tag: `[CSS-DX]`.

## Goal

CSS becomes maintainable without adding a bundler: every color/spacing magic
value lives in a `:root` design token, the cascade is predictable via native
`@layer` over Pico, there are **zero inline `style=` attributes** in `ui/`, and
the 914-line `static/app.css` monolith is split into feature-partitioned files
linked selectively per layout. The app stays SSR-only,
raw-CSS-over-`serveStatic`, with no build step and no new client JS.

Done when: `deno task ci` is green, e2e passes (no load-bearing class renamed),
`grep -rn "style=" ui/` returns nothing (except the GTM noscript hide), and
`static/app.css` no longer exists as a single monolith (replaced by
`static/css/*.css` composed through per-layout entry files).

## Decisions

Fixed during the brainstorm — implementers must not relitigate these.

1. **No bundler / no build step.** Native CSS only, served raw via Hono
   `serveStatic` (`app.ts:46`). NOT bundler CSS Modules, NOT CSS Module Scripts
   / `adoptedStyleSheets` (both require a bundler or client-side JS and don't
   fit SSR).
2. **Colocation = feature-partitioned CSS files, not `.tsx`-adjacency.** Hono
   JSX has no context/style-registry/dedup, so literal per-component colocation
   would need custom SSR infra — explicitly rejected. Split `app.css` into
   `static/css/{tokens,base,stage,result,admin,…}.css` linked selectively in
   `Layout` vs `AdminLayout`. HTTP/2 makes multiple `<link>`s cheap.
3. **Inline styles → the existing utility-class layer, extended.** Reuse the
   utilities already in `app.css` (`.color-muted`, `.text-right`, `.fs-075`,
   `.flex-between`, `.admin-monospace`, `.decoration-underline`,
   `.align-items-center`) and add the missing ones. The 2 boolean-conditional
   inline styles become conditional class names (no CSS var needed).
4. **Theming = tokenize the single dark theme only.** Extract magic hex/rgba
   into `:root` custom properties (incl. a new `--color-danger`); keep the one
   dark theme. Light / `prefers-color-scheme` / a toggle are out of scope.
5. **`@layer` cascade layers are in scope.** Pico goes into a lower-priority
   `framework` layer and app CSS into an `app` layer, so app rules win
   predictably without `!important` wars.
6. **Do NOT rename the 7 test-pinned class names**: `.word-grid`,
   `.verification-card`, `.stage-progress`, `.verification-progress`,
   `.truthfulness-progress`, `.word-value` (and keep the `/static/htmx.min.js`
   path). `data-testid`s are independent of classes and safe.
7. **Sequential ordering** (tokens+@layer → inline elimination → file split):
   the monolith is split last, once tokens and class names are stable, to
   minimize churn and keep each PR reviewable.

## Work items

One subsection per future issue, in execution order.

### 1. Establish design tokens and `@layer` cascade over Pico

- **Depends on**: —
- **Context**: `static/app.css:1-28` defines ~15 `:root` custom properties, but
  ~60% of color usages are hardcoded hex/rgba magic values (answer-button colors
  `#102b28/#a1e0d8/#f3edf7/#332c43` at `:182,188,197,204`; gradients
  `rgba(196,164,206,*)` at `:261-276`; danger `#ff7675` at `:606,618,624,862`
  with **no** `--color-danger` token; `rgba(242,239,250,0.0x)` border/overlay
  patterns at `:414,437,476,526`). Pico is loaded first, `app.css` second, both
  as raw `<link>`s (`Layout.tsx:76-77`, `AdminLayout.tsx:20-21`) — no cascade
  control.
- **Deliverable**:
  1. All magic hex/rgba color values extracted into semantic `:root` tokens,
     including a new `--color-danger` and consolidated alpha/overlay tokens;
     call-sites switched to `var(…)`. Single dark theme retained.
  2. `@layer framework, app;` cascade order introduced: Pico brought into the
     `framework` layer and app CSS into the `app` layer. Since Pico is a raw
     `<link>`, layering it requires a per-layout CSS **entry file** that
     `@import`s Pico with `layer(framework)` and the app CSS with `layer(app)`;
     the two raw `<link>`s collapse to one entry `<link>` per layout. (Weigh the
     `@import` serialization cost vs multiple `<link>`s — see Open question 1.)
  3. No visual regression: colors render identically (tokens resolve to the same
     values).
- **Acceptance criteria**:
  - No hardcoded hex/rgba in `static/app.css` outside the `:root` token block
    (`grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" static/app.css` shows only `:root`).
  - `--color-danger` exists in `:root` and `.alert-error`/`.btn-outline-danger`/
    `.color-danger` reference it.
  - `@layer` order is declared; app rules override Pico without `!important`.
  - e2e green; no class renamed; `deno task ci` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent — bulk mechanical
    hex→token substitution; keep the churn out of main context.
  - _Targeted Verification_:
    `grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" static/app.css` and a local visual
    smoke via the preview server. Do NOT run full `deno task
    ci` per edit;
    run once at the end. Playwright is validated by CI, not locally (per
    AGENTS.md).

### 2. Eliminate all inline `style=` attributes

- **Depends on**: WI-1 (new utilities that reference colors use the tokens).
- **Context**: 42 inline `style=` across `ui/` — 40 static literals, 2
  boolean-conditional. Heavy duplication: badge ×4 (`AdminTicketsPage.tsx:80`,
  `AdminTicketDetailPage.tsx:74,380`), page-container ×4 (`HomePage.tsx:20`,
  `ConsentPage.tsx:15`, `NotFoundPage.tsx:6`, `LegalPage.tsx:13`), plus `flex:2`
  ×3, `text-align:right` ×2, `overflow-x:auto` ×2. Many map to utilities that
  already exist in `app.css`. The 2 dynamic ones are
  `AdminTicketDetailPage.tsx:95-97` (disabled button when
  `!isEnrichmentComplete`) and `:196-198` (border color
  `isVerified ? ins : del`).
- **Deliverable**:
  1. All 40 static inline styles replaced by utility classes — reuse existing
     ones, add the missing utilities to `app.css`. Collapse the badge and
     page-container duplicates into a shared class each.
  2. The 2 conditional inline styles replaced by conditional class names (e.g.
     `.btn-disabled` + `:disabled` styling; `.question-verified` /
     `.question-unverified`).
  3. The only remaining `style=` is the GTM `noscript` hide at `Layout.tsx:110`
     (functional, keep — or move to a `.gtm-noscript` class).
- **Acceptance criteria**:
  - `grep -rn "style=" ui/` returns nothing except the documented GTM noscript
    line (or zero if that too is classed).
  - None of the 7 pinned class names renamed; `data-testid`s intact.
  - e2e green; `deno task ci` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent — repetitive per-file
    edits across ~9 page/component files.
  - _Targeted Verification_: `grep -rn "style=" ui/` and
    `deno test tests/result_route_test.ts tests/stage2_route_test.ts` (the
    class/testid-asserting route tests). Full `deno task ci` once at the end.

### 3. Split the monolith into feature-partitioned CSS files

- **Depends on**: WI-2 (class set is stable after inline elimination).
- **Context**: after WI-1/WI-2, `static/app.css` is clean but still one
  ~900-line file disconnected from the components it styles. `Layout` wraps
  public pages; `AdminLayout` wraps admin pages; `LoginPage.tsx:14` renders its
  own `<html>`. `tests/agent_docs_test.ts:18` exempts `static/` from the
  AGENTS.md file-map check; `tests/stage2_route_test.ts:164` pins
  `/static/htmx.min.js`.
- **Deliverable**:
  1. `static/app.css` split into `static/css/*.css` by feature/domain (e.g.
     `tokens.css`, `base.css`, `stage.css`, `result.css`, `admin.css`,
     `login.css`) — each in `@layer app`.
  2. Per-layout entry files (extending WI-1's entry approach) that `@import`
     only the feature files each layout needs: `Layout` pulls public + shared,
     `AdminLayout` pulls admin + shared, `LoginPage` pulls login + shared. Pico
     stays in `layer(framework)`.
  3. `<link>` references updated in `Layout.tsx`, `AdminLayout.tsx`,
     `LoginPage.tsx`. Docs updated if any `static/` path is referenced
     (`AGENTS.md`, `docs/tech-details/*` if they mention `app.css`).
- **Acceptance criteria**:
  - No single monolithic `static/app.css`; styles live in `static/css/*.css`.
  - Each layout loads only its relevant CSS; all pages render identically
    (visual smoke).
  - `/static/htmx.min.js` path unchanged; `tests/agent_docs_test.ts` green
    (adjust the `static/` exemption only if the path shape changed).
  - e2e green; `deno task ci` green.
- **Token-Saving Checklist**:
  - _Subagent Instruction_: `self`-sandboxed subagent — file surgery + link
    rewiring; verbose, isolate it.
  - _Targeted Verification_: `deno test tests/agent_docs_test.ts` +
    preview-server visual smoke of one public, one admin, and the login page.
    Full `deno task ci` once at the end; e2e via CI.

## Out of scope

- **Bundler / CSS build pipeline** (esbuild/lightningcss/Vite), bundler CSS
  Modules, CSS Module Scripts — Decision 1.
- **Class-name scoping / hashing** — the user deprioritized isolation; the 7
  pinned names must stay stable anyway (Decision 6).
- **Light theme / `prefers-color-scheme` / theme toggle** — Decision 4; can be a
  follow-up once tokens exist (tokenization makes it cheap later).
- **Literal `.tsx`-adjacent style colocation via an SSR collector** — Decision 2
  rejected the custom infra; revisit only if feature-file colocation proves
  insufficient.

## Open questions

Non-blocking; resolve during the relevant item.

1. **`@import layer()` vs multiple `<link>`s** (WI-1/WI-3): `@import` gives
   clean layer control but serializes downloads; multiple `<link>`s parallelize
   but can't pull Pico into a layer without `@import`. Default: one entry file
   per layout using `@import layer()`, accepting the cost for a handful of small
   files. Trigger: if CSS load latency regresses noticeably, switch shared/base
   to a direct `<link>` and layer only what needs it. Owner: WI-1 implementer.
2. **Keep the GTM `noscript` inline hide or class it** (WI-2): trivial; default
   is to leave the one functional `style=` at `Layout.tsx:110`. Owner: WI-2
   implementer.
