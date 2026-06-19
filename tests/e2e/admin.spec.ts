import { expect, test } from "@playwright/test";

const username = Deno.env.get("ADMIN_USERNAME") || "admin";
const password = Deno.env.get("ADMIN_PASSWORD") || "admin";
const testId = Date.now();

test.describe("VER-ADMIN-E2E: Admin Panel E2E Flows", () => {
  test("VER-ADMIN-E2E: unauthenticated users are redirected from /admin to /admin/login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin/login");
    await expect(page.locator("h2")).toContainText("ELX Admin Portal");
  });

  test("VER-ADMIN-E2E: login with invalid credentials shows error message", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill("invalid_user");
    await page.locator('input[name="password"]').fill("invalid_pass");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/admin/login");
    await expect(page.locator(".login-error")).toContainText(
      "Invalid username or password",
    );
  });

  test("VER-ADMIN-E2E: login with valid credentials, navigation, and logout", async ({ page }) => {
    // 1. Successful Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/admin");
    await expect(page.locator("h2")).toContainText("Dashboard");
    await expect(page.locator(".metric-card")).toHaveCount(3);

    // 2. Sidebar Navigation
    await page.getByRole("link", { name: /words manager/i }).click();
    await expect(page).toHaveURL("/admin/words");
    await expect(page.locator("h2")).toContainText("Words Manager");

    await page.getByRole("link", { name: /challenges/i }).click();
    await expect(page).toHaveURL("/admin/challenges");
    await expect(page.locator("h2")).toContainText("Challenges Manager");

    await page.getByRole("link", { name: /test history/i }).click();
    await expect(page).toHaveURL("/admin/history");
    await expect(page.locator("h2")).toContainText("Test History");

    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL("/admin");

    // 3. Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL("/admin/login");
  });

  test("VER-ADMIN-E2E: Words CRUD cycle", async ({ page }) => {
    // Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Go to words manager
    await page.goto("/admin/words");

    // Create a new word
    const wordValue = `e2eword${testId}`;
    await page.goto("/admin/words/new");
    await page.locator('input[name="value"]').fill(wordValue);
    await page.locator('input[name="isReal"]').check();
    await page.locator('select[name="difficulty"]').selectOption("3");
    await page.getByRole("button", { name: /create word/i }).click();

    // Verify word exists in the list (search for it first)
    await page.goto(`/admin/words?q=${wordValue}`);
    await expect(page.locator("tr", { hasText: wordValue })).toBeVisible();

    // Edit the created word
    const row = page.locator("tr", { hasText: wordValue });
    await row.getByRole("button", { name: "Edit" }).click();

    await expect(page.locator("h2")).toContainText("Edit Word");
    await page.locator('select[name="difficulty"]').selectOption("5");
    await page.getByRole("button", { name: /update word/i }).click();

    // Verify the updated difficulty (search for it first)
    await page.goto(`/admin/words?q=${wordValue}`);
    const updatedRow = page.locator("tr", { hasText: wordValue });
    await expect(updatedRow).toContainText("Lvl 5");

    // Delete the word
    page.once("dialog", (dialog) => dialog.accept());
    await updatedRow.getByRole("button", { name: "Delete" }).click();

    // Verify word is removed from list
    await page.goto(`/admin/words?q=${wordValue}`);
    await expect(page.locator("tr", { hasText: wordValue })).toHaveCount(0);
  });

  test("VER-ADMIN-E2E: Data export downloads CSV and JSON files", async ({ page }) => {
    // Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL("/admin");

    // 1. Download CSV
    const [downloadCsv] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export csv/i }).first().click(),
    ]);
    const csvPath = await downloadCsv.path();
    const csvContent = Deno.readTextFileSync(csvPath);
    expect(csvContent).toContain(
      "id,session_id,score,truthfulness,completed_at",
    );

    // 2. Download JSON
    const [downloadJson] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export json/i }).first().click(),
    ]);
    const jsonPath = await downloadJson.path();
    const jsonContent = Deno.readTextFileSync(jsonPath);
    const parsedJson = JSON.parse(jsonContent);
    expect(Array.isArray(parsedJson)).toBeTruthy();
  });

  test("VER-ADMIN-E2E: Challenges CRUD cycles (Synonyms, Spelling, Definitions)", async ({ page }) => {
    // Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // === 1. Synonyms CRUD ===
    const synonymRelation = `testrel${testId}`;
    const updatedRelation = `updrel${testId}`;

    await page.goto("/admin/challenges/synonyms/new");
    await page.locator('select[name="wordId"]').selectOption({
      label: "garden",
    });
    await page.locator('select[name="targetId"]').selectOption({
      label: "kitten",
    });
    await page.locator('input[name="relationType"]').fill(synonymRelation);
    await page.locator('input[name="distractors"]').fill("spider, harvest");
    await page.getByRole("button", { name: /create challenge/i }).click();

    // Verify synonym challenge was created
    await expect(page).toHaveURL(/\/admin\/challenges\?type=synonyms/);
    await expect(page.locator("tr", { hasText: synonymRelation }))
      .toBeVisible();

    // Edit Synonyms Challenge
    const synonymRow = page.locator("tr", { hasText: synonymRelation });
    await synonymRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h2")).toContainText("Edit Synonyms Challenge");
    await page.locator('input[name="relationType"]').fill(updatedRelation);
    await page.getByRole("button", { name: /update challenge/i }).click();

    // Verify updated synonym challenge
    await expect(page).toHaveURL(/\/admin\/challenges\?type=synonyms/);
    await expect(page.locator("tr", { hasText: updatedRelation }))
      .toBeVisible();

    // Delete Synonyms Challenge
    const updatedSynonymRow = page.locator("tr", { hasText: updatedRelation });
    page.once("dialog", (dialog) => dialog.accept());
    await updatedSynonymRow.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/challenges\?type=synonyms/);
    await expect(page.locator("tr", { hasText: updatedRelation }))
      .toHaveCount(0);

    // === 2. Spelling CRUD ===
    await page.goto("/admin/challenges?type=spelling");

    // Add Spelling Challenge
    const spellingSentence = `I love my ___ very much. ${testId}`;
    const updatedSentence = `I love my cute ___ very much. ${testId}`;

    await page.goto("/admin/challenges/spelling/new");
    await page.locator('input[name="contextSentence"]').fill(spellingSentence);
    await page.locator('select[name="correctWordId"]').selectOption({
      label: "kitten",
    });
    await page.locator('input[name="distractors"]').fill("spider, harvest");
    await page.getByRole("button", { name: /create challenge/i }).click();

    // Verify spelling challenge was created
    await expect(page).toHaveURL(/\/admin\/challenges\?type=spelling/);
    await expect(page.locator("tr", { hasText: spellingSentence }))
      .toBeVisible();

    // Edit Spelling Challenge
    const spellingRow = page.locator("tr", {
      hasText: spellingSentence,
    });
    await spellingRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h2")).toContainText("Edit Spelling Challenge");
    await page.locator('input[name="contextSentence"]').fill(updatedSentence);
    await page.getByRole("button", { name: /update challenge/i }).click();

    // Verify updated spelling challenge
    await expect(page).toHaveURL(/\/admin\/challenges\?type=spelling/);
    await expect(
      page.locator("tr", { hasText: updatedSentence }),
    ).toBeVisible();

    // Delete Spelling Challenge
    const updatedSpellingRow = page.locator("tr", {
      hasText: updatedSentence,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await updatedSpellingRow.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/challenges\?type=spelling/);
    await expect(
      page.locator("tr", { hasText: updatedSentence }),
    ).toHaveCount(0);

    // === 3. Definitions CRUD ===
    await page.goto("/admin/challenges?type=definitions");

    // Add Definitions Challenge
    const definitionText = `A plot of ground where plants are grown. ${testId}`;
    const updatedDefinition =
      `A plot of ground where beautiful plants are grown. ${testId}`;

    await page.goto("/admin/challenges/definitions/new");
    await page.locator('select[name="wordId"]').selectOption({
      label: "garden",
    });
    await page.locator('textarea[name="definitionText"]').fill(definitionText);
    await page.locator('input[name="distractors"]').fill("spider, harvest");
    await page.getByRole("button", { name: /create challenge/i }).click();

    // Verify definitions challenge was created
    await expect(page).toHaveURL(/\/admin\/challenges\?type=definitions/);
    await expect(
      page.locator("tr", {
        hasText: definitionText,
      }),
    ).toBeVisible();

    // Edit Definitions Challenge
    const definitionsRow = page.locator("tr", {
      hasText: definitionText,
    });
    await definitionsRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h2")).toContainText(
      "Edit Definitions Challenge",
    );
    await page.locator('textarea[name="definitionText"]').fill(
      updatedDefinition,
    );
    await page.getByRole("button", { name: /update challenge/i }).click();

    // Verify updated definitions challenge
    await expect(page).toHaveURL(/\/admin\/challenges\?type=definitions/);
    await expect(
      page.locator("tr", {
        hasText: updatedDefinition,
      }),
    ).toBeVisible();

    // Delete Definitions Challenge
    const updatedDefinitionsRow = page.locator("tr", {
      hasText: updatedDefinition,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await updatedDefinitionsRow.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/challenges\?type=definitions/);
    await expect(
      page.locator("tr", {
        hasText: updatedDefinition,
      }),
    ).toHaveCount(0);
  });

  test("VER-ADMIN-E2E: Test History view, search and sort", async ({ page }) => {
    // 1. Complete a test run to ensure we have at least one history entry
    await page.goto("/stage/1");
    const checkboxes = page.locator('.word-grid input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /^know$/i }).click();
    await expect(page).toHaveURL("/result");

    // Get the session ID from cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "sessionId");
    const sessionId = sessionCookie?.value;

    // 2. Login as admin
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Go to test history
    await page.goto("/admin/history");
    await expect(page.locator("h2")).toContainText("Test History");

    if (sessionId) {
      // Search by Session ID
      await page.locator('input[name="q"]').fill(sessionId);
      await page.getByRole("button", { name: /search/i }).click();

      // Verify the row for this session ID exists
      await expect(page.locator("tr", { hasText: sessionId })).toBeVisible();

      // Clear search
      await page.getByRole("button", { name: /clear/i }).click();
    }

    // Sort by Score
    await page.getByRole("link", { name: /Score/ }).click();
    // Wait for the URL/page to update with orderBy=score
    await expect(page).toHaveURL(/orderBy=score/);
  });
});
