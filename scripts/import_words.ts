import { parseArgs } from "@std/cli/parse-args";
import { executeImport, validateConfig } from "./importer_core.ts";
import { createDatabase } from "../db/client.ts";

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["file", "config"],
    boolean: ["dry-run"],
  });

  const filePath = args.file;
  const configPath = args.config;
  const dryRun = !!args["dry-run"];

  if (!filePath) {
    console.error("Error: --file argument is required");
    Deno.exit(1);
  }
  if (!configPath) {
    console.error("Error: --config argument is required");
    Deno.exit(1);
  }

  // Read file content
  let fileContent: string;
  try {
    fileContent = Deno.readTextFileSync(filePath);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `Error: Failed to read file at '${filePath}': ${errMsg}`,
    );
    Deno.exit(1);
  }

  // Read and parse config
  let configContent: string;
  try {
    configContent = Deno.readTextFileSync(configPath);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `Error: Failed to read config file at '${configPath}': ${errMsg}`,
    );
    Deno.exit(1);
  }

  let rawConfig: unknown;
  try {
    // Basic JSON parser to read config
    rawConfig = JSON.parse(configContent);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Config file is not valid JSON: ${errMsg}`);
    Deno.exit(1);
  }

  let config: ReturnType<typeof validateConfig>;
  try {
    config = validateConfig(rawConfig);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Config validation failed: ${errMsg}`);
    Deno.exit(1);
  }

  const { client, db } = createDatabase();
  try {
    const result = await executeImport(db, fileContent, config, dryRun);
    console.log("\nImport Summary:");
    console.log(`  Inserted: ${result.inserted}`);
    console.log(`  Updated:  ${result.updated}`);
    console.log(`  Skipped:  ${result.skipped}`);
    console.log(`  Failed:   ${result.failed}`);

    if (result.errors.length > 0) {
      console.log("\nRow Errors:");
      for (const err of result.errors) {
        console.log(`  Line ${err.line}: ${err.reason}`);
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Error during import: ${errMsg}`);
    Deno.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  await main();
}
