import { app } from "./app.ts";
import { closeDatabase } from "./db/client.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");

// Graceful shutdown on SIGTERM
Deno.addSignalListener("SIGTERM", async () => {
  console.log("SIGTERM received. Closing database connection pool...");
  await closeDatabase();
  console.log("Database connection pool closed. Exiting process.");
  Deno.exit(0);
});

Deno.serve({ hostname: "0.0.0.0", port }, app.fetch);
