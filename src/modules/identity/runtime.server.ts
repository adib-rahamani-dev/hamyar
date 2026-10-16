import "server-only";
import { Pool } from "pg";
import { createIdentity, type AuthMail } from "./auth";
import { identityConfigSchema } from "./config";
import { assertRuntimeRole } from "./database-role";
import { developmentMailboxEnabled } from "./dev-mail-config";
import { captureDevelopmentMail } from "./dev-mailbox.server";
import { assertDomesticDependencies } from "../operations/deployment-mode";
import { mailConfigured } from "./mail-config";
import { sendSmtpMail } from "./smtp.server";

let runtime:
  | {
      auth: ReturnType<typeof createIdentity>;
      pool: Pool;
      assertReady: () => Promise<void>;
    }
  | undefined;
export function getIdentity() {
  if (runtime) return runtime;
  assertDomesticDependencies(process.env);
  const config = identityConfigSchema.safeParse(process.env);
  if (!config.success) throw new Error("IDENTITY_NOT_CONFIGURED");
  const pool = new Pool({
    connectionString: config.data.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  const auth = createIdentity(pool, {
    url: config.data.BETTER_AUTH_URL,
    secret: config.data.BETTER_AUTH_SECRET,
    requireEmailVerification:
      config.data.AUTH_EMAIL_VERIFICATION_REQUIRED !== "false",
    localMailbox: developmentMailboxEnabled(process.env),
    emailConfigured:
      developmentMailboxEnabled(process.env) || mailConfigured(process.env),
    secure: new URL(config.data.BETTER_AUTH_URL).protocol === "https:",
    sendMail: sendAuthMail,
  });
  // Verify structural readiness once per process; membership and room ACL stay fresh per action.
  let ready: Promise<void> | undefined;
  runtime = {
    pool,
    auth,
    assertReady: () =>
      (ready ??= assertRuntimeRole(pool).catch((error) => {
        ready = undefined;
        throw error;
      })),
  };
  return runtime;
}

async function sendAuthMail(mail: AuthMail) {
  if (developmentMailboxEnabled(process.env)) {
    captureDevelopmentMail(mail);
    return;
  }
  if (process.env.AUTH_MAIL_TRANSPORT === "smtp") return sendSmtpMail(mail);
  if (!mailConfigured(process.env))
    throw new Error("AUTH_EMAIL_NOT_CONFIGURED");
  if (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM)
    throw new Error("AUTH_EMAIL_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: `همیار\n\n${mail.subject}\n\n${mail.url}\n\nاگر این درخواست از شما نیست، این پیام را نادیده بگیرید.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
}
