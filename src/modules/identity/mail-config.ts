import { z } from "zod";
const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.enum(["465", "587"]).default("465"),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  AUTH_EMAIL_FROM: z.string().min(3),
});
export function smtpConfig(env: Record<string, string | undefined>) {
  return smtpSchema.safeParse(env);
}
/** Sender readiness is shared by the server guard and account UI; no provider is mandatory. */
export function mailConfigured(env: Record<string, string | undefined>) {
  if (env.AUTH_MAIL_TRANSPORT === "smtp") return smtpConfig(env).success;
  if (env.AUTH_MAIL_TRANSPORT === "disabled") return false;
  if (env.AUTH_MAIL_TRANSPORT && env.AUTH_MAIL_TRANSPORT !== "resend")
    return false;
  return !!env.RESEND_API_KEY && !!env.AUTH_EMAIL_FROM;
}
