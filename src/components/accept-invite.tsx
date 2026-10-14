"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export function AcceptInvite() {
  const [token, setToken] = useState("");
  useEffect(() => {
    setToken(
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "",
    );
  }, []);
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="ops-panel auth-card">
      <h1>دعوت به مجموعه</h1>
      <p className="section-note">
        با حسابی وارد شوید که ایمیل تأییدشدهٔ آن همان ایمیل دعوت است.
      </p>
      <button
        className="button primary"
        disabled={busy || !/^[\w-]{43}$/.test(token)}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/workspace/accept", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            if (response.ok) {
              window.location.assign("/workspace");
              return;
            }
            const data = await response.json();
            setNotice(
              data.error === "MFA_REQUIRED"
                ? "ابتدا تأیید دومرحله‌ای را فعال کنید."
                : data.error === "EMAIL_VERIFICATION_REQUIRED"
                  ? "پذیرش دعوت به ایمیل تأییدشده نیاز دارد؛ ثبت‌نام موقت این دسترسی را فعال نمی‌کند."
                  : "دعوت پذیرفته نشد. ایمیل حساب، ورود، انقضا و لغو دعوت را بررسی کنید.",
            );
          } catch {
            setNotice("ارتباط برقرار نشد.");
          } finally {
            setBusy(false);
          }
        }}
      >
        پذیرش دعوت
      </button>
      <p className="draft-notice" role="status">
        {notice}
      </p>
      <div className="auth-links">
        <Link href="/account/sign-in">ورود به حساب</Link>
        <Link href="/account/security">امنیت حساب</Link>
      </div>
    </section>
  );
}
