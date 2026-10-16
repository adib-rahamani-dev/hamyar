import "server-only";
import type { AuthMail } from "./auth";
import { smtpConfig } from "./mail-config";
/** SMTP transport supports an operator-owned sender, with mandatory TLS and no message logs. */
export async function sendSmtpMail(mail: AuthMail) {
  const config = smtpConfig(process.env);
  if (!config.success) throw new Error("AUTH_EMAIL_NOT_CONFIGURED");
  const nodemailer = await import("nodemailer");
  const c = config.data;
  const transport = nodemailer.default.createTransport({
    host: c.SMTP_HOST,
    port: Number(c.SMTP_PORT),
    secure: c.SMTP_PORT === "465",
    requireTLS: c.SMTP_PORT === "587",
    auth: { user: c.SMTP_USER, pass: c.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    await transport.sendMail({
      from: c.AUTH_EMAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: `همیار\n\n${mail.subject}\n\n${mail.url}\n\nاگر این درخواست از شما نیست، پیام را نادیده بگیرید.`,
    });
  } catch {
    throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
  } finally {
    transport.close();
  }
}
