---
id: "ADR-OFT-TRACEABILITY"
type: decision
name: "Traceability with OpenFastTrace (SUPERSEDED)"
status: superseded
justifies:
  - "REQ-QUALITY-GATES"
---

# Traceability with OpenFastTrace

## Context

A requirements-to-design-to-code-to-tests traceability matrix is needed. Source:
[`tech-details/test-tech-stack.md`](../../tech-details/test-tech-stack.md).

## Original Decision

Use **OpenFastTrace (OFT)** with `req~name~rev` tags in Markdown and
`[impl->req~...]` tags in code.

## Why It Was Superseded

OFT is a Java CLI and **requires a JRE**, which is too heavy for this project.
SARA replaces it; see [[ADR-TEST-TRACEABILITY]].
