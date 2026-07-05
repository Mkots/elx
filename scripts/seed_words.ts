import { closeDatabase, type Database, db } from "../db/client.ts";
import { executeImport, type ImportConfig } from "./importer_core.ts";

export const SEED_CSV_PATH = new URL(
  "../pipeline/data/seed_words.csv",
  import.meta.url,
);

export const SEED_IMPORT_CONFIG: ImportConfig = {
  format: "csv",
  fields: {
    value: { from: "value" },
    isReal: { from: "is_real" },
    difficulty: { from: "difficulty" },
    synonyms: { from: "synonyms", splitBy: ";" },
    antonyms: { from: "antonyms", splitBy: ";" },
    definition: { from: "definition" },
  },
  onConflict: "update",
};

/** Content-addressed version tag for a word bank CSV: `sha256:<hex digest>`. */
export async function computeBankVersion(content: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

export async function seedWords(db: Database): Promise<number> {
  const csvContent = await Deno.readTextFile(SEED_CSV_PATH);
  const bankVersion = await computeBankVersion(csvContent);
  const result = await executeImport(
    db,
    csvContent,
    SEED_IMPORT_CONFIG,
    false,
    bankVersion,
  );
  return result.inserted + result.updated + result.skipped;
}

if (import.meta.main) {
  try {
    const count = await seedWords(db);
    console.log(`Seeded ${count} words (real + pseudowords).`);
  } finally {
    await closeDatabase();
  }
}
