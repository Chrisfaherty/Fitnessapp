import { test, expect, Page } from "@playwright/test";

const TRAINER_EMAIL = "trainer1@fitcoach.dev";
const TRAINER_PASSWORD = "FitCoach123!";
const CLIENT_EMAIL = "client1@fitcoach.dev";
const CLIENT_PASSWORD = "FitCoach123!";

// ============================================================
// Helpers
// ============================================================
async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });
}

// ============================================================
// Tests
// ============================================================

test.describe("Trainer auth + dashboard", () => {
  test("trainer can log in and see dashboard", async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await expect(page).toHaveURL(/\/trainer/);
    await expect(page.getByText(/Active Clients/i).first()).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/trainer");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Exercise library + template builder", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can navigate to templates", async ({ page }) => {
    await page.goto("/trainer/templates");
    await expect(page.getByText(/Workout Templates/i)).toBeVisible();
  });

  test("trainer can open new template form", async ({ page }) => {
    await page.goto("/trainer/templates/new");
    // Breadcrumb shows "New Template"; left panel shows "Exercise Library"
    await expect(page.getByText(/New Template/i).first()).toBeVisible({ timeout: 8_000 });
    // Title input placeholder is "e.g. Day 1 — Heavy Pull"
    await expect(page.getByPlaceholder(/day 1|heavy pull/i)).toBeVisible({ timeout: 8_000 });
  });

  test("trainer can create a template with exercises", async ({ page }) => {
    await page.goto("/trainer/templates/new");

    // Fill title — placeholder is "e.g. Day 1 — Heavy Pull"
    await page.getByPlaceholder(/day 1|heavy pull/i).fill("E2E Test Template");

    // Exercise Library panel is always visible on the left
    await expect(page.getByText(/Exercise Library/i)).toBeVisible({ timeout: 8_000 });

    // Search for a squat exercise
    await page.getByPlaceholder(/Search exercises/i).fill("squat");
    await page.waitForTimeout(500);  // debounce

    // Click the first matching exercise button in the aside list.
    // Filter by hasText to avoid matching icon-only sidebar buttons (logout, close).
    const firstExercise = page.locator("aside button").filter({ hasText: /squat/i }).first();
    await expect(firstExercise).toBeVisible({ timeout: 8_000 });
    await firstExercise.click();

    // Verify exercise added — counter shows "1 exercise"
    await expect(page.getByText(/1 exercise/i).first()).toBeVisible({ timeout: 8_000 });

    // Save
    await page.getByRole("button", { name: /save template/i }).click();

    // Should redirect to templates list
    await expect(page).toHaveURL(/\/trainer\/templates$/, { timeout: 12_000 });
    await expect(page.getByText("E2E Test Template")).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Client assignment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can see client list", async ({ page }) => {
    await page.goto("/trainer/clients");
    await expect(page.getByText(/Clients|Jordan|Morgan/i).first()).toBeVisible();
  });
});

test.describe("Client data isolation", () => {
  test("client can log in and see own dashboard", async ({ page }) => {
    await loginAs(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await expect(page).toHaveURL(/\/client/);
  });

  test("client cannot access trainer dashboard", async ({ page }) => {
    await loginAs(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/trainer");
    // Should be redirected away
    await expect(page).not.toHaveURL(/\/trainer$/);
  });
});

test.describe("Messaging", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can navigate to messaging", async ({ page }) => {
    await page.goto("/trainer/messaging");
    // The messaging page heading is "Messages" inside the sidebar panel
    await expect(page.getByText(/Messages/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
