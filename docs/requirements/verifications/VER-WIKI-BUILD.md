---
id: "VER-WIKI-BUILD"
type: verification
name: "Wiki compiler and build script unit tests"
method: utest
verifies:
  - "REQ-QUALITY-GATES"
---

# Verification: Wiki Build Script Unit Tests

Covers the offline markdown wiki parsing and compilation scripts against
[REQ-QUALITY-GATES](../requirements/REQ-QUALITY-GATES.md).

## Code under verification

- `scripts/build_wiki.ts` — contains the compiler logic to convert the
  repository's SARA requirements documents and roadmap docs into a flat wiki
  layout compatible with GitHub Wiki.

## Tests

- `tests/wiki_build_test.ts` (`deno test`):
  - derivePageName keeps stable wiki names for published docs;
  - renderWikiPage strips frontmatter and rewrites wiki links;
  - renderWikiPage adds a heading to prose pages without one;
  - renderWikiSidebar and renderWikiFooter use friendly wiki targets.

## Requirement coverage

- _SARA traceability_ and _CI gates_ — validates formatting and logic of SARA
  requirements documents conversion to standard wiki documentation, ensuring
  automatic quality gates are met in repository maintenance pipelines.
