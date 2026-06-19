import { expect, test } from "@playwright/test";

test("home page renders heading and start button", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "ELX Vocabulary Assessment" }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /start test/i }),
  ).toBeVisible();
});

test("start test button navigates to stage 1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /start test/i }).click();
  await expect(page).toHaveURL("/stage/1");
});

test("health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok" });
});
