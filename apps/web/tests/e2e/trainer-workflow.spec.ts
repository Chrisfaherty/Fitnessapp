import { test, expect, Page } from "@playwright/test";

const TRAINER_EMAIL = "trainer1@fitnessapp.dev";
const TRAINER_PASSWORD = "Trainer1234!";
const CLIENT_EMAIL = "client1@fitnessapp.dev";
const CLIENT_PASSWORD = "Client1234!";

// ============================================================
// Helpers
// ============================================================
async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
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
    await expect(page.getByText(/Active Clients/i)).toBeVisible();
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
    await expect(page.getByText(/New Template/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Full Body Strength/i)).toBeVisible();
  });

  test("trainer can create a template with exercises", async ({ page }) => {
    await page.goto("/trainer/templates/new");

    // Fill title
    await page.getByPlaceholder(/Full Body Strength/i).fill("E2E Test Template");

    // Open exercise picker
    await page.getByRole("button", { name: /add exercise/i }).click();
    await expect(page.getByText(/Exercise Library/i)).toBeVisible();

    // Search for an exercise
    await page.getByPlaceholder(/Search exercises/i).fill("squat");
    await page.waitForTimeout(500);  // debounce

    // Pick first result
    const firstExercise = page.locator("button:has-text('+')").first();
    await firstExercise.click();

    // Verify exercise added
    await expect(page.getByText("1 exercises")).not.toBeVisible();
    await expect(page.getByText("Exercises (1)")).toBeVisible();

    // Save
    await page.getByRole("button", { name: /save template/i }).click();

    // Should redirect to templates list
    await expect(page).toHaveURL(/\/trainer\/templates$/);
    await expect(page.getByText("E2E Test Template")).toBeVisible();
  });
});

test.describe("Client assignment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TRAINER_EMAIL, TRAINER_PASSWORD);
  });

  test("trainer can see client list", async ({ page }) => {
    await page.goto("/trainer/clients");
    await expect(page.getByText(/My Clients|Jordan|Morgan/i).first()).toBeVisible();
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
    await expect(page.getByText(/Messages/i).first()).toBeVisible();
  });
});
