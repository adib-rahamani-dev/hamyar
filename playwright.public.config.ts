import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/public-e2e",
  outputDir: ".artifacts/public-results",
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "off",
    channel:
      process.env.PLAYWRIGHT_CHANNEL ??
      (process.platform === "win32" ? "msedge" : undefined),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200/api/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      DATABASE_URL: "",
      BETTER_AUTH_SECRET: "",
      HAMYAR_LOCAL_DEMOS: "1",
      VERCEL: "1",
    },
  },
});
