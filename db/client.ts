import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

function getDatabaseType() {
  // deno-lint-ignore no-explicit-any
  const client = {} as any;
  return drizzle(client, { schema });
}
export type Database = ReturnType<typeof getDatabaseType>;

let lazyClient: ReturnType<typeof postgres> | null = null;
let lazyDb: Database | null = null;

// Load environment variables from .env if not present (for local testing)
function populateEnv() {
  try {
    const text = Deno.readTextFileSync(".env");
    for (const line of text.split("\n")) {
      const parts = line.trim().split("=");
      if (parts.length >= 2 && !parts[0].startsWith("#")) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replaceAll(
          /^["']|["']$/g,
          "",
        );
        if (key && !Deno.env.get(key)) {
          Deno.env.set(key, value);
        }
      }
    }
  } catch {
    // Ignore if .env is missing
  }
}

function initDb() {
  if (!lazyDb) {
    populateEnv();
    const databaseUrl = Deno.env.get("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    lazyClient = postgres(databaseUrl, { prepare: false, max: 10 });
    lazyDb = drizzle(lazyClient, { schema });
  }
  return { db: lazyDb, client: lazyClient };
}

// deno-lint-ignore no-explicit-any
export const db: Database = new Proxy({} as any, {
  get(_target: unknown, prop: string | symbol, receiver: unknown) {
    const { db } = initDb();
    return Reflect.get(db, prop, receiver);
  },
});

export async function closeDatabase() {
  if (lazyClient) {
    await lazyClient.end();
    lazyClient = null;
    lazyDb = null;
  }
}
