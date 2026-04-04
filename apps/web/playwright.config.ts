import { defineConfig, devices } from "@playwright/test";
import path from "path";

const TRAINER_AUTH = path.join(__dirname, "tests/e2e/.auth/trainer.json");
const CLIENT_AUTH  = path.join(__dirname, "tests/e2e/.auth/client.json");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // ── Auth setup (runs once, saves cookies) ──────────────────
    {
      name: "trainer-setup",
      testMatch: /setup\/trainer\.setup\.ts/,
    },
    {
      name: "client-setup",
      testMatch: /setup\/client\.setup\.ts/,
    },
    // ── Main test suites ───────────────────────────────────────
    {
      name: "trainer-tests",
      testMatch: /fitcoach\.spec\.ts|trainer-workflow\.spec\.ts/,
      dependencies: ["trainer-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: TRAINER_AUTH,
      },
    },
  ],

  // In CI: serve the pre-built app with `next start`.
  // Locally: spin up the dev server instead.
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
