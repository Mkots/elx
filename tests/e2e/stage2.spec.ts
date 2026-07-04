import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { testAnswers, testSessions } from "../../db/schema.ts";

test("VER-STAGE2-E2E: stage 2 renders one verification card after stage 1 submission", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).check();

  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");
  await expect(page.getByRole("heading", { name: /stage 2/i })).toBeVisible();
  await expect(page.locator(".verification-card")).toHaveCount(1);
  await expect(page.locator(".stage-progress")).toHaveText("Word 1 of 3");
  await expect(page.locator(".verification-progress")).toBeVisible();
});

test("VER-STAGE2-E2E: stage 2 shows Know and Don't know buttons", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();

  await expect(page).toHaveURL("/stage/2");

  await expect(page.getByRole("button", { name: /^know$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /don't know/i })).toBeVisible();
});

test("VER-STAGE2-E2E: stage 2 advances one htmx card at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();

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

test("VER-STAGE2-E2E: stage 2 result page shows score and truthfulness", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /^know$/i }).click();

  await expect(page).toHaveURL("/result");
  await expect(page.getByTestId("score")).toBeVisible();
  await expect(page.getByTestId("truthfulness")).toBeVisible();
  await expect(page.locator(".truthfulness-progress")).toBeVisible();
});

test("VER-STAGE2-E2E: completed run records item-level selections and answers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();

  const checkboxes = page.locator('.word-grid input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByRole("button", { name: /^know$/i }).click();
  await page.getByRole("button", { name: /don't know/i }).click();

  await expect(page).toHaveURL("/result");

  const cookies = await page.context().cookies();
  const sessionId = cookies.find((cookie) => cookie.name === "sessionId")
    ?.value;
  expect(sessionId).toBeTruthy();

  const answerCounts = await db.select({
    stage: testAnswers.stage,
    count: sql<number>`count(*)::integer`,
  })
    .from(testAnswers)
    .where(eq(testAnswers.sessionId, sessionId!))
    .groupBy(testAnswers.stage);

  const countsByStage = new Map(
    answerCounts.map((row) => [row.stage, row.count]),
  );
  expect(countsByStage.get(1)).toBe(2);
  expect(countsByStage.get(2)).toBe(2);

  const completed = await db.select({
    completedAt: testSessions.completedAt,
    score: testSessions.score,
    truthfulness: testSessions.truthfulness,
  })
    .from(testSessions)
    .where(eq(testSessions.id, sessionId!))
    .limit(1);

  expect(completed).toHaveLength(1);
  expect(completed[0].completedAt).not.toBeNull();
  expect(completed[0].score).not.toBeNull();
  expect(completed[0].truthfulness).not.toBeNull();
});

test("VER-STAGE2-E2E: stage 2 is accessible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();

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

test("VER-STAGE2-E2E: /result redirects to /stage/2 after stage 1 but before stage 2", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start assessment/i }).click();
  await page.locator('.word-grid input[type="checkbox"]').nth(0).check();
  await page.getByRole("button", { name: /next/i }).click();
  await expect(page).toHaveURL("/stage/2");

  await page.goto("/result");

  await expect(page).toHaveURL("/stage/2");
});
