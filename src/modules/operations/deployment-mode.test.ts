import { describe, it, expect } from "vitest";
import { assertDomesticDependencies, deploymentMode } from "./deployment-mode";
import { mailConfigured } from "../identity/mail-config";
describe("runtime deployment contracts", () => {
  it("defaults to normal and rejects unknown mode values", () => {
    expect(deploymentMode({})).toBe("normal");
    expect(() =>
      deploymentMode({ HAMYAR_DEPLOYMENT_MODE: "offline-magic" }),
    ).toThrow();
  });
  it("rejects known foreign senders and databases in domestic mode", () => {
    expect(() =>
      assertDomesticDependencies({
        HAMYAR_DEPLOYMENT_MODE: "domestic",
        DATABASE_URL: "postgresql://db.example.neon.tech/app",
      }),
    ).toThrow("DOMESTIC_EXTERNAL_DEPENDENCY");
    expect(() =>
      assertDomesticDependencies({
        HAMYAR_DEPLOYMENT_MODE: "domestic",
        DATABASE_URL: "postgresql://postgres/app",
        RESEND_API_KEY: "fixture",
      }),
    ).toThrow();
    expect(() =>
      assertDomesticDependencies({
        HAMYAR_DEPLOYMENT_MODE: "domestic",
        DATABASE_URL: "postgresql://postgres/app",
      }),
    ).not.toThrow();
    expect(() =>
      assertDomesticDependencies({
        HAMYAR_DEPLOYMENT_MODE: "domestic",
        DATABASE_URL: "postgresql://unapproved.test/app",
      }),
    ).toThrow("DOMESTIC_HOST_NOT_APPROVED");
  });
  it("supports SMTP readiness without cloud keys and permits explicit mail disabling", () => {
    expect(
      mailConfigured({
        AUTH_MAIL_TRANSPORT: "typo",
        RESEND_API_KEY: "fixture",
        AUTH_EMAIL_FROM: "hello@example.test",
      }),
    ).toBe(false);
    expect(mailConfigured({ AUTH_MAIL_TRANSPORT: "smtp" })).toBe(false);
    expect(
      mailConfigured({
        AUTH_MAIL_TRANSPORT: "smtp",
        SMTP_HOST: "smtp.example.test",
        SMTP_USER: "fixture",
        SMTP_PASSWORD: "fixture",
        AUTH_EMAIL_FROM: "hello@example.test",
      }),
    ).toBe(true);
    expect(
      mailConfigured({
        AUTH_MAIL_TRANSPORT: "disabled",
        RESEND_API_KEY: "fixture",
        AUTH_EMAIL_FROM: "hello@example.test",
      }),
    ).toBe(false);
  });
  it("rejects cloud media even if accidentally included in the domestic allowlist", () => {
    expect(() =>
      assertDomesticDependencies({
        HAMYAR_DEPLOYMENT_MODE: "domestic",
        DATABASE_URL: "postgresql://postgres/app",
        LIVEKIT_URL: "wss://fixture.livekit.cloud",
        HAMYAR_DOMESTIC_HOSTS: "postgres,fixture.livekit.cloud",
      }),
    ).toThrow("DOMESTIC_EXTERNAL_DEPENDENCY");
  });
});
