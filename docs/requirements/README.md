# LexTALE Requirements (SARA)

Requirements are managed with [SARA](https://github.com/cledouarec/sara), a Rust
CLI that stores requirements as Markdown files with YAML frontmatter and builds
a traceability graph. It replaces the previously considered OpenFastTrace, which
required a JRE and was too heavy; see
[`decisions/ADR-TEST-TRACEABILITY.md`](decisions/ADR-TEST-TRACEABILITY.md).

## Structure

```text
requirements/
├── sara.toml                 # configuration: model and repository paths
├── model.yaml                # lightweight model: solution -> requirement, plus ADR and verification
├── solutions/                # SOL-* root product documents
├── requirements/             # REQ-* logical units developed independently
└── decisions/                # ADR-* architecture decisions from tech-details
```

Each file is one SARA item and one logical unit. Source material lives in
`../roadmap/` and `../tech-details/`.

## Model

| Type           | Prefix | Purpose                                        | Relations                                      |
| -------------- | ------ | ---------------------------------------------- | ---------------------------------------------- |
| `solution`     | `SOL`  | Entire product                                 | None                                           |
| `requirement`  | `REQ`  | Independently developed unit                   | `refines` solution; `depends_on` requirement   |
| `decision`     | `ADR`  | Decision from technical documentation          | `justifies` requirement; `supersedes` decision |
| `verification` | `VER`  | Test or coverage item added during development | `verifies` requirement                         |

A `requirement` has a `specification` containing an RFC 2119 keyword such as
SHALL or MUST, and a `status` of `accepted` or `deferred`. A `decision` has a
status of `accepted` or `superseded`.

## Commands

```bash
sara check                               # validate IDs, links, cycles, and orphans
sara report coverage                     # coverage
sara report matrix                       # traceability matrix
sara query REQ-WORD-SELECTION            # item relations
sara query REQ-WORD-SELECTION --upstream # upstream chain
```

Run all commands from this directory, where the default configuration is
`sara.toml`.

## Installation

```bash
cargo install --git https://github.com/cledouarec/sara sara-cli # requires rustc >= 1.95
```

In CI, `sara check` blocks merges when requirements are uncovered or links are
broken; see
[`requirements/REQ-QUALITY-GATES.md`](requirements/REQ-QUALITY-GATES.md).

## Test Coverage

Coverage is represented by `verification` items related to requirements through
`verifies`, created as tests are written. Requirements with `status: deferred`,
such as [`REQ-SEMANTIC-USAGE`](requirements/REQ-SEMANTIC-USAGE.md), are excluded
from mandatory coverage.
