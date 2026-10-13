import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { migrate } from "./migrate.mjs";

if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error("Separate MIGRATION_DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
try {
  const role = (
    await pool.query(
      "SELECT current_user AS name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  if (role.name !== "hamyar_schema" || role.rolsuper || role.rolbypassrls)
    throw new Error(
      "Use the dedicated non-superuser hamyar_schema migration role.",
    );
  await migrate(pool);
  await pool.query(
    await readFile(new URL("./grant-runtime.sql", import.meta.url), "utf8"),
  );
  console.log("Self-hosted schema and runtime grants applied.");
} catch {
  // Driver errors may carry connection details. Do not print their objects.
  console.error(
    "Schema setup failed. Check private credentials, role and migration state.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
