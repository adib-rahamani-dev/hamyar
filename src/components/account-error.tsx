"use client";
import Link from "next/link";
import { AccountFrame } from "./account-frame";
export function AccountError({ reset }: { reset: () => void }) {
  return (
    <AccountFrame>
      <section className="ops-panel auth-card">
        <h1>اطلاعات فعلاً در دسترس نیست</h1>
        <p className="section-note">
          اطلاعات حساب فعلاً دریافت نشد. اتصال را بررسی کنید و دوباره تلاش کنید.
        </p>
        <div className="auth-links">
          <button className="button primary" onClick={reset}>
            تلاش دوباره
          </button>
          <Link href="/account/sign-in">ورود به حساب</Link>
        </div>
      </section>
    </AccountFrame>
  );
}
