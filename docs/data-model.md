# Data Model Specification: Denormalized Word Entity (Wide Words)

This document describes the design and specification for the denormalized `Word`
entity, which simplifies content authoring and aligns the database schema with
the requirements of Stage 3 (Synonyms and Antonyms) and Stage 5
(Definitions/Meaning).

---

## 1. "Word" Entity Specification

The `words` table is denormalized to include synonyms, antonyms, and a single
definition directly on each word row. This avoids strict foreign-key
relationships to other rows in the `words` table for related terms, enabling the
inclusion of rare words or pseudowords in synonym/antonym lists without needing
to insert them as separate entity rows in `words`.

### Table: `words`

| Column Name   | Database Type | Drizzle/TS Type | Nullability  | Default                       | Description                                                                                |
| :------------ | :------------ | :-------------- | :----------- | :---------------------------- | :----------------------------------------------------------------------------------------- |
| `id`          | `integer`     | `number`        | **NOT NULL** | _Identity (Generated Always)_ | Primary key, auto-incrementing identifier.                                                 |
| `value`       | `text`        | `string`        | **NOT NULL** |                               | The lowercase word string (must be unique).                                                |
| `is_real`     | `boolean`     | `boolean`       | **NOT NULL** |                               | `true` if it is a real English word; `false` if it is a pseudoword.                        |
| `difficulty`  | `integer`     | `number`        | **NOT NULL** |                               | Difficulty level on a scale from 1 (e.g., common words) to 5 (rare words).                 |
| `reviewed`    | `boolean`     | `boolean`       | **NOT NULL** | `false`                       | Status indicating if the word and its metadata have been reviewed.                         |
| `reviewed_at` | `timestamp`   | `Date`          | _NULLABLE_   | `null`                        | Timestamp when the word was reviewed.                                                      |
| `synonyms`    | `text[]`      | `string[]`      | **NOT NULL** | `'{}'` (empty array)          | Flat list of synonym strings. May include rare/pseudowords not present as rows in `words`. |
| `antonyms`    | `text[]`      | `string[]`      | **NOT NULL** | `'{}'` (empty array)          | Flat list of antonym strings. May include rare/pseudowords not present as rows in `words`. |
| `definition`  | `text`        | `string`        | _NULLABLE_   | `null`                        | A single definition sentence or text snippet for the word.                                 |

### Drizzle Schema Definition snippet:

```typescript
export const words = pgTable("words", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  value: text().notNull().unique(),
  isReal: boolean("is_real").notNull(),
  difficulty: integer().notNull(),
  reviewed: boolean().notNull().default(false),
  reviewedAt: timestamp("reviewed_at"),
  synonyms: text("synonyms").array().notNull().default(sql`'{}'::text[]`),
  antonyms: text("antonyms").array().notNull().default(sql`'{}'::text[]`),
  definition: text("definition"),
});
```

---

## 2. Rationale: `text[]` vs `jsonb` for Synonyms & Antonyms

For storing flat lists of related terms (synonyms and antonyms), we recommend
using PostgreSQL's native **`text[]`** (array of text) instead of `jsonb`.

### Why `text[]` is preferred:

1. **No Per-Item Metadata**: Synonyms and antonyms are plain strings. We do not
   store weights, parts of speech, or source attributes on individual related
   words.
2. **Simplified Validation & Strict Typing**: In Drizzle, `.array()` maps
   directly to TypeScript `string[]`. With `jsonb`, we would need custom runtime
   type guards or schemas to assert that the value is an array of strings.
3. **Storage Efficiency**: A PostgreSQL text array has lower overhead compared
   to `jsonb`, which stores additional keys, types, and structure metadata.
4. **Ease of DB Operations**: Postgres array functions (like `any`, `unnest`,
   and array overlap operators) are simpler to use than `jsonb` array extraction
   functions when inspecting or querying arrays.
5. **Decoupled Distractors**: Distractors and context sentences are
   constructed/resolved at ticket-generation time (stored on the ticket entity
   in `[DB refactor 4]`+), so the `words` table does not need to store metadata
   about distractor indices or relationships.

---

## 3. Import Format Specification

To support importing the denormalized fields, the import config schema in
`scripts/importer_core.ts` is extended.

