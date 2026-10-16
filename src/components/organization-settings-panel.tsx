"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Palette, Check, ShieldCheck } from "lucide-react";
type Brand = {
  displayName: string;
  tone: string;
  welcome: string;
  canEdit: boolean;
};
export function OrganizationSettingsPanel({
  mode,
}: {
  mode: "normal" | "domestic";
}) {
  const [brand, setBrand] = useState<Brand | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/brand", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const data = await r.json();
        setBrand(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setNotice("ابتدا یک مجموعهٔ فعال انتخاب کنید.");
      });
    return () => controller.abort();
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!brand || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/workspace/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: brand.displayName,
          tone: brand.tone,
          welcome: brand.welcome,
        }),
      });
      if (!response.ok) throw Error();
      setNotice("ظاهر و پیام مجموعه ذخیره شدند.");
    } catch {
      setNotice("ذخیره انجام نشد؛ این تغییر برای مالک یا مدیر مجموعه است.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="real-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ظاهر مجموعهٔ شما</span>
          <h1>با هویت خودتان دیده شوید</h1>
          <p className="muted">
            نام، رنگ و پیام خوشامد در اتاق‌های همین مجموعه.
          </p>
        </div>
        <Link href="/workspace" className="button secondary">
          بازگشت به مجموعه‌ها
        </Link>
      </div>
      <div className="operations-grid">
        <section className="ops-panel">
          <div className="section-heading">
            <h2>هویت بصری</h2>
            <Palette size={24} />
          </div>
          {brand && (
            <form className="ticket-form" onSubmit={save}>
              <label htmlFor="brand-name">نام نمایشی مجموعه</label>
              <input
                id="brand-name"
                required
                minLength={2}
                maxLength={80}
                value={brand.displayName}
                onChange={(e) =>
                  setBrand({ ...brand, displayName: e.target.value })
                }
                disabled={!brand.canEdit || busy}
              />
              <label htmlFor="brand-tone">رنگ اصلی</label>
              <select
                id="brand-tone"
                value={brand.tone}
                onChange={(e) => setBrand({ ...brand, tone: e.target.value })}
                disabled={!brand.canEdit || busy}
              >
                <option value="emerald">سبز زمردی</option>
                <option value="ocean">آبی اقیانوسی</option>
                <option value="violet">بنفش آرام</option>
              </select>
              <label htmlFor="brand-welcome">پیام خوشامد اتاق</label>
              <textarea
                id="brand-welcome"
                maxLength={240}
                rows={3}
                value={brand.welcome}
                onChange={(e) =>
                  setBrand({ ...brand, welcome: e.target.value })
                }
                disabled={!brand.canEdit || busy}
              />
              <button
                className="button primary"
                disabled={!brand.canEdit || busy}
              >
                <Check size={18} /> ذخیرهٔ ظاهر مجموعه
              </button>
            </form>
          )}
          <p role="status" className="draft-notice">
            {notice}
          </p>
        </section>
        <section className="ops-panel">
          <div className="section-heading">
            <h2>محیط اجرای همیار</h2>
            <ShieldCheck size={24} />
          </div>
          <span className="soft-badge">
            {mode === "domestic" ? "حالت زیرساخت داخلی" : "حالت عادی"}
          </span>
          <p className="section-note">
            {mode === "domestic"
              ? "این نسخه برای اتصال به خدمات خودمیزبان تنظیم شده است. دسترس‌پذیری واقعی شبکه به سرور، دامنه و آزمون اتصال بستگی دارد."
              : "حالت عادی برای آزمایش و استفاده با اینترنت در دسترس است. حالت داخلی از همان قابلیت‌ها روی زیرساخت خودتان استفاده می‌کند."}
          </p>
          <Link className="text-action" href="/account/security">
            مدیریت نشست‌های حساب
          </Link>
        </section>
      </div>
    </div>
  );
}
