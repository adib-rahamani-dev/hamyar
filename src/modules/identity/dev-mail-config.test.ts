import { expect, it } from "vitest";
import { developmentMailboxEnabled } from "./dev-mail-config";
const fixture = {
  NODE_ENV: "development",
  DEV_AUTH_MAILBOX: "1",
  BETTER_AUTH_URL: "http://127.0.0.1:3100",
  DATABASE_URL: "postgresql://localhost/identity_test",
};
it("never enables a test mailbox in production, on Vercel, on public hosts or real databases", () => {
  expect(developmentMailboxEnabled(fixture)).toBe(true);
  expect(
    developmentMailboxEnabled({ ...fixture, NODE_ENV: "production" }),
  ).toBe(false);
  expect(developmentMailboxEnabled({ ...fixture, VERCEL: "1" })).toBe(false);
  expect(
    developmentMailboxEnabled({
      ...fixture,
      BETTER_AUTH_URL: "https://public.example.test",
    }),
  ).toBe(false);
  expect(
    developmentMailboxEnabled({
      ...fixture,
      DATABASE_URL: "postgresql://localhost/real",
    }),
  ).toBe(false);
  expect(
    developmentMailboxEnabled({ ...fixture, DEV_AUTH_MAILBOX: undefined }),
  ).toBe(false);
});
