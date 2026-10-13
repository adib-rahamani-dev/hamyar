export function developmentMailboxEnabled(
  env: Record<string, string | undefined>,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.VERCEL === "1" ||
    env.DEV_AUTH_MAILBOX !== "1"
  )
    return false;
  try {
    const origin = new URL(env.BETTER_AUTH_URL ?? "");
    const db = new URL(env.DATABASE_URL ?? "");
    return (
      origin.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) &&
      db.pathname.endsWith("_test")
    );
  } catch {
    return false;
  }
}
