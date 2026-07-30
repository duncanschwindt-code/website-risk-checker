import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_MODE: "demo",
      PROJECT_USE_MODE: "noncommercial",
      APP_BASE_URL: "http://127.0.0.1:3000",
      RATE_LIMIT_HASH_SECRET: "playwright-only-rate-limit-secret-value",
      CORRECTION_EMAIL: "corrections@example.com",
      ENABLE_GOOGLE_SAFE_BROWSING: "false",
      ENABLE_URLHAUS: "false",
      ENABLE_PHISHTANK: "false",
      ENABLE_OTX: "false",
      ENABLE_VIRUSTOTAL: "false",
    },
  },
});
