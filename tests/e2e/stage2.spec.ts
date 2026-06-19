import { expect, test } from "@playwright/test";

test("stage 2 renders one verification card after stage 1 submission", async ({ page }) => {
  await page.goto("/stage/1");

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).check();

  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");
  await expect(page.getByRole("heading", { name: /stage 2/i })).toBeVisible();
  await expect(page.locator(".verification-card")).toHaveCount(1);
  await expect(page.locator(".stage-progress")).toHaveText("Word 1 of 3");
});

test("stage 2 shows Know and Don't know buttons", async ({ page }) => {
  await page.goto("/stage/1");

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");

  await expect(page.getByRole("button", { name: /^know$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /don't know/i })).toBeVisible();
});

test("stage 2 advances one htmx card at a time", async ({ page }) => {
  await page.goto("/stage/1");

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");
  const firstWord = await page.locator(".word-value").textContent();
  await page.getByRole("button", { name: /^know$/i }).click();

  await expect(page).toHaveURL("/stage/2");
  await expect(page.locator(".stage-progress")).toHaveText("Word 2 of 2");
  await expect(page.locator(".word-value")).not.toHaveText(firstWord ?? "");
});

test("stage 2 result page shows score and truthfulness", async ({ page }) => {
  await page.goto("/stage/1");

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /^know$/i }).click();

  await expect(page).toHaveURL("/result");
  await expect(page.getByTestId("score")).toBeVisible();
  await expect(page.getByTestId("truthfulness")).toBeVisible();
});

test("stage 2 is accessible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/stage/1");

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");
  await expect(page.getByRole("heading", { name: /stage 2/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^know$/i })).toBeVisible();

  await page.getByRole("button", { name: /^know$/i }).click();
  await expect(page).toHaveURL("/result");

  await context.close();
});

test("/result redirects to /stage/2 after stage 1 but before stage 2", async ({ page }) => {
  await page.goto("/stage/1");
  await page.locator('.word-grid input[type="checkbox"]').nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();
  await expect(page).toHaveURL("/stage/2");

  await page.goto("/result");

  await expect(page).toHaveURL("/stage/2");
});
