import { parse as parseCsv } from "@std/csv";
import { words } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export interface FieldMapping {
  from: string | number;
  map?: Record<string, unknown>;
  default?: unknown;
  splitBy?: string;
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

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { line: number; reason: string }[];
}

export function validateConfig(config: unknown): ImportConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Config must be a JSON object");
  }
  const cfg = config as Record<string, unknown>;
  if (cfg.format !== "csv" && cfg.format !== "json") {
    throw new Error("Config format must be 'csv' or 'json'");
  }
  if (!cfg.fields || typeof cfg.fields !== "object") {
    throw new Error("Config fields mapping is required");
  }
  const fields = cfg.fields as Record<string, unknown>;
  if (!fields.value || typeof fields.value !== "object") {
    throw new Error("Config fields.value mapping is required");
  }
  const valueMapping = fields.value as Record<string, unknown>;
  if (
    typeof valueMapping.from !== "string" &&
    typeof valueMapping.from !== "number"
  ) {
    throw new Error("fields.value.from must be a string or a number");
  }
  if (
    cfg.onConflict &&
    !["update", "skip", "error"].includes(cfg.onConflict as string)
  ) {
    throw new Error("Config onConflict must be 'update', 'skip', or 'error'");
  }

  const validateField = (name: string) => {
    const fieldMapping = fields[name] as Record<string, unknown> | undefined;
    if (fieldMapping !== undefined) {
      if (typeof fieldMapping !== "object") {
        throw new Error(`Config fields.${name} must be an object`);
      }
      if (
        typeof fieldMapping.from !== "string" &&
        typeof fieldMapping.from !== "number"
      ) {
        throw new Error(`fields.${name}.from must be a string or a number`);
      }
      if (
        fieldMapping.splitBy !== undefined &&
        typeof fieldMapping.splitBy !== "string"
      ) {
        throw new Error(`fields.${name}.splitBy must be a string`);
      }
    }
  };
  validateField("isReal");
  validateField("difficulty");
  validateField("synonyms");
  validateField("antonyms");
  validateField("definition");

  return config as ImportConfig;
}

