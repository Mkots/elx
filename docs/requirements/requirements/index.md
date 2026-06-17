# Requirements

All system requirements for the ELX vocabulary test. Each requirement is a
Markdown file with YAML frontmatter, managed by [SARA](../README.md).

## By Category

### Core Test Flow

| ID                                                      | Name                         | Status   |
| ------------------------------------------------------- | ---------------------------- | -------- |
| [REQ-WORD-SELECTION](REQ-WORD-SELECTION.md)             | Core LexTALE word selection  | accepted |
| [REQ-VERIFICATION-SCORING](REQ-VERIFICATION-SCORING.md) | Verification and scoring     | accepted |
| [REQ-SSR-STAGE-FLOW](REQ-SSR-STAGE-FLOW.md)             | SSR rendering and stage flow | accepted |
| [REQ-SESSION-STATE](REQ-SESSION-STATE.md)               | Session state (Deno KV)      | accepted |

### Optional Challenges

| ID                                                | Name                            | Status       |
| ------------------------------------------------- | ------------------------------- | ------------ |
| [REQ-SYNONYMS-ANTONYMS](REQ-SYNONYMS-ANTONYMS.md) | Synonyms and antonyms challenge | accepted     |
| [REQ-SPELLING](REQ-SPELLING.md)                   | Contextual spelling challenge   | accepted     |
| [REQ-MEANING](REQ-MEANING.md)                     | Meaning challenge (definitions) | accepted     |
| [REQ-SEMANTIC-USAGE](REQ-SEMANTIC-USAGE.md)       | Semantic usage challenge        | **deferred** |

### Data and Infrastructure

| ID                                              | Name                                           | Status   |
| ----------------------------------------------- | ---------------------------------------------- | -------- |
| [REQ-QUESTION-BANK](REQ-QUESTION-BANK.md)       | Offline question bank generation               | accepted |
| [REQ-DATA-PERSISTENCE](REQ-DATA-PERSISTENCE.md) | Persistent data storage (PostgreSQL + Drizzle) | accepted |
| [REQ-DEPLOYMENT](REQ-DEPLOYMENT.md)             | Deployment, containerization, and CI/CD        | accepted |
| [REQ-BACKUPS](REQ-BACKUPS.md)                   | Database backups                               | accepted |
| [REQ-OBSERVABILITY](REQ-OBSERVABILITY.md)       | Observability                                  | accepted |
| [REQ-QUALITY-GATES](REQ-QUALITY-GATES.md)       | Automated quality gates and traceability       | accepted |
