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