export function mapRow(
  row: unknown,
  config: ImportConfig,
): {
  value: string;
  isReal: boolean;
  difficulty: number;
  synonyms: string[];
  antonyms: string[];
  definition: string | null;
} {
  const getFieldValue = (
    fieldConfig: FieldMapping | undefined,
    fieldName: string,
    fallbackDefault: unknown,
  ) => {
    if (!fieldConfig) {
      return fallbackDefault;
    }
    const fromKey = fieldConfig.from;
    let rawVal: unknown = undefined;

    if (Array.isArray(row)) {
      const idx = typeof fromKey === "number"
        ? fromKey
        : parseInt(String(fromKey), 10);
      if (!isNaN(idx) && idx >= 0 && idx < row.length) {
        rawVal = row[idx];
      }
    } else if (row && typeof row === "object") {
      rawVal = (row as Record<string, unknown>)[String(fromKey)];
    }

    if (rawVal === undefined || rawVal === null || rawVal === "") {
      if (fieldConfig.default !== undefined) {
        return fieldConfig.default;
      }
      return undefined;
    }

    if (fieldConfig.map) {
      const valStr = String(rawVal);
      if (valStr in fieldConfig.map) {
        return fieldConfig.map[valStr];
      }
      if (fieldConfig.default !== undefined) {
        return fieldConfig.default;
      }
      throw new Error(
        `Value '${rawVal}' for field '${fieldName}' not found in map and no default provided`,
      );
    }

    return rawVal;
  };

  const getArrayFieldValue = (
    fieldConfig: FieldMapping | undefined,
  ): string[] => {
    if (!fieldConfig) {
      return [];
    }
    const fromKey = fieldConfig.from;
    let rawVal: unknown = undefined;

    if (Array.isArray(row)) {
      const idx = typeof fromKey === "number"
        ? fromKey
        : parseInt(String(fromKey), 10);
      if (!isNaN(idx) && idx >= 0 && idx < row.length) {
        rawVal = row[idx];
      }
    } else if (row && typeof row === "object") {
      rawVal = (row as Record<string, unknown>)[String(fromKey)];
    }

    if (rawVal === undefined || rawVal === null) {
      if (fieldConfig.default !== undefined) {
        if (Array.isArray(fieldConfig.default)) {
          return fieldConfig.default.map((v) => String(v).trim().toLowerCase())
            .filter(Boolean);
        }
        return [String(fieldConfig.default).trim().toLowerCase()].filter(
          Boolean,
        );
      }
      return [];
    }

    if (Array.isArray(rawVal)) {
      return rawVal.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    }

    const valStr = String(rawVal).trim();
    if (valStr === "") {
      if (fieldConfig.default !== undefined) {
        if (Array.isArray(fieldConfig.default)) {
          return fieldConfig.default.map((v) => String(v).trim().toLowerCase())
            .filter(Boolean);
        }
        return [String(fieldConfig.default).trim().toLowerCase()].filter(
          Boolean,
        );
      }
      return [];
    }

    if (fieldConfig.splitBy) {
      return valStr
        .split(fieldConfig.splitBy)
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
    }

    return [valStr.toLowerCase()];
  };

  // 1. Resolve 'value'
  const rawValue = getFieldValue(config.fields.value, "value", undefined);
  if (
    rawValue === undefined || rawValue === null ||
    String(rawValue).trim() === ""
  ) {
    throw new Error("Word value is missing or empty");
  }
  const value = String(rawValue).trim().toLowerCase();

  // 2. Resolve 'isReal'
  const rawIsReal = getFieldValue(config.fields.isReal, "isReal", true);
  let isReal: boolean;
  if (typeof rawIsReal === "boolean") {
    isReal = rawIsReal;
  } else if (rawIsReal !== undefined) {
    const str = String(rawIsReal).toLowerCase().trim();
    if (str === "true" || str === "1" || str === "yes") {
      isReal = true;
    } else if (str === "false" || str === "0" || str === "no") {
      isReal = false;
    } else {
      throw new Error(`Invalid boolean value '${rawIsReal}' for isReal`);
    }
  } else {
    isReal = true;
  }

  // 3. Resolve 'difficulty'
  const rawDiff = getFieldValue(config.fields.difficulty, "difficulty", 1);
  let difficulty: number;
  if (typeof rawDiff === "number") {
    difficulty = rawDiff;
  } else if (rawDiff !== undefined) {
    difficulty = parseInt(String(rawDiff).trim(), 10);
    if (isNaN(difficulty)) {
      throw new Error(`Invalid integer value '${rawDiff}' for difficulty`);
    }
  } else {
    difficulty = 1;
  }

  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw new Error(
      `Difficulty ${difficulty} must be an integer between 1 and 5`,
    );
  }

  // 4. Resolve 'synonyms'
  const synonyms = getArrayFieldValue(config.fields.synonyms);

  // 5. Resolve 'antonyms'
  const antonyms = getArrayFieldValue(config.fields.antonyms);

  // 6. Resolve 'definition'
  const rawDefinition = getFieldValue(
    config.fields.definition,
    "definition",
    null,
  );
  const definition = rawDefinition !== undefined && rawDefinition !== null
    ? String(rawDefinition).trim()
    : null;

  return { value, isReal, difficulty, synonyms, antonyms, definition };
}

export function parseRows(
  fileContent: string,
  config: ImportConfig,
): { rows: unknown[]; parseErrors: { line: number; reason: string }[] } {
  const parseErrors: { line: number; reason: string }[] = [];
  let parsedRows: unknown[] = [];

  if (config.format === "json") {
    let data: unknown;
    try {
      data = JSON.parse(fileContent);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse JSON file: ${errMsg}`);
    }
    if (!Array.isArray(data)) {
      throw new Error("JSON file must contain an array of objects");
    }
    parsedRows = data;
  } else {
    // CSV
    const hasHeader = config.hasHeader !== false; // default to true
    try {
      parsedRows = parseCsv(fileContent, {
        separator: config.delimiter || ",",
        skipFirstRow: hasHeader,
      }) as unknown[];
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse CSV file: ${errMsg}`);
    }
  }

  return { rows: parsedRows, parseErrors };
}

