import { z } from "zod";

export const identityConfigSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine((v) => /^postgres(ql)?:/.test(v)),
    BETTER_AUTH_URL: z
      .string()
      .url()
      .refine((value) => {
        try {
          const url = new URL(value);
          return (
            (url.protocol === "https:" ||
              (url.protocol === "http:" &&
                ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) &&
            !url.search &&
            !url.hash &&
            url.pathname === "/"
          );
        } catch {
          return false;
        }
      }),
    BETTER_AUTH_SECRET: z.string().min(32),
    AUTH_EMAIL_VERIFICATION_REQUIRED: z.enum(["true", "false"]).default("true"),
  })
  .superRefine((config, ctx) => {
    if (
      /^https:/i.test(config.BETTER_AUTH_URL) &&
      /fixture|local-only|change.?me|example/i.test(config.BETTER_AUTH_SECRET)
    )
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message:
          "Development fixtures cannot authenticate a public deployment.",
      });
  });
export function identityConfigured(env: Record<string, string | undefined>) {
  return identityConfigSchema.safeParse(env).success;
}
export function emailVerificationRequired(
  env: Record<string, string | undefined>,
) {
  return env.AUTH_EMAIL_VERIFICATION_REQUIRED !== "false";
}
