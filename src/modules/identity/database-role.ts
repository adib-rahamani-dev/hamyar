import type { Pool } from "pg";
/** Runtime connections must not own protected tables or bypass their RLS policies. */
export async function assertRuntimeRole(pool: Pool) {
  const role = (
    await pool.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  const ownership = (
    await pool.query(
      "SELECT count(*)::integer AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relkind='r' AND r.rolname=current_user",
    )
  ).rows[0];
  if (!role || role.rolsuper || role.rolbypassrls || ownership.count > 0)
    throw new Error("IDENTITY_DB_ROLE_UNSAFE");
  const protectedTables = (
    await pool.query(
      "SELECT count(*)::integer AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('organization','membership','invitation','audit_event') AND c.relrowsecurity AND c.relforcerowsecurity",
    )
  ).rows[0];
  if (protectedTables.count !== 4) throw new Error("IDENTITY_SCHEMA_NOT_READY");
}
