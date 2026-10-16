import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/signup-e2e",
  outputDir: "./.artifacts/signup-results",
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
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
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
      AUTH_EMAIL_VERIFICATION_REQUIRED: "false",
      AUTH_MAIL_TRANSPORT: "disabled",
      HAMYAR_DEPLOYMENT_MODE:
        process.env.HAMYAR_TEST_DEPLOYMENT_MODE ?? "normal",
      HAMYAR_DOMESTIC_HOSTS: `${process.env.TEST_DATABASE_URL ? new URL(process.env.TEST_DATABASE_URL).hostname : "localhost"},localhost,127.0.0.1`,
      ...(process.env.HAMYAR_TEST_MEDIA === "1"
        ? {
            LIVEKIT_URL: "ws://127.0.0.1:8090",
            LIVEKIT_API_KEY: "hamyar_browser_fixture",
            LIVEKIT_API_SECRET:
              "synthetic-isolated-media-fixture-secret-0123456789",
            HAMYAR_MEDIA_GATEWAY: "enabled",
          }
        : {}),
    },
  },
});
