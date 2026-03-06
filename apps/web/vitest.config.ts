import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    exclude: [
      "**/node_modules/**",
      "**/tests/e2e/**",   // Playwright E2E tests — run separately via playwright
      "**/*.spec.ts",      // Playwright spec files
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
