/**
 * FitCoach E2E Test Suite
 *
 * Uses the Playwright config at apps/web/playwright.config.ts.
 * baseURL defaults to http://localhost:3000 (or $BASE_URL).
 *
 * Seed credentials (from supabase/seed.sql):
 *   trainer1@fitcoach.dev / FitCoach123!
 *   client1@fitcoach.dev  / FitCoach123!
 */

import { test, expect, Page } from "@playwright/test";

// ============================================================
// Constants
// ============================================================

const TRAINER_EMAIL = "trainer1@fitcoach.dev";
const TRAINER_PASSWORD = "FitCoach123!";
const CLIENT_EMAIL = "client1@fitcoach.dev";
const CLIENT_PASSWORD = "FitCoach123!";

// ============================================================
// Shared helper: log in and wait for redirect off /login
// ============================================================

async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

// ============================================================
// 1. AUTH
// ============================================================

test.describe("Auth", () => {
  test("login redirects to trainer dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TRAINER_EMAIL);
    await page.getByLabel(/password/i).fill(TRAINER_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/trainer/, { timeout: 15_000 });
  });

  test("invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TRAINER_EMAIL);
    await page.getByLabel(/password/i).fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Supabase returns an error; the UI should surface it
    await expect(
      page.getByText(/invalid|incorrect|credentials|wrong|error/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("logout returns to login", async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    // Expect to be on the trainer dashboard first
    await expect(page).toHaveURL(/\/trainer/);
    // Locate and click the logout control (button or link)
    await page
      .getByRole("button", { name: /log ?out|sign ?out/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/(auth\/)?login/, { timeout: 10_000 });
  });
});

// ============================================================
// 2. TRAINER DASHBOARD
// ============================================================

test.describe("Trainer dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("loads with correct stat cards", async ({ page }) => {
    // Dashboard is the landing page after trainer login
    await page.goto("/trainer");
    await expect(
      page.getByText(/active clients/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/pending check-?ins/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("pending check-ins shows count badge", async ({ page }) => {
    await page.goto("/trainer");
    // The badge can be a <span class="badge-warning"> or any element
    // bearing a numeric count alongside "Pending Check-ins"
    const badgeOrCount = page.locator(
      ".badge-warning, [class*='badge'][class*='warn'], [data-testid='pending-badge']"
    );
    // If no submitted check-ins exist the badge may be absent or show 0 — both are valid
    const pendingSection = page.getByText(/pending check-?ins/i).first();
    await expect(pendingSection).toBeVisible({ timeout: 10_000 });
    // Either the badge element is present, or a numeric sibling is visible
    const badgeCount = await badgeOrCount.count();
    if (badgeCount > 0) {
      await expect(badgeOrCount.first()).toBeVisible();
    } else {
      // Fallback: a digit adjacent to the "Pending Check-ins" text is visible
      const parentText = await pendingSection
        .locator("..")
        .innerText()
        .catch(() => "");
      expect(parentText).toMatch(/\d/);
    }
  });
});

// ============================================================
// 3. EXERCISE LIBRARY
// ============================================================

test.describe("Exercise library", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("loads exercises", async ({ page }) => {
    await page.goto("/trainer/exercises");
    // At least one exercise card or list item should be present
    const exerciseItems = page.locator(
      "[data-testid='exercise-card'], [class*='exercise-card'], [class*='ExerciseCard'], li[class*='exercise'], article"
    );
    await expect(exerciseItems.first()).toBeVisible({ timeout: 10_000 });
  });

  test("search filters results", async ({ page }) => {
    await page.goto("/trainer/exercises");
    const searchInput = page.getByPlaceholder(/search exercises/i);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill("squat");
    // Allow debounce
    await page.waitForTimeout(600);
    // After filtering, at least one result containing "squat" should be visible
    await expect(
      page.getByText(/squat/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("muscle filter works", async ({ page }) => {
    await page.goto("/trainer/exercises");
    // Locate any muscle-group filter control: a <select>, button group, or combobox
    const muscleFilter = page
      .getByRole("combobox", { name: /muscle/i })
      .or(page.getByLabel(/muscle/i))
      .or(page.getByRole("button", { name: /chest/i }))
      .first();
    await expect(muscleFilter).toBeVisible({ timeout: 10_000 });
    // Select "chest" — handles both <select> and button-based filter
    const tagName = await muscleFilter.evaluate((el) =>
      el.tagName.toLowerCase()
    );
    if (tagName === "select") {
      await muscleFilter.selectOption({ label: "chest" });
    } else {
      await muscleFilter.click();
      // If it opened a dropdown, pick "chest"
      const chestOption = page.getByRole("option", { name: /chest/i }).or(
        page.getByText(/^chest$/i)
      ).first();
      if (await chestOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await chestOption.click();
      }
    }
    await page.waitForTimeout(500);
    // After filtering, results should update (page no longer shows an empty state)
    await expect(page.getByText(/no exercises|no results/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("clicking card opens detail", async ({ page }) => {
    await page.goto("/trainer/exercises");
    const firstCard = page
      .locator(
        "[data-testid='exercise-card'], [class*='exercise-card'], [class*='ExerciseCard'], article"
      )
      .first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    // Detail view should be visible — either a modal, drawer, or new page
    const detailIndicator = page
      .getByRole("dialog")
      .or(page.getByTestId("exercise-detail"))
      .or(page.locator("[class*='detail'], [class*='Detail']"))
      .first();
    await expect(detailIndicator).toBeVisible({ timeout: 8_000 });
  });
});

// ============================================================
// 4. TEMPLATE BUILDER
// ============================================================

test.describe("Template builder", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("can add exercise to template", async ({ page }) => {
    await page.goto("/trainer/templates/new");
    await expect(page.getByText(/new template/i).first()).toBeVisible({
      timeout: 10_000,
    });
    // Open the exercise picker
    await page.getByRole("button", { name: /add exercise/i }).click();
    await expect(page.getByText(/exercise library/i).first()).toBeVisible({
      timeout: 8_000,
    });
    // Pick the first available exercise
    const addBtn = page.locator("button:has-text('+')").first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    // The exercise should now appear in the template list
    await expect(page.getByText(/exercises \(1\)/i)).toBeVisible({
      timeout: 8_000,
    });
  });

  test("can save template", async ({ page }) => {
    await page.goto("/trainer/templates/new");
    await expect(
      page.getByPlaceholder(/full body strength/i)
    ).toBeVisible({ timeout: 10_000 });
    // Fill the template title
    await page
      .getByPlaceholder(/full body strength/i)
      .fill("E2E Save Template");
    // Add one exercise
    await page.getByRole("button", { name: /add exercise/i }).click();
    const addBtn = page.locator("button:has-text('+')").first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    // Close picker if it is a modal
    const closeBtn = page
      .getByRole("button", { name: /close|done|back/i })
      .first();
    if (await closeBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await closeBtn.click();
    }
    // Save
    await page.getByRole("button", { name: /save template/i }).click();
    // Should redirect to the templates list
    await expect(page).toHaveURL(/\/trainer\/templates$/, { timeout: 12_000 });
  });

  test("appears in template list", async ({ page }) => {
    // This test depends on the previous save (or a pre-existing "Full Body Strength A" from seed)
    await page.goto("/trainer/templates");
    // The seed ships "Full Body Strength A" — verify at least one template is shown
    await expect(
      page
        .getByText(/full body strength|E2E Save Template/i)
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// 5. WORKOUT ASSIGNMENT
// ============================================================

test.describe("Workout assignment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can assign template to client", async ({ page }) => {
    await page.goto("/trainer/assign");
    // Select client
    const clientSelect = page
      .getByLabel(/client/i)
      .or(page.getByRole("combobox", { name: /client/i }))
      .first();
    await expect(clientSelect).toBeVisible({ timeout: 10_000 });
    await clientSelect.selectOption({ index: 1 });

    // Select template
    const templateSelect = page
      .getByLabel(/template/i)
      .or(page.getByRole("combobox", { name: /template/i }))
      .first();
    await expect(templateSelect).toBeVisible({ timeout: 5_000 });
    await templateSelect.selectOption({ index: 1 });

    // Set a scheduled date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
    const dateInput = page.getByLabel(/date/i).first();
    await expect(dateInput).toBeVisible({ timeout: 5_000 });
    await dateInput.fill(dateStr);

    // Submit the assignment form
    await page.getByRole("button", { name: /assign|schedule|submit/i }).click();

    // Expect a success toast or confirmation message
    await expect(
      page.getByText(/assigned|success|saved/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("appears on client workout list", async ({ page }) => {
    // Log in as the client and verify the seeded assignment is visible
    await loginAs(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/client/workouts");
    // The seed assigns "Full Body Strength A" to client1 for tomorrow
    await expect(
      page.getByText(/full body strength|assigned/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// 6. CHECK-IN REVIEW
// ============================================================

test.describe("Check-in review", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can open submitted check-in", async ({ page }) => {
    await page.goto("/trainer/check-ins");
    // If there are no submitted check-ins in the seed, skip gracefully
    const submittedRow = page
      .getByRole("row")
      .filter({ hasText: /submitted/i })
      .first()
      .or(
        page
          .locator("[data-testid='check-in-row']")
          .filter({ hasText: /submitted/i })
          .first()
      );
    const hasSubmitted = await submittedRow
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasSubmitted) {
      test.skip();
      return;
    }
    await submittedRow.click();
    // Detail view opens
    await expect(
      page
        .getByRole("dialog")
        .or(page.locator("[class*='check-in-detail'], [class*='CheckInDetail']"))
        .first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("add notes and mark as reviewed", async ({ page }) => {
    await page.goto("/trainer/check-ins");
    const submittedRow = page
      .getByRole("row")
      .filter({ hasText: /submitted/i })
      .first()
      .or(
        page
          .locator("[data-testid='check-in-row']")
          .filter({ hasText: /submitted/i })
          .first()
      );
    const hasSubmitted = await submittedRow
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasSubmitted) {
      test.skip();
      return;
    }
    await submittedRow.click();
    // Fill trainer notes
    const notesField = page
      .getByLabel(/trainer notes/i)
      .or(page.getByPlaceholder(/trainer notes/i))
      .first();
    await expect(notesField).toBeVisible({ timeout: 8_000 });
    await notesField.fill("Looking great — keep it up!");
    // Click "Mark as Reviewed"
    await page
      .getByRole("button", { name: /mark as reviewed|reviewed/i })
      .click();
    // Status should update to "reviewed"
    await expect(
      page.getByText(/reviewed/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// 7. MESSAGING
// ============================================================

test.describe("Messaging", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can send message", async ({ page }) => {
    await page.goto("/trainer/messaging");
    // Select an existing conversation (seed has trainer1 <-> client1)
    const convoItem = page
      .locator(
        "[data-testid='conversation-item'], [class*='conversation-item'], [class*='ConversationItem']"
      )
      .first()
      .or(page.getByText(/jordan|client1/i).first());
    await expect(convoItem).toBeVisible({ timeout: 10_000 });
    await convoItem.click();
    // Type a message
    const messageInput = page
      .getByPlaceholder(/type a message|message/i)
      .or(page.getByRole("textbox", { name: /message/i }))
      .first();
    await expect(messageInput).toBeVisible({ timeout: 8_000 });
    const uniqueMsg = `E2E test message ${Date.now()}`;
    await messageInput.fill(uniqueMsg);
    // Send
    await page
      .getByRole("button", { name: /send/i })
      .or(page.locator("button[type='submit']"))
      .first()
      .click();
    // The sent message should appear in the thread
    await expect(page.getByText(uniqueMsg)).toBeVisible({ timeout: 10_000 });
  });

  test("message appears in thread", async ({ page }) => {
    await page.goto("/trainer/messaging");
    // Open the seeded conversation
    const convoItem = page
      .locator(
        "[data-testid='conversation-item'], [class*='conversation-item'], [class*='ConversationItem']"
      )
      .first()
      .or(page.getByText(/jordan|client1/i).first());
    await expect(convoItem).toBeVisible({ timeout: 10_000 });
    await convoItem.click();
    // The seed contains at least two messages in this conversation
    await expect(
      page.getByText(/Welcome Jordan/i).or(
        page.getByText(/Full Body A workout/i)
      ).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
