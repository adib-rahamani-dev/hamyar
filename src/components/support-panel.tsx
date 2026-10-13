"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  LifeBuoy,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import {
  draftStorageKey,
  readDraft,
  ticketDraftSchema,
  type TicketDraft,
} from "@/modules/support/draft";

const empty: TicketDraft = {
  version: 1,
  subject: "",
  category: "technical",
  priority: "normal",
  description: "",
};

export function SupportPanel() {
  const [draft, setDraft] = useState<TicketDraft>(empty);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = readDraft(localStorage.getItem(draftStorageKey));
      if (stored) {
        setDraft(stored);
        setSaved(true);
      }
    } catch {
      /* Storage can be blocked; the form and download still work. */
    }
  }, []);

  function validate() {
    const result = ticketDraftSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      setNotice("موضوع و جزئیات را بررسی کنید.");
      return null;
    }
    setErrors({});
    return result.data;
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const valid = validate();
    if (!valid) return;
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(valid));
      setSaved(true);
      setNotice(
        "پیش‌نویس در همین مرورگر ذخیره شد؛ برای پشتیبانی ارسال نشده است.",
      );
    } catch {
      setNotice(
        "ذخیره در مرورگر در دسترس نیست. می‌توانید فایل پیش‌نویس را دانلود کنید.",
      );
    }
  }

  function download() {
    const valid = validate();
    if (!valid) return;
    const body = `پیش‌نویس تیکت همیار — ارسال نشده\n\nموضوع: ${valid.subject}\nدسته: ${valid.category === "technical" ? "فنی" : valid.category === "account" ? "حساب و دسترسی" : "پیشنهاد"}\nاولویت: ${valid.priority === "urgent" ? "فوری" : "عادی"}\n\n${valid.description}\n`;
    const url = URL.createObjectURL(
      new Blob([body], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "hamyar-ticket-draft.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("فایل پیش‌نویس آماده شد؛ تیکت برای پشتیبانی ارسال نشده است.");
  }

  function clear() {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      setNotice("پاک‌کردن حافظهٔ مرورگر ناموفق بود.");
      return;
    }
    setDraft(empty);
    setErrors({});
    setSaved(false);
    setNotice("پیش‌نویس حذف شد.");
  }

  return (
    <div className="support-layout">
      <section className="ops-panel ticket-form-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">درخواست پشتیبانی</span>
            <h2>چطور می‌توانیم کمک کنیم؟</h2>
          </div>
          <span className="metric-icon">
            <LifeBuoy size={25} />
          </span>
        </div>
        <p className="section-note">
          تیکت را آماده کنید. سرویس ارسال و پیگیری هنوز به این نسخه متصل نشده
          است.
        </p>
        <form className="ticket-form" onSubmit={save} noValidate>
          <label htmlFor="ticket-subject">موضوع درخواست</label>
          <input
            id="ticket-subject"
            value={draft.subject}
            maxLength={120}
            placeholder="مثلاً مشکل اتصال به کلاس"
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? "subject-error" : undefined}
            onChange={(event) => {
              setDraft({ ...draft, subject: event.target.value });
              setSaved(false);
            }}
          />
          {errors.subject && (
            <p id="subject-error" className="inline-error">
              {errors.subject}
            </p>
          )}
          <div className="form-pair">
            <div>
              <label htmlFor="ticket-category">دسته‌بندی</label>
              <select
                id="ticket-category"
                value={draft.category}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    category: event.target.value as TicketDraft["category"],
                  });
                  setSaved(false);
                }}
              >
                <option value="technical">مشکل فنی</option>
                <option value="account">حساب و دسترسی</option>
                <option value="feedback">پیشنهاد و بازخورد</option>
              </select>
            </div>
            <div>
              <label htmlFor="ticket-priority">اولویت</label>
              <select
                id="ticket-priority"
                value={draft.priority}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    priority: event.target.value as TicketDraft["priority"],
                  });
                  setSaved(false);
                }}
              >
                <option value="normal">عادی</option>
                <option value="urgent">فوری</option>
              </select>
            </div>
          </div>
          <label htmlFor="ticket-description">شرح مسئله</label>
          <textarea
            id="ticket-description"
            value={draft.description}
            maxLength={4000}
            rows={7}
            placeholder="چه اتفاقی افتاد؟ انتظار داشتید چه چیزی ببینید؟"
            aria-invalid={!!errors.description}
            aria-describedby="description-hint description-error"
            onChange={(event) => {
              setDraft({ ...draft, description: event.target.value });
              setSaved(false);
            }}
          />
          <p id="description-hint" className="muted">
            رمز عبور، توکن یا اطلاعات شخصی دانش‌آموزان را ننویسید.
          </p>
          <p id="description-error" className="inline-error">
            {errors.description ?? ""}
          </p>
          <div className="form-actions">
            <button type="submit" className="button primary">
              ذخیرهٔ پیش‌نویس <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={download}
            >
              <Download size={18} /> دانلود فایل
            </button>
          </div>
          <p role="status" className="draft-notice">
            {notice}
          </p>
        </form>
      </section>
      <aside className="support-aside">
        <section className="ops-panel">
          <span className="eyebrow">در همین مرورگر</span>
          <h2>پیش‌نویس شما</h2>
          <div className="draft-preview">
            <FileText size={28} />
            <strong>{saved ? "ذخیره شده در مرورگر" : "هنوز ذخیره نشده"}</strong>
            <p>{draft.subject || "موضوع درخواست اینجا دیده می‌شود."}</p>
            {saved && (
              <span className="soft-badge">
                <Check size={14} /> پیش‌نویس؛ ارسال نشده
              </span>
            )}
          </div>
          <button
            type="button"
            className="button secondary full"
            onClick={clear}
          >
            <Trash2 size={18} /> پاک‌کردن پیش‌نویس
          </button>
        </section>
        <section className="support-privacy">
          <LockKeyhole size={23} />
          <h3>اطلاعات فقط در این دستگاه</h3>
          <p>
            با انتخاب ذخیره، متن در این مرورگر باقی می‌ماند. در دستگاه مشترک پس
            از کار، پیش‌نویس را پاک کنید. شمارهٔ پیگیری و پاسخ پشتیبانی پس از
            اتصال سرویس واقعی فعال می‌شوند.
          </p>
        </section>
      </aside>
    </div>
  );
}
