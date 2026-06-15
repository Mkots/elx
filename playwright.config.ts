import { defineConfig } from "@playwright/test";

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
    command: "deno task start",
    url: "http://127.0.0.1:8000/health",
    reuseExistingServer: Deno.env.get("CI") !== "true",
    timeout: 30_000,
  },
});
