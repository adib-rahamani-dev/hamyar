import { notFound } from "next/navigation";
import Link from "next/link";
import { AccountFrame } from "@/components/account-frame";
import { developmentMailboxEnabled } from "@/modules/identity/dev-mail-config";
import { developmentMessages } from "@/modules/identity/dev-mailbox.server";
export const dynamic = "force-dynamic";
export default function MailboxPage() {
  if (!developmentMailboxEnabled(process.env)) notFound();
  const mail = developmentMessages();
  return (
    <AccountFrame>
      <section className="ops-panel">
        <span className="eyebrow">محیط توسعه؛ فقط دادهٔ مصنوعی</span>
        <h1>صندوق ایمیل محلی</h1>
        <p className="section-note">
          پیام‌ها به اینترنت ارسال نمی‌شوند و تا ۱۵ دقیقه در حافظه می‌مانند. فقط
          از نشانی با پسوند .test استفاده کنید.
        </p>
        <div className="auth-links">
          <a className="text-action" href="/dev/mailbox">
            تازه‌کردن صندوق
          </a>
          <Link href="/account/sign-in">صفحهٔ ورود</Link>
        </div>
        {mail.length === 0 ? (
          <p className="section-note">هنوز پیامی دریافت نشده است.</p>
        ) : (
          mail.map((message) => (
            <article key={message.id} className="person-row">
              <div>
                <strong>{message.subject}</strong>
                <span>
                  <bdi>{message.to}</bdi>
                </span>
                <span>
                  {new Date(message.createdAt).toLocaleTimeString("fa-IR")}
                </span>
              </div>
              <a
                className="button secondary"
                href={message.url}
                rel="noreferrer"
              >
                بازکردن لینک
              </a>
            </article>
          ))
        )}
      </section>
    </AccountFrame>
  );
}
