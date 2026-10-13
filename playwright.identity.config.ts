import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/identity-e2e",
  outputDir: "./.artifacts/identity-results",
  globalSetup: "./tests/fixtures/identity-setup.ts",
  fullyParallel: true,
  timeout: 60000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "off",
    channel:
      process.env.PLAYWRIGHT_CHANNEL ??
      (process.platform === "win32" ? "msedge" : undefined),
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        extraHTTPHeaders: { "x-forwarded-for": "192.0.2.11" },
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        extraHTTPHeaders: { "x-forwarded-for": "192.0.2.12" },
      },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      BETTER_AUTH_SECRET: "isolated-browser-fixture-only-not-production",
      RESEND_API_KEY: "",
      AUTH_EMAIL_FROM: "",
    },
  },
});
