"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { authClient } from "@/modules/identity/client";
import { normalizeDigits } from "@/modules/identity/input";
import { useHydrated } from "./use-hydrated";

type Mode = "sign-in" | "sign-up" | "reset" | "new-password" | "two-factor";
const titles: Record<Mode, string> = {
  "sign-in": "خوش آمدید",
  "sign-up": "شروع یک مسیر تازه",
  reset: "بازیابی حساب",
  "new-password": "رمز عبور تازه",
  "two-factor": "تأیید ورود امن",
};
export function AuthPanel({
  mode,
  configured,
  emailConfigured = false,
  localMailbox = false,
  token = "",
}: {
  mode: Mode;
  configured: boolean;
  emailConfigured?: boolean;
  localMailbox?: boolean;
  token?: string;
}) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [backup, setBackup] = useState(false);
  const hydrated = useHydrated();
  const blocked =
    !configured ||
    ((mode === "sign-up" || mode === "reset") && !emailConfigured);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || busy || !hydrated) return;
    setBusy(true);
    setNotice("");
    const data = new FormData(event.currentTarget),
      email = String(data.get("email") ?? ""),
      password = String(data.get("password") ?? "");
    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : mode === "sign-up"
            ? await authClient.signUp.email({
                email,
                password,
                name: String(data.get("name")),
                callbackURL: "/account/sign-in",
              })
            : mode === "reset"
              ? await authClient.requestPasswordReset({
                  email,
                  redirectTo: "/account/new-password",
                })
              : mode === "new-password"
                ? await authClient.resetPassword({
                    token,
                    newPassword: password,
                  })
                : backup
                  ? await authClient.twoFactor.verifyBackupCode({
                      code: normalizeDigits(String(data.get("code"))),
                    })
                  : await authClient.twoFactor.verifyTotp({
                      code: normalizeDigits(String(data.get("code"))),
                      trustDevice: false,
                    });
      if (result.error) {
        setNotice(
          result.error.code === "EMAIL_NOT_VERIFIED"
            ? "ابتدا ایمیل خود را تأیید کنید."
            : "درخواست انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.",
        );
        return;
      }
      if (mode === "sign-in") {
        if (
          result.data &&
          "twoFactorRedirect" in result.data &&
          result.data.twoFactorRedirect
        )
          return;
        window.location.assign("/workspace");
      } else if (mode === "two-factor") window.location.assign("/workspace");
      else if (mode === "sign-up")
        setNotice("حساب ساخته شد. برای ورود، لینک تأیید ایمیل را باز کنید.");
      else if (mode === "reset")
        setNotice(
          "اگر حساب واجد شرایطی وجود داشته باشد، پیام بازیابی برای آن ارسال می‌شود.",
        );
      else setNotice("رمز تغییر کرد؛ اکنون وارد حساب شوید.");
    } catch {
      setNotice(
        "ارتباط برقرار نشد. دوباره تلاش کنید؛ اطلاعات فرم حفظ شده است.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-panel auth-card">
      <span className="auth-symbol">
        <ShieldCheck size={30} />
      </span>
      <span className="eyebrow">حساب شما در همیار</span>
      <h1>{titles[mode]}</h1>
      <p className="muted">
        {mode === "two-factor"
          ? "کد برنامهٔ تأییدکننده یا کد بازیابی را وارد کنید."
          : "برای مدیریت مجموعه‌های خود، وارد حساب شوید."}
      </p>
      {localMailbox && (
        <div className="setup-note">
          <p>
            محیط آزمایشی محلی؛ فقط نشانی .test وارد کنید.{" "}
            <Link className="text-action" href="/dev/mailbox">
              صندوق ایمیل محلی
            </Link>
          </p>
        </div>
      )}
      {blocked && (
        <div className="setup-note" role="status">
          <KeyRound size={21} />
          <p>
            {!configured
              ? "حساب واقعی هنوز روی این میزبان تنظیم نشده است. اتصال پایگاه داده و کلید احراز هویت باید در محیط سرور اضافه شوند."
              : "ارسال ایمیل هنوز تنظیم نشده است؛ ثبت‌نام و بازیابی تا اتصال سرویس فرستنده فعال نمی‌شوند."}
          </p>
        </div>
      )}
      <form className="ticket-form" onSubmit={submit}>
        <fieldset
          className="auth-fields"
          disabled={blocked || busy || !hydrated}
        >
          {mode === "sign-up" && (
            <>
              <label htmlFor="auth-name">نام و نام خانوادگی</label>
              <input
                id="auth-name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </>
          )}
          {["sign-in", "sign-up", "reset"].includes(mode) && (
            <>
              <label htmlFor="auth-email">ایمیل</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                dir="ltr"
                required
                maxLength={254}
                autoComplete="email"
              />
            </>
          )}
          {["sign-in", "sign-up", "new-password"].includes(mode) && (
            <>
              <label htmlFor="auth-password">رمز عبور</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
              />
              <p className="muted">
                حداقل ۱۲ نویسه؛ برای هر سرویس رمز متفاوت انتخاب کنید.
              </p>
            </>
          )}
          {mode === "two-factor" && (
            <>
              <label htmlFor="auth-code">
                {backup ? "کد بازیابی" : "کد شش‌رقمی"}
              </label>
              <input
                id="auth-code"
                name="code"
                dir="ltr"
                inputMode={backup ? "text" : "numeric"}
                autoComplete="one-time-code"
                required
                pattern={backup ? undefined : "[0-9۰-۹٠-٩]{6}"}
              />
            </>
          )}
          <button
            className="button primary"
            disabled={blocked || busy || !hydrated}
            type="submit"
          >
            {busy
              ? "در حال انجام…"
              : mode === "sign-in"
                ? "ورود به همیار"
                : mode === "sign-up"
                  ? "ساخت حساب"
                  : mode === "two-factor"
                    ? "تأیید ورود"
                    : "ادامه"}
            <ArrowLeft size={18} />
          </button>
          <p role="status" className="draft-notice">
            {notice}
          </p>
        </fieldset>
      </form>
      <div className="auth-links">
        {mode === "sign-in" ? (
          <>
            <Link href="/account/sign-up">ساخت حساب جدید</Link>
            <Link href="/account/reset">رمز را فراموش کردم</Link>
          </>
        ) : mode === "two-factor" ? (
          <button className="text-action" onClick={() => setBackup(!backup)}>
            {backup ? "استفاده از برنامهٔ تأییدکننده" : "استفاده از کد بازیابی"}
          </button>
        ) : (
          <Link href="/account/sign-in">بازگشت به ورود</Link>
        )}
      </div>
    </section>
  );
}
