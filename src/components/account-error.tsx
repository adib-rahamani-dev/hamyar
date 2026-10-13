"use client";
import Link from "next/link";
import { AccountFrame } from "./account-frame";
export function AccountError({ reset }: { reset: () => void }) {
  return (
    <AccountFrame>
      <section className="ops-panel auth-card">
        <h1>اطلاعات فعلاً در دسترس نیست</h1>
        <p className="section-note">
          اتصال پایگاه داده یا آماده‌بودن زیرساخت حساب را بررسی کنید. دادهٔ
          نمونه جای اطلاعات حساب نمایش داده نمی‌شود.
        </p>
        <div className="auth-links">
          <button className="button primary" onClick={reset}>
            تلاش دوباره
          </button>
          <Link href="/demo">فضای نمونه</Link>
        </div>
      </section>
    </AccountFrame>
  );
}
