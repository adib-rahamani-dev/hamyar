"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleHelp,
  Cloud,
  Gauge,
  RefreshCw,
  Server,
  ShieldCheck,
  Video,
  Wifi,
  Users,
} from "lucide-react";
import type { DeploymentStatus } from "@/modules/operations/deployment-status";
import { demoRooms } from "@/lib/demo-data";

export function SupervisorPanel() {
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/status", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("status");
      const data: DeploymentStatus = await response.json();
      if (!controller.signal.aborted) setStatus(data);
    } catch {
      if (!controller.signal.aborted)
        setError("دریافت وضعیت ناموفق بود. دوباره تلاش کنید.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, []);

  return (
    <div className="supervisor-content">
      <section className="overview-banner">
        <div className="overview-copy">
          <span className="eyebrow">
            <ShieldCheck size={17} /> دید روشن، کنترل بهتر
          </span>
          <h2>
            تمام مجموعه،
            <br />
            <span>در یک نگاه.</span>
          </h2>
          <p>وضعیت زیرساخت، اتاق‌ها و محدودیت‌ها را از همین‌جا بررسی کنید.</p>
          <a href="#infrastructure" className="text-action">
            بررسی زیرساخت <ArrowLeft size={18} />
          </a>
        </div>
        <div className="overview-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core">
            <ShieldCheck size={48} strokeWidth={1.3} />
          </div>
          <span className="orbit-node node-one">
            <Video size={21} />
          </span>
          <span className="orbit-node node-two">
            <Server size={21} />
          </span>
          <span className="orbit-node node-three">
            <Users size={21} />
          </span>
        </div>
      </section>

      <section className="metrics-grid" aria-label="خلاصهٔ وضعیت">
        <article className="metric-card">
          <span className="metric-icon">
            <Cloud size={23} />
          </span>
          <span className="muted">میزبان برنامهٔ وب</span>
          <strong>
            {status?.hosting ?? (loading ? "در حال بررسی…" : "نامشخص")}
          </strong>
          <span className="metric-caption">
            {status?.environment ?? "پاسخ مستقیم از سرور برنامه"}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <Video size={23} />
          </span>
          <span className="muted">اتصال رسانه</span>
          <strong>متصل نشده</strong>
          <span className="metric-caption">
            LiveKit و TURN نیازمند راه‌اندازی
          </span>
        </article>
        <article className="metric-card capacity-card">
          <span className="metric-icon">
            <Gauge size={23} />
          </span>
          <span className="muted">ظرفیت باقی‌مانده</span>
          <strong>هنوز قابل محاسبه نیست</strong>
          <span className="metric-caption">بدون سقف معتبر و مصرف زنده</span>
        </article>
      </section>

      <div className="operations-grid">
        <section id="infrastructure" className="ops-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">زیرساخت وب</span>
              <h2>مشخصات استقرار</h2>
            </div>
            <button
              className="icon-button"
              aria-label="به‌روزرسانی وضعیت سرور"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? "refreshing" : ""} />
            </button>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <dl className="server-facts">
            <div>
              <dt>ارائه‌دهندهٔ وب</dt>
              <dd>{status?.hosting ?? "—"}</dd>
            </div>
            <div>
              <dt>محیط استقرار</dt>
              <dd>{status?.environment ?? "—"}</dd>
            </div>
            <div>
              <dt>ناحیهٔ اجرای درخواست</dt>
              <dd>
                <bdi>{status?.region ?? "از میزبان اعلام نشده"}</bdi>
              </dd>
            </div>
            <div>
              <dt>محیط اجرا</dt>
              <dd>
                <bdi>{status?.runtime ?? "—"}</bdi>
              </dd>
            </div>
            <div>
              <dt>سرور رسانه / ضبط</dt>
              <dd>راه‌اندازی نشده</dd>
            </div>
          </dl>
          <p className="panel-footnote">
            <Wifi size={16} />{" "}
            {status
              ? `آخرین دریافت: ${new Date(status.sampledAt).toLocaleTimeString("fa-IR")}`
              : "منتظر پاسخ سرور"}
            {loading ? " · در حال بررسی" : ""}
          </p>
          <p className="section-note">
            مشخصات وب واقعی است. RAM، CPU و فضای دیسک فیزیکی در محیط serverless
            در دسترس این برنامه نیستند. سلامت رسانه از سلامت وب جداست.
          </p>
        </section>
        <section className="ops-panel quota-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ظرفیت و محدودیت</span>
              <h2>ظرفیت و مصرف</h2>
            </div>
            <Gauge size={24} className="accent-text" />
          </div>
          <div className="quota-empty">
            <span className="quota-symbol">—</span>
            <strong>منتظر اتصال دادهٔ مصرف</strong>
            <p>
              ظرفیت خریداری‌شده و مصرف فعلی باید از منبع معتبر سازمان و سرور
              رسانه دریافت شوند.
            </p>
          </div>
          <dl className="server-facts compact">
            <div>
              <dt>افراد / اتاق‌های همزمان</dt>
              <dd>نامشخص</dd>
            </div>
            <div>
              <dt>فضای ضبط باقی‌مانده</dt>
              <dd>نامشخص</dd>
            </div>
            <div>
              <dt>ضبط همزمان مجاز</dt>
              <dd>نامشخص</dd>
            </div>
          </dl>
          <p className="panel-footnote">
            <CircleHelp size={16} /> نامشخص به معنی صفر یا نامحدود نیست.
          </p>
        </section>
      </div>

      <section className="ops-panel room-monitor">
        <div className="section-heading">
          <div>
            <span className="eyebrow">نمای اتاق‌ها</span>
            <h2>اتاق‌ها و میزبان‌ها</h2>
          </div>
          <span className="soft-badge">اطلاعات نمونه</span>
        </div>
        <div className="supervisor-list">
          {demoRooms.map((room) => (
            <article className="supervisor-room" key={room.id}>
              <span className={`course-icon ${room.color}`}>
                <Video size={22} />
              </span>
              <div className="monitor-room-copy">
                <h3>{room.name}</h3>
                <p className="muted">{room.group}</p>
              </div>
              <div className="host-detail">
                <span className="muted">میزبان نمونه</span>
                <strong>{room.teacher}</strong>
              </div>
              <span className="soft-badge">اتاق نمایشی</span>
              <Link
                className="icon-button"
                href="/rooms/demo"
                aria-label={`مشاهدهٔ اتاق ${room.name}`}
              >
                <ArrowUpRight size={20} />
              </Link>
            </article>
          ))}
        </div>
        <p className="section-note">
          هویت میزبان و حضور زنده پس از اتصال حساب‌ها و نشست‌های واقعی نمایش
          داده می‌شوند.
        </p>
      </section>
      <div className="operations-grid">
        <section className="ops-panel">
          <span className="eyebrow">وضعیت نسخهٔ فعلی</span>
          <h2>در این نسخه چه داریم؟</h2>
          <ul className="feature-list">
            <li>
              <Check size={18} /> پیش‌نمایش محلی دوربین و میکروفون
            </li>
            <li>
              <Check size={18} /> تخته، خروجی SVG و گفت‌وگوی محلی
            </li>
            <li>
              <Check size={18} /> تم روشن و تیره، موبایل و کیبورد
            </li>
            <li>
              <CircleHelp size={18} /> تماس چندنفره، ضبط و ورود امن هنوز فعال
              نیستند.
            </li>
          </ul>
          <p className="section-note">
            چت: حداکثر ۱۰۰۰ نویسه در هر پیام و ۱۰۰ پیام در حافظهٔ مرورگر؛ با
            بارگذاری مجدد پاک می‌شود.
          </p>
        </section>
        <section className="ops-panel support-callout">
          <span className="eyebrow">همراه شما</span>
          <h2>مسئله‌ای در کلاس دارید؟</h2>
          <p>موضوع، جزئیات و اولویت را در مرکز پشتیبانی آماده کنید.</p>
          <Link className="button primary" href="/support">
            ثبت پیش‌نویس تیکت <ArrowLeft size={18} />
          </Link>
          <span className="muted">
            ارسال و پیگیری سروری در مرحلهٔ بعد متصل می‌شود.
          </span>
        </section>
      </div>
    </div>
  );
}
