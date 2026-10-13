import { spawn } from "node:child_process";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { migrate } from "./migrate.mjs";

const app = process.env.TEST_DATABASE_URL,
  owner = process.env.TEST_MIGRATION_DATABASE_URL;
if (
  process.env.VERCEL === "1" ||
  !app ||
  !owner ||
  !new URL(app).pathname.endsWith("_test") ||
  new URL(app).pathname !== new URL(owner).pathname
)
  throw new Error(
    "Local identity requires separate app/owner connections to the same isolated *_test database.",
  );
const pool = new Pool({ connectionString: owner });
try {
  await migrate(pool);
  await pool.query(
    await readFile(new URL("./grant-runtime.sql", import.meta.url), "utf8"),
  );
} finally {
  await pool.end();
}
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: app,
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      BETTER_AUTH_SECRET: "local-development-fixture-only-not-production",
      DEV_AUTH_MAILBOX: "1",
      RESEND_API_KEY: "",
      AUTH_EMAIL_FROM: "",
    },
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
