import { defineConfig } from "@playwright/test";

function loadEnvFile(path: string): Record<string, string> {
  try {
    return Object.fromEntries(
      Deno.readTextFileSync(path)
        .split("\n")
        .flatMap((line) => {
          const m = line.trim().replace(/^export\s+/, "").match(
            /^([^#=][^=]*)=(.*)/,
          );
          return m
            ? [[m[1].trim(), m[2].trim().replace(/^["']|["']$/g, "")]]
            : [];
        }),
    );
  } catch {
    return {};
  }
}

const envFile = loadEnvFile(".env");
const getEnv = (key: string) => Deno.env.get(key) ?? envFile[key] ?? "";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Deno.env.get("CI") === "true",
  retries: Deno.env.get("CI") === "true" ? 2 : 0,
  reporter: Deno.env.get("CI") === "true" ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "deno task start:e2e",
    url: "http://127.0.0.1:8000/health",
    reuseExistingServer: Deno.env.get("CI") !== "true",
    timeout: 30_000,
    env: {
      DATABASE_URL: getEnv("DATABASE_URL"),
      DENO_KV_PATH: getEnv("DENO_KV_PATH") || ".data/elx.sqlite3",
      ADMIN_USERNAME: getEnv("ADMIN_USERNAME") || "admin",
      ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD") || "admin",
    },
  },
});