### Extension of `FieldMapping` & `ImportConfig`

We introduce an optional property **`splitBy`** to `FieldMapping` to split a
single string column value (e.g., in a CSV) into a text array.

```typescript
export interface FieldMapping {
  from: string | number;
  map?: Record<string, unknown>;
  default?: unknown;
  splitBy?: string; // Character to split string values into arrays (e.g., ";")
}

export interface ImportConfig {
  format: "csv" | "json";
  delimiter?: string;
  hasHeader?: boolean;
  fields: {
    value: FieldMapping;
    isReal?: FieldMapping;
    difficulty?: FieldMapping;
    synonyms?: FieldMapping;
    antonyms?: FieldMapping;
    definition?: FieldMapping;
  };
  onConflict?: "update" | "skip" | "error";
}
```

### Import Source Examples

#### Option A: CSV / Excel Source

For CSV imports, multiple values within a column are separated by a semicolon
`;` (or another designated character) to avoid conflict with the comma `,`
delimiter of the CSV file.

```csv
value,isReal,difficulty,synonyms,antonyms,definition
morning,true,1,sunrise;dawn,night;dusk,The period of time between midnight and noon
plimber,false,3,,,
fealty,true,5,loyalty;fidelity,treason;perfidy,The fidelity of a vassal or feudal tenant to his lord
```

**Matching Mapping Configuration (`import-config.json`):**

```json
{
  "format": "csv",
  "delimiter": ",",
  "hasHeader": true,
  "fields": {
    "value": { "from": "value" },
    "isReal": { "from": "isReal" },
    "difficulty": { "from": "difficulty" },
    "synonyms": { "from": "synonyms", "splitBy": ";" },
    "antonyms": { "from": "antonyms", "splitBy": ";" },
    "definition": { "from": "definition" }
  },
  "onConflict": "update"
}
```

#### Option B: JSON Source

For JSON, arrays are mapped directly.

```json
[
  {
    "value": "morning",
    "isReal": true,
    "difficulty": 1,
    "synonyms": ["sunrise", "dawn"],
    "antonyms": ["night", "dusk"],
    "definition": "The period of time between midnight and noon"
  },
  {
    "value": "plimber",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null
  }
]
```

**Matching Mapping Configuration:**

```json
{
  "format": "json",
  "fields": {
    "value": { "from": "value" },
    "isReal": { "from": "isReal" },
    "difficulty": { "from": "difficulty" },
    "synonyms": { "from": "synonyms" },
    "antonyms": { "from": "antonyms" },
    "definition": { "from": "definition" }
  },
  "onConflict": "update"
}
```

---

## 4. Migration & Backfill Strategy

To migrate existing normalized data to the new wide `words` model (to be
implemented in `[DB refactor 2]`):

1. **Alter `words` table**:
   - Add nullable or default-empty columns: `synonyms` (`text[]`), `antonyms`
     (`text[]`), `definition` (`text`).
2. **Backfill Synonyms & Antonyms**:
   - Query the existing `synonyms` table:
     ```sql
     SELECT 
       s.word_id,
       s.relation_type,
       w_target.value AS target_value
     FROM synonyms s
     JOIN words w_target ON s.target_id = w_target.id;
     ```
   - Group the results by `word_id` and `relation_type`.
   - Update each corresponding row in the `words` table:
     - Set `synonyms = array_agg(target_value)` where
       `relation_type = 'synonym'`.
     - Set `antonyms = array_agg(target_value)` where
       `relation_type = 'antonym'`.
3. **Backfill Definitions**:
   - Query the existing `definitions` table:
     ```sql
     SELECT word_id, definition_text FROM definitions;
     ```
   - Update each corresponding row in the `words` table, setting
     `definition = definition_text`.
4. **Make columns strict**:
   - Alter `synonyms` and `antonyms` columns on `words` to `NOT NULL` with
     default `'{}'::text[]` once the backfill is complete.
5. **Retain Old Tables (Temporary)**:
   - Keep the old `synonyms`, `definitions`, and `spelling_challenges` tables in
     the database until the Admin CRUD interfaces are updated to edit the new
     schema in `[DB refactor 3]`.

---

## 5. Test Ticket & Questions Snapshot Entity Specification

