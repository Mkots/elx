# Word Import Mapping Configuration

This page documents the format and behavior of the configuration JSON used to
map and import words from external CSV or JSON files.

## Configuration Schema

The mapping configuration is defined as a JSON object with the following
properties:

| Property     | Type    | Required | Description                                                                                      |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------------------------ |
| `format`     | string  | **Yes**  | The format of the source file. Must be `"csv"` or `"json"`.                                      |
| `onConflict` | string  | No       | Strategy when a word value already exists. Must be `"update"` (default), `"skip"`, or `"error"`. |
| `delimiter`  | string  | No       | CSV column separator. Default is `","`. (CSV only)                                               |
| `hasHeader`  | boolean | No       | Whether the CSV file contains a header row. Default is `true`. (CSV only)                        |
| `fields`     | object  | **Yes**  | Mappings for target schema fields (`value`, `isReal`, `difficulty`).                             |

### Field Mappings (`fields`)

Inside `fields`, each property represents a target column in the database. Only
`value` is strictly required; `isReal` and `difficulty` are optional and will
fallback to default values (`isReal: true`, `difficulty: 1`) if omitted.

Each field mapping supports the following properties:

- **`from`** (string | number, **Required**): The key name (for JSON/CSV with
  header) or index position (for CSV without header, e.g. `0`, `1`) in the
  source row to extract the value from.
- **`default`** (any, Optional): A fallback value to use if the source field is
  missing, empty (`""`), or not matched by the map dictionary.
- **`map`** (object, Optional): A value-mapping dictionary that converts raw
  source strings to target types (e.g. mapping `"real"` / `"pseudo"` to
  booleans, or difficulty terms to levels).

---

## Examples

### 1. CSV Source with Header (and value conversion maps)

Suppose we have a CSV file `words.csv`:

```csv
term,type,difficulty_level
morning,real,easy
plimber,fake,medium
fealty,real,hard
```

The mapping configuration would look like:

```json
{
  "format": "csv",
  "delimiter": ",",
  "hasHeader": true,
  "fields": {
    "value": { "from": "term" },
    "isReal": {
      "from": "type",
      "map": { "real": true, "fake": false }
    },
    "difficulty": {
      "from": "difficulty_level",
      "map": { "easy": 1, "medium": 3, "hard": 5 },
      "default": 1
    }
  },
  "onConflict": "update"
}
```

### 2. CSV Source without Header (using column indices)

Suppose we have a raw CSV file:

```csv
garden,1,1
kitten,1,1
plound,0,2
```

The mapping configuration using column indices:

```json
{
  "format": "csv",
  "hasHeader": false,
  "fields": {
    "value": { "from": 0 },
    "isReal": { "from": 1 },
    "difficulty": { "from": 2 }
  }
}
```

### 3. JSON Array of Objects

Suppose we have a JSON file:

```json
[
  { "word": "window", "is_real_word": "yes", "level": 1 },
  { "word": "snerdle", "is_real_word": "no", "level": 2 }
]
```

The mapping configuration:

```json
{
  "format": "json",
  "fields": {
    "value": { "from": "word" },
    "isReal": {
      "from": "is_real_word",
      "map": { "yes": true, "no": false }
    },
    "difficulty": { "from": "level" }
  }
}
```