export async function executeImport(
  // deno-lint-ignore no-explicit-any
  db: any,
  fileContent: string,
  config: ImportConfig,
  dryRun = false,
): Promise<ImportResult> {
  const { rows } = parseRows(fileContent, config);
  const onConflict = config.onConflict || "update";

  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // 1. Fetch all existing words in the DB to check conflicts
  const existingWordsList = await db
    .select()
    .from(words);
  const existingMap = new Map<string, typeof words.$inferSelect>(
    existingWordsList.map((w: typeof words.$inferSelect) => [w.value, w]),
  );

  const arraysEqual = (a: string[] | undefined, b: string[] | undefined) => {
    const arrA = a || [];
    const arrB = b || [];
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
      if (arrA[i] !== arrB[i]) return false;
    }
    return true;
  };

  // Process rows one-by-one
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hasHeader = config.hasHeader !== false;
    const lineNum = config.format === "json"
      ? (i + 1)
      : (hasHeader ? (i + 2) : (i + 1));

    let mapped: ReturnType<typeof mapRow>;
    try {
      mapped = mapRow(row, config);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result.failed++;
      result.errors.push({ line: lineNum, reason: errMsg });
      continue;
    }

    const val = mapped.value;
    const existing = existingMap.get(val);

    if (existing) {
      // Conflict
      if (onConflict === "error") {
        result.failed++;
        result.errors.push({
          line: lineNum,
          reason: `Conflict: Word '${val}' already exists in database`,
        });
      } else if (onConflict === "skip") {
        result.skipped++;
      } else {
        // update
        const currentIsReal = existing.isReal;
        const currentDiff = existing.difficulty;
        const currentSynonyms = existing.synonyms || [];
        const currentAntonyms = existing.antonyms || [];
        const currentDefinition = existing.definition;

        const mappedSynonyms = mapped.synonyms;
        const mappedAntonyms = mapped.antonyms;
        const mappedDefinition = mapped.definition;

        if (
          currentIsReal !== mapped.isReal ||
          currentDiff !== mapped.difficulty ||
          !arraysEqual(currentSynonyms, mappedSynonyms) ||
          !arraysEqual(currentAntonyms, mappedAntonyms) ||
          currentDefinition !== mappedDefinition
        ) {
          if (!dryRun) {
            await db
              .update(words)
              .set({
                isReal: mapped.isReal,
                difficulty: mapped.difficulty,
                synonyms: mappedSynonyms,
                antonyms: mappedAntonyms,
                definition: mappedDefinition,
              })
              .where(eq(words.id, existing.id));
          }
          result.updated++;
          // Update in-memory map
          existing.isReal = mapped.isReal;
          existing.difficulty = mapped.difficulty;
          existing.synonyms = mappedSynonyms;
          existing.antonyms = mappedAntonyms;
          existing.definition = mappedDefinition;
        } else {
          result.skipped++; // no changes needed, acts as skipped
        }
      }
    } else {
      // New word
      if (!dryRun) {
        const insertResult = await db
          .insert(words)
          .values({
            value: mapped.value,
            isReal: mapped.isReal,
            difficulty: mapped.difficulty,
            synonyms: mapped.synonyms,
            antonyms: mapped.antonyms,
            definition: mapped.definition,
          })
          .returning({ id: words.id });
        existingMap.set(val, {
          id: insertResult[0]?.id || 0,
          value: mapped.value,
          isReal: mapped.isReal,
          difficulty: mapped.difficulty,
          reviewed: false,
          reviewedAt: null,
          synonyms: mapped.synonyms,
          antonyms: mapped.antonyms,
          definition: mapped.definition,
        });
      } else {
        // For dry-run, we also add to existingMap to simulate subsequent duplicates check
        existingMap.set(val, {
          id: 0,
          value: mapped.value,
          isReal: mapped.isReal,
          difficulty: mapped.difficulty,
          reviewed: false,
          reviewedAt: null,
          synonyms: mapped.synonyms,
          antonyms: mapped.antonyms,
          definition: mapped.definition,
        });
      }
      result.inserted++;
    }
  }

  return result;
}