This section describes the design for the persisted, reusable **Test Ticket**
(`tickets`) entity and its snapshot questions, which enables serving identical,
immutable tests to users and recording exactly which questions they answered in
their test history.

### Rationale: JSONB Array for Snapshot Questions

Instead of a separate `ticket_questions` table with multiple joins and foreign
keys, we store questions as a **`jsonb` array** directly on the `tickets` table.

- **Immutability & Snapshotting**: A ticket, once published, is immutable.
  Storing questions as a single document guarantees that dictionary edits do not
  affect past tests.
- **Zero Joins**: Loading a ticket and all its questions requires only a single
  `SELECT` on `tickets`.
- **Discriminated Types**: Each question in the JSONB array has a `type`
  discriminator, allowing easy polymorphic handling in TypeScript/Hono.
- **Decoupled from Words**: Storing raw strings instead of word ID foreign keys
  ensures scoring can run purely from the snapshot without querying the `words`
  table.

### Table: `tickets`

| Column Name  | Database Type | Drizzle/TS Type                                  | Nullability  | Default             | Description                                                                            |
| :----------- | :------------ | :----------------------------------------------- | :----------- | :------------------ | :------------------------------------------------------------------------------------- |
| `id`         | `integer`     | `number`                                         | **NOT NULL** | _Identity (Always)_ | Primary key, auto-incrementing identifier.                                             |
| `code`       | `text`        | `string`                                         | **NOT NULL** |                     | Human-readable code (must be unique, e.g. `ELX-T-0001`).                               |
| `status`     | `text`        | `'draft' \| 'base' \| 'complete' \| 'published'` | **NOT NULL** | `'draft'`           | Ticket lifecycle status.                                                               |
| `title`      | `text`        | `string`                                         | _NULLABLE_   | `null`              | Optional title/label for the ticket.                                                   |
| `notes`      | `text`        | `string`                                         | _NULLABLE_   | `null`              | Optional notes or curation comments.                                                   |
| `questions`  | `jsonb`       | `SnapshotQuestion[]`                             | **NOT NULL** | `'[]'`              | Array of JSON snapshot questions containing prompts, correct answers, and distractors. |
| `created_at` | `timestamp`   | `Date`                                           | **NOT NULL** | `now()`             | Timestamp when the ticket was created.                                                 |
| `updated_at` | `timestamp`   | `Date`                                           | **NOT NULL** | `now()`             | Timestamp when the ticket was last updated.                                            |

### Schema updates for `test_history`

To link a test attempt to the exact ticket served:

- Add a nullable column `ticket_id` (`integer`) referencing `tickets.id`. It is
  nullable to preserve history for older tests completed prior to ticket
  introduction.

### TypeScript Definition for `SnapshotQuestion`

```typescript
export type QuestionType =
  | "verification"
  | "synonym"
  | "spelling"
  | "definition";

export interface BaseSnapshotQuestion {
  type: QuestionType;
}

export interface VerificationSnapshotQuestion extends BaseSnapshotQuestion {
  type: "verification";
  wordText: string;
  isReal: boolean;
}

export interface SynonymSnapshotQuestion extends BaseSnapshotQuestion {
  type: "synonym";
  promptText: string;
  correctText: string;
  distractors: string[];
}

export interface SpellingSnapshotQuestion extends BaseSnapshotQuestion {
  type: "spelling";
  contextSentence: string;
  correctText: string;
  distractors: string[];
}

export interface DefinitionSnapshotQuestion extends BaseSnapshotQuestion {
  type: "definition";
  definitionText: string;
  correctText: string;
  distractors: string[];
}

export type SnapshotQuestion =
  | VerificationSnapshotQuestion
  | SynonymSnapshotQuestion
  | SpellingSnapshotQuestion
  | DefinitionSnapshotQuestion;
```

### Ticket Status Lifecycle

1. **`draft`**: The ticket has just been created or is being edited. It is not
   ready to be served or fully populated yet.
2. **`base`**: The ticket is populated with the base set of words (Stage 1) but
   lacks distractors or Stage 2 question metadata.
3. **`complete`**: The questions are fully populated with distractors and Stage
   2 metadata.
4. **`published`**: The ticket is active and ready to be served. Only tickets in
   this status can be retrieved for normal testing by users.
