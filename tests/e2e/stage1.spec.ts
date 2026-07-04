import { expect, type Page, test } from "@playwright/test";

async function acceptConsent(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();
  await expect(page).toHaveURL("/consent");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /continue to assessment/i }).click();
  await expect(page).toHaveURL(/\/stage\/1/);
}

test("VER-STAGE1-E2E: stage 1 renders word grid with checkboxes", async ({ page }) => {
  await acceptConsent(page);

  await expect(
    page.getByRole("heading", { name: /stage 1/i }),
  ).toBeVisible();

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await expect(checkboxes.first()).toBeVisible();
  expect(await checkboxes.count()).toBeGreaterThan(0);
});

test("VER-STAGE1-E2E: stage 1 form submits and redirects to stage 2", async ({ page }) => {
  await acceptConsent(page);

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).check();

  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL(/\/stage\/2/);
});

test("VER-STAGE1-E2E: stage 1 sets sessionId cookie on submit", async ({ page }) => {
  await acceptConsent(page);
  await page.getByRole("button", { name: /next/i }).click();

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "sessionId");

  expect(session).toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
});

test("VER-STAGE1-E2E: stage 1 is accessible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();
  await expect(page).toHaveURL("/consent");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /continue to assessment/i }).click();

  await expect(
    page.getByRole("heading", { name: /stage 1/i }),
  ).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  await context.close();
});
