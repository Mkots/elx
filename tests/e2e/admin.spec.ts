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
    await expect(page.locator(".metric-card")).toHaveCount(4);

    // 2. Sidebar Navigation
    await page.getByRole("link", { name: /words manager/i }).click();
    await expect(page).toHaveURL("/admin/words");
    await expect(page.locator("h2")).toContainText("Words Manager");

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

  test("Import Words CSV via Admin UI (Dry run & Real run)", async ({ page }) => {
    // 1. Write temporary CSV import file to disk
    const tempCsvPath = "./tests/e2e/temp_import.csv";
    const importWordValue = `imp_${testId}`;
    Deno.writeTextFileSync(
      tempCsvPath,
      `word,real_flag,level\n${importWordValue},y,4`,
    );

    try {
      // 2. Login
      await page.goto("/admin/login");
      await page.locator('input[name="username"]').fill(username);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();

      // 3. Navigate to Import Words page
      await page.goto("/admin/words");
      await page.getByRole("button", { name: /import words/i }).click();
      await expect(page).toHaveURL("/admin/words/import");

      // 4. Fill in Config mapping
      const config = {
        format: "csv",
        delimiter: ",",
        hasHeader: true,
        fields: {
          value: { from: "word" },
          isReal: {
            from: "real_flag",
            map: { "y": true, "n": false },
            default: true,
          },
          difficulty: { from: "level", default: 3 },
        },
      };
      await page.locator('textarea[name="config"]').fill(
        JSON.stringify(config),
      );

      // 5. Select the file
      const absolutePath = Deno.realPathSync(tempCsvPath);
      await page.locator('input[name="file"]').setInputFiles(absolutePath);

      // 6. Run Dry run (checkbox is checked by default)
      const dryRunCheckbox = page.locator('input[name="dryRun"]');
      await expect(dryRunCheckbox).toBeChecked();
      await page.getByRole("button", { name: /run import/i }).click();

      // 7. Verify dry run results
      await expect(page.locator("h4", { hasText: "Import Results" }))
        .toBeVisible();
      await expect(page.locator(".alert-success")).toContainText(
        "Dry run completed successfully",
      );

      // 8. Uncheck Dry run for a real import
      await page.locator('input[name="file"]').setInputFiles(absolutePath);
      await page.locator('input[name="dryRun"]').uncheck();
      await page.getByRole("button", { name: /run import/i }).click();

      // 9. Verify real import results
      await expect(page.locator(".alert-success")).toContainText(
        "Import completed successfully",
      );

      // 10. Check if the word is actually in Words Manager
      await page.goto(`/admin/words?q=${importWordValue}`);
      await expect(page.locator("tr", { hasText: importWordValue }))
        .toBeVisible();
    } finally {
      // Clean up temp file
      try {
        Deno.removeSync(tempCsvPath);
      } catch {
        // ignore if already removed
      }
    }
  });

  test("Word Review & Refinement Flow (Confirm & Skip)", async ({ page }) => {
    // 1. Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Go to words manager and check "Review Queue" button is present and click it
    await page.goto("/admin/words");
    await page.getByRole("button", { name: /review queue/i }).click();
    await expect(page).toHaveURL("/admin/words/review");
    await expect(page.locator("h2")).toContainText("Word Review & Refinement");

    // 3. Verify card elements are visible
    const wordInput = page.locator('input[name="value"]');
    await expect(wordInput).toBeVisible();
    const originalValue = await wordInput.inputValue();

    // 4. Edit fields (difficulty and isReal only, don't rename value to avoid breaking other E2E tests dropdowns)
    await page.locator('select[name="difficulty"]').selectOption("4");
    const isRealCheckbox = page.locator('input[name="isReal"]');
    const wasChecked = await isRealCheckbox.isChecked();
    if (wasChecked) {
      await isRealCheckbox.uncheck();
    } else {
      await isRealCheckbox.check();
    }

    // Click Confirm & Next
    await page.getByRole("button", { name: /confirm & next/i }).click();

    // 5. Verify that a different word is loaded
    await expect(wordInput).not.toHaveValue(originalValue);
    const nextValue = await wordInput.inputValue();

    // 6. Test the skip functionality
    await page.getByRole("button", { name: /skip/i }).click();
    await expect(wordInput).not.toHaveValue(nextValue);
  });

  test("Ticket Composition Config edit flow", async ({ page }) => {
    // 1. Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Go to ticket-config
    await page.goto("/admin/ticket-config");
    await expect(page.locator("h2")).toContainText("Ticket Composition Config");

    // 3. Fill in settings
    await page.locator('input[name="realCount"]').fill("30");
    await page.locator('input[name="pseudoCount"]').fill("15");
    await page.locator('input[name="difficulty1Count"]').fill("8");
    await page.locator('input[name="difficulty2Count"]').fill("10");
    await page.locator('input[name="difficulty3Count"]').fill("10");
    await page.locator('input[name="difficulty4Count"]').fill("9");
    await page.locator('input[name="difficulty5Count"]').fill("8");
    await page.locator('input[name="synonymsCount"]').fill("1");
    await page.locator('input[name="spellingCount"]').fill("1");
    await page.locator('input[name="definitionCount"]').fill("1");

    // 4. Submit form
    await page.getByRole("button", { name: /save configuration/i }).click();

    // Check if error alert is shown and throw it
    const errorAlert = page.locator(".alert-error");
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      throw new Error(`Validation failed with error: ${errorText}`);
    }

    // 5. Verify success alert is shown
    await expect(page.locator(".alert-success")).toContainText(
      "Configuration saved successfully",
    );
  });

  test("Ticket Builder Curation E2E flow", async ({ page }) => {
    // 1. Login
    await page.goto("/admin/login");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Go to Ticket Builder
    await page.goto("/admin/tickets");
    await expect(page.locator("h2")).toContainText("Ticket Builder & Curation");

    // 3. Generate a base ticket
    await page.locator('input[name="title"]').fill("E2E Test Ticket");
    await page.locator('textarea[name="notes"]').fill("E2E curation check");
    await page.getByRole("button", { name: /generate base ticket/i }).click();

    await expect(page.locator(".alert-success")).toContainText(
      "Base ticket generated successfully",
    );

    // Verify it appeared in the table under base status
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow.locator("td").nth(1)).toContainText(
      "E2E Test Ticket",
    );
    await expect(firstRow.locator("span.badge-warning")).toContainText("base");

    // 4. Click Enrich
    await firstRow.getByRole("link", { name: /enrich/i }).click();
    await expect(page.locator("h2")).toContainText("Edit Ticket: ELX-T-");

    // 5. Loop through unverified challenge questions and verify them
    const cards = page.locator('article[id^="q-card-"]');
    const count = await cards.count();
    expect(count).toBe(3); // 1 synonym, 1 spelling, 1 definition

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);

      // Fill context sentence if it is a spelling question
      const sentenceInput = card.locator('input[name="contextSentence"]');
      if (await sentenceInput.isVisible()) {
        await sentenceInput.fill("Please spell the word ___ here.");
      }

      // Distractor inputs are pre-populated, click save/verify
      await card.getByRole("button", { name: /verify/i }).click();

      // Wait for success alert/state check
      await expect(page.locator(".alert-success")).toContainText(
        "Question verified and saved successfully",
      );
    }

    // 6. Publish the ticket
    await page.getByRole("button", { name: /publish ticket/i }).click();

    // 7. Verify back on tickets page and published status
    await expect(page.locator(".alert-success")).toContainText(
      "Ticket successfully published and made active!",
    );

    const updatedRow = page.locator("table tbody tr").first();
    await expect(updatedRow.locator("span.badge-success")).toContainText(
      "published",
    );
  });
});
