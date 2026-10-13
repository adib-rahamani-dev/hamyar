import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { z } from "zod";
import { authSchema } from "./schema";

export type AuthMail = { to: string; subject: string; url: string };
export function createIdentity(
  pool: Pool,
  config: {
    url: string;
    secret: string;
    secure: boolean;
    localMailbox?: boolean;
    emailConfigured?: boolean;
    requireEmailVerification?: boolean;
    sendMail: (mail: AuthMail) => Promise<void>;
  },
) {
  const db = drizzle(pool, { schema: authSchema });
  const requireEmailVerification = config.requireEmailVerification !== false;
  return betterAuth({
    logger: { disabled: true },
    appName: "Hamyar",
    baseURL: config.url,
    secret: config.secret,
    trustedOrigins: [new URL(config.url).origin],
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        config.sendMail({ to: user.email, url, subject: "بازیابی حساب همیار" }),
    },
    emailVerification: {
      sendOnSignUp: requireEmailVerification,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) =>
        config.sendMail({ to: user.email, url, subject: "تأیید ایمیل همیار" }),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
      additionalFields: {
        activeOrganizationId: { type: "string", required: false, input: false },
      },
    },
    advanced: {
      useSecureCookies: config.secure,
      database: { generateId: "uuid" },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secure,
      },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          config.emailConfigured === false &&
          ((ctx.path === "/sign-up/email" && requireEmailVerification) ||
            ["/request-password-reset", "/send-verification-email"].includes(
              ctx.path,
            ))
        )
          throw new APIError("SERVICE_UNAVAILABLE", {
            message: "AUTH_EMAIL_NOT_CONFIGURED",
          });
        if (ctx.path !== "/sign-up/email") return;
        const value = z
          .object({
            name: z.string().trim().min(2).max(80),
            email: z.string().email().max(254),
          })
          .safeParse(ctx.body);
        if (
          !value.success ||
          (config.localMailbox &&
            !value.data.email.toLowerCase().endsWith(".test"))
        )
          throw new APIError("BAD_REQUEST", {
            message: "INVALID_ACCOUNT_INPUT",
          });
        ctx.body.name = value.data.name;
      }),
    },
  });
}
export type Identity = ReturnType<typeof createIdentity>;
