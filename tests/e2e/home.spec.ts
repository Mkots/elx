import { expect, test } from "@playwright/test";

test("VER-HOME-E2E: home page renders heading and start button", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "ELX Vocabulary Assessment" }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /start assessment/i }),
  ).toBeVisible();
});

test("VER-HOME-E2E: start test button navigates to stage 1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();
  await expect(page).toHaveURL("/stage/1");
});

test("VER-HOME-E2E: health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok" });
});
