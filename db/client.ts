import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export function createDatabase(databaseUrl = Deno.env.get("DATABASE_URL")) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(databaseUrl, { prepare: false });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];

/**
 * Opens a database connection, runs `fn`, and always closes the connection —
 * removing the repeated `createDatabase()` / `try { ... } finally { client.end() }`
 * boilerplate from every loader method.
 */
export async function withDb<T>(
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  const { client, db } = createDatabase();
  try {
    return await fn(db);
  } finally {
    await client.end();
  }
}
