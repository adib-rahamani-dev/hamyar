import { describe, expect, it } from "vitest";
import { identityConfigured } from "./config";
const fixture = {
  DATABASE_URL: "postgresql://localhost/identity_test",
  BETTER_AUTH_URL: "https://app.example.test",
  BETTER_AUTH_SECRET: "94ace7136d6bc9c9a6eea643fb95325c",
};
describe("identity configuration fails closed", () => {
  it("rejects known development keys on public HTTPS deployments", () => {
    expect(
      identityConfigured({
        ...fixture,
        BETTER_AUTH_SECRET: "local-development-fixture-only-not-production",
      }),
    ).toBe(false);
  });
  it("never enables identity with missing configuration", () => {
    expect(identityConfigured({})).toBe(false);
    expect(identityConfigured({ ...fixture, BETTER_AUTH_SECRET: "" })).toBe(
      false,
    );
  });
  it("requires HTTPS for remote hosts and permits loopback development", () => {
    expect(
      identityConfigured({
        ...fixture,
        BETTER_AUTH_URL: "http://public.example.test",
      }),
    ).toBe(false);
    expect(
      identityConfigured({
        ...fixture,
        BETTER_AUTH_URL: "http://127.0.0.1:3000",
      }),
    ).toBe(true);
  });
  it("rejects non-Postgres connections and untrusted URL shapes", () => {
    expect(
      identityConfigured({ ...fixture, BETTER_AUTH_URL: "not-a-url" }),
    ).toBe(false);
    expect(
      identityConfigured({ ...fixture, DATABASE_URL: "https://example.test" }),
    ).toBe(false);
    expect(
      identityConfigured({
        ...fixture,
        BETTER_AUTH_URL: "https://app.example.test/?token=x",
      }),
    ).toBe(false);
  });
});
