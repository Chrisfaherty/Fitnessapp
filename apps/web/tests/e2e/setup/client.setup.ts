import { test as setup, expect } from "@playwright/test";
import path from "path";

export const CLIENT_AUTH = path.join(__dirname, "../.auth/client.json");

setup("authenticate as client", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill("client1@fitcoach.dev");
  await page.getByLabel(/password/i).fill("FitCoach123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/client/, { timeout: 20_000 });
  await page.context().storageState({ path: CLIENT_AUTH });
});
