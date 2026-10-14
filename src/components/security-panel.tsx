"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck, KeyRound, Monitor, Download } from "lucide-react";
import { authClient } from "@/modules/identity/client";
import { normalizeDigits } from "@/modules/identity/input";
import { useHydrated } from "./use-hydrated";
type Session = {
  id: string;
  token: string;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
};
export function SecurityPanel({
  enabled,
  sessionId,
}: {
  enabled: boolean;
  sessionId: string;
}) {
  const [verified, setVerified] = useState(enabled);
  const hydrated = useHydrated();
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => {
    void authClient
      .listSessions()
      .then((result) => {
        if (result.data) setSessions(result.data);
        else setNotice("دریافت نشست‌ها انجام نشد.");
      })
      .catch(() => setNotice("ارتباط برای دریافت نشست‌ها برقرار نشد."));
  }, []);
  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = await authClient.twoFactor.enable({
        password: String(new FormData(event.currentTarget).get("password")),
      });
      if (result.error || !result.data || !("totpURI" in result.data)) {
        setNotice("راه‌اندازی انجام نشد. رمز را بررسی کنید.");
        return;
      }
      setUri(result.data.totpURI);
      setCodes(result.data.backupCodes);
    } catch {
      setNotice("ارتباط برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: normalizeDigits(
          String(new FormData(event.currentTarget).get("code")),
        ),
        trustDevice: false,
      });
      if (result.error) {
        setNotice("کد معتبر نیست. دوباره تلاش کنید.");
        return;
      }
      setUri("");
      setVerified(true);
      setNotice(
        "تأیید دومرحله‌ای فعال شد. کدهای بازیابی را پیش از خروج نگه دارید.",
      );
    } catch {
      setNotice("ارتباط برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = await authClient.twoFactor.disable({
        password: String(new FormData(event.currentTarget).get("password")),
      });
      if (result.error) {
        setNotice("غیرفعال‌کردن انجام نشد؛ رمز عبور حساب را بررسی کنید.");
        return;
      }
      setCodes([]);
      setUri("");
      window.location.assign("/workspace");
    } catch {
      setNotice("ارتباط برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  function downloadCodes() {
    const url = URL.createObjectURL(
      new Blob([`کدهای بازیابی همیار؛ محرمانه\n\n${codes.join("\n")}`], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "hamyar-recovery-codes.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="real-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">امنیت حساب</span>
          <h1>کنترل دسترسی، دست شماست</h1>
          <p className="muted">امنیت اختیاری و نشست‌های فعال حساب.</p>
        </div>
        <Link className="text-action" href="/workspace">
          مجموعه‌های شما
        </Link>
      </div>
      <p className="draft-notice" role="status">
        {notice}
      </p>
      <div className="operations-grid">
        <section className="ops-panel">
          <div className="section-heading">
            <h2>تأیید دومرحله‌ای · اختیاری</h2>
            <ShieldCheck size={25} className="accent-text" />
          </div>
          {verified ? (
            <form className="ticket-form" onSubmit={disable}>
              <p>فعال است؛ برای ورود فقط با رمز، می‌توانید آن را خاموش کنید.</p>
              <label htmlFor="disable-mfa-password">رمز عبور حساب</label>
              <input
                id="disable-mfa-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={busy || !hydrated}
              />
              <button className="button secondary" disabled={busy || !hydrated}>
                غیرفعال‌کردن تأیید دومرحله‌ای
              </button>
            </form>
          ) : !uri ? (
            <form className="ticket-form" onSubmit={enable}>
              <p className="muted">
                این قابلیت اختیاری است؛ مدیریت با رمز عبور هم انجام می‌شود.
                برنامهٔ تأییدکننده مثل Google Authenticator یا برنامهٔ سازگار با
                TOTP را آماده کنید.
              </p>
              <label htmlFor="mfa-password">رمز عبور حساب</label>
              <input
                id="mfa-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={!hydrated}
              />
              <button className="button primary" disabled={busy || !hydrated}>
                <KeyRound size={18} /> راه‌اندازی MFA
              </button>
            </form>
          ) : (
            <form className="ticket-form" onSubmit={verify}>
              <p>
                یک حساب با ورود دستی کلید در برنامهٔ تأییدکننده بسازید. کلید فقط
                در همین صفحه نمایش داده می‌شود.
              </p>
              <label htmlFor="totp-secret">کلید محرمانهٔ برنامه</label>
              <input
                id="totp-secret"
                readOnly
                dir="ltr"
                value={new URL(uri).searchParams.get("secret") ?? ""}
              />
              <label htmlFor="mfa-code">کد شش‌رقمی برنامه</label>
              <input
                id="mfa-code"
                name="code"
                dir="ltr"
                required
                pattern="[0-9۰-۹٠-٩]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <button className="button primary" disabled={busy}>
                تأیید و فعال‌کردن
              </button>
            </form>
          )}
          {codes.length > 0 && (
            <div className="recovery-codes">
              <h3>کدهای بازیابی</h3>
              <p className="muted">
                در جای امن نگه دارید؛ هر کد یک بار مصرف می‌شود. این صفحه آنها را
                در مرورگر ذخیره نمی‌کند.
              </p>
              <div dir="ltr">
                {codes.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
              <button className="button secondary" onClick={downloadCodes}>
                <Download size={18} /> دانلود کدهای بازیابی
              </button>
              <Link className="text-action" href="/workspace">
                ادامه به مجموعه‌ها
              </Link>
            </div>
          )}
        </section>
        <section className="ops-panel">
          <div className="section-heading">
            <h2>نشست‌های فعال</h2>
            <Monitor size={24} className="accent-text" />
          </div>
          <p className="section-note">
            نشست ناشناس را لغو کنید. لغو نشست جاری شما را از حساب خارج می‌کند.
          </p>
          {sessions.map((item) => (
            <div className="session-row" key={item.id}>
              <div>
                <strong>
                  {item.userAgent?.slice(0, 100) ||
                    "دستگاه با مشخصات اعلام‌نشده"}
                </strong>
                <p>{new Date(item.createdAt).toLocaleString("fa-IR")}</p>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm("این نشست لغو شود؟")) return;
                  setBusy(true);
                  try {
                    const result = await authClient.revokeSession({
                      token: item.token,
                    });
                    if (result.error) {
                      setNotice("لغو نشست انجام نشد.");
                      return;
                    }
                    if (item.id === sessionId) {
                      window.location.assign("/account/sign-in");
                      return;
                    }
                    setSessions((current) =>
                      current.filter((s) => s.id !== item.id),
                    );
                    setNotice("نشست لغو شد.");
                  } catch {
                    setNotice("ارتباط برقرار نشد.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                لغو نشست
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
