import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { migrate } from "../../scripts/migrate.mjs";

export default async function setup() {
  const connection = process.env.TEST_DATABASE_URL;
  if (!connection || !new URL(connection).pathname.endsWith("_test"))
    throw new Error(
      "Identity E2E requires an isolated TEST_DATABASE_URL ending in _test.",
    );
  const pool = new Pool({ connectionString: connection });
  try {
    const role = (
      await pool.query(
        "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
      )
    ).rows[0];
    if (role.rolsuper || role.rolbypassrls)
      throw new Error("Test connection must enforce RLS.");
    const ownerUrl = process.env.TEST_MIGRATION_DATABASE_URL;
    if (
      !ownerUrl ||
      new URL(ownerUrl).pathname !== new URL(connection).pathname
    )
      throw new Error(
        "TEST_MIGRATION_DATABASE_URL must target the same isolated test database.",
      );
    const owner = new Pool({ connectionString: ownerUrl });
    try {
      await migrate(owner);
      await owner.query(
        await import("node:fs/promises").then((fs) =>
          fs.readFile("scripts/grant-runtime.sql", "utf8"),
        ),
      );
    } finally {
      await owner.end();
    }
    const password = "Synthetic-browser-test-password!";
    for (const project of ["desktop", "mobile"])
      for (const kind of ["owner", "guest"]) {
        const id = randomUUID(),
          email = `${kind}-${project}-${id}@example.test`;
        await pool.query(
          "INSERT INTO auth_user(id,name,email,email_verified) VALUES($1,$2,$3,true)",
          [id, kind === "owner" ? "مدیر آزمایشی" : "عضو آزمایشی", email],
        );
        await pool.query(
          "INSERT INTO auth_account(id,account_id,provider_id,user_id,password) VALUES($1,$2,'credential',$2,$3)",
          [randomUUID(), id, await hashPassword(password)],
        );
        process.env[
          `HAMYAR_FIXTURE_${project.toUpperCase()}_${kind.toUpperCase()}`
        ] = email;
      }
  } finally {
    await pool.end();
  }
}
