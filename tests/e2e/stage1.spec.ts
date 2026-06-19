import { expect, test } from "@playwright/test";

test("stage 1 renders word grid with checkboxes", async ({ page }) => {
  await page.goto("/stage/1");

  await expect(
    page.getByRole("heading", { name: /stage 1/i }),
  ).toBeVisible();

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await expect(checkboxes.first()).toBeVisible();
  expect(await checkboxes.count()).toBeGreaterThan(0);
});

test("stage 1 form submits and redirects to stage 2", async ({ page }) => {
  await page.goto("/stage/1");

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).check();

  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");
});

test("stage 1 sets sessionId cookie on submit", async ({ page }) => {
  await page.goto("/stage/1");
  await page.getByRole("button", { name: /next/i }).click();

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "sessionId");

  expect(session).toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
});

test("stage 1 is accessible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/stage/1");

  await expect(
    page.getByRole("heading", { name: /stage 1/i }),
  ).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  await context.close();
});
