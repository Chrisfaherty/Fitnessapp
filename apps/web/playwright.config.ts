import { defineConfig, devices } from "@playwright/test";

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
    // All spec files run with a fresh (unauthenticated) browser context.
    // Each test or beforeEach is responsible for calling loginAs() to
    // authenticate — this avoids the storageState conflict where the
    // login page redirects already-authenticated users before the form
    // can be filled.
    {
      name: "chromium",
      testMatch: /fitcoach\.spec\.ts|trainer-workflow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
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
