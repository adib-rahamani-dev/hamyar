import { defineConfig } from "@playwright/test";
import signup from "./playwright.signup.config";
const server = signup.webServer;
if (!server || Array.isArray(server))
  throw new Error("Expected one signup test server.");
export default defineConfig({
  ...signup,
  outputDir: "./.artifacts/standalone-results",
  webServer: {
    ...server,
    command: "node .next/standalone/server.js",
    env: { ...server.env, HOSTNAME: "127.0.0.1", PORT: "3100" },
  },
});
