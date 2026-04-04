import { test as setup, expect } from "@playwright/test";
import path from "path";

export const TRAINER_AUTH = path.join(__dirname, "../.auth/trainer.json");

setup("authenticate as trainer", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill("trainer1@fitcoach.dev");
  await page.getByLabel(/password/i).fill("FitCoach123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/trainer/, { timeout: 20_000 });
  await page.context().storageState({ path: TRAINER_AUTH });
});
