import { expect, test } from "@playwright/test";

test("renders the home page and health endpoint", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hello, ELX." }))
    .toBeVisible();

  await page.getByRole("link", { name: "Check health" }).click();
  await expect(page.locator("body")).toContainText('"status":"ok"');
});
