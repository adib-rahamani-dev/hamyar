"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  GraduationCap,
  LifeBuoy,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AppearanceToggle } from "./appearance-toggle";
import { demoPeople, demoRooms, faNumber } from "@/lib/demo-data";
const SupervisorPanel = dynamic(() =>
  import("./supervisor-panel").then((module) => module.SupervisorPanel),
);
const SupportPanel = dynamic(() =>
  import("./support-panel").then((module) => module.SupportPanel),
);

type View = "classes" | "people" | "supervisor" | "support" | "settings";
const navigation: {
  id: View;
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "classes", href: "/", label: "کلاس‌ها", icon: Video },
  { id: "people", href: "/members", label: "اعضای مجموعه", icon: Users },
  {
    id: "supervisor",
    href: "/supervisor",
    label: "مرکز نظارت",
    icon: ShieldCheck,
  },
  { id: "support", href: "/support", label: "پشتیبانی", icon: LifeBuoy },
  { id: "settings", href: "/settings", label: "تنظیمات", icon: Settings2 },
];
const subtitles: Record<View, string> = {
  classes: "یک فضای آرام برای یادگیری و ارتباط.",
  people: "آدم‌هایی که یادگیری را ممکن می‌کنند.",
  supervisor: "زیرساخت، ظرفیت و اتاق‌ها؛ با وضعیت روشن.",
  support: "هر مسئله، یک مسیر روشن برای پیگیری.",
  settings: "فضای همیار را به سلیقهٔ خود نزدیک کنید.",
};

export function Dashboard({ initialView = "classes" }: { initialView?: View }) {
  const [query, setQuery] = useState("");
  const title = navigation.find((item) => item.id === initialView)!.label;
  const rooms = demoRooms.filter((room) =>
    `${room.name} ${room.teacher} ${room.group}`.includes(query),
  );
  return (
    <div className="app-shell management-shell">
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="همیار، صفحه اصلی">
          <span className="brand-mark">
            <AudioLines size={27} />
          </span>
          <strong>
            همیار<span className="brand-caption">فضای ارتباط و یادگیری</span>
          </strong>
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">
            <GraduationCap size={22} />
          </span>
          <div>
            <strong>مدرسهٔ آینده</strong>
            <span>فضای آموزشی نمونه</span>
          </div>
          <ChevronLeft size={16} />
        </div>
        <span className="nav-caption">فضای مدیریت</span>
        <nav className="main-nav" aria-label="منوی اصلی">
          {navigation.map(({ id, href, label, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className={`nav-item ${initialView === id ? "active" : ""}`}
              aria-current={initialView === id ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
              {initialView === id && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-assistance">
            <LifeBuoy size={23} />
            <strong>همراه شما در کلاس</strong>
            <p>درخواست پشتیبانی را آماده کنید.</p>
            <Link href="/support">
              مرکز پشتیبانی <ArrowLeft size={16} />
            </Link>
          </div>
          <div className="sidebar-profile">
            <span className="avatar">کا</span>
            <div>
              <strong>کاربر آزمایشی</strong>
              <span>نشست واقعی هنوز متصل نیست</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            فضای مدیریت <ChevronLeft size={17} />
            <span>{title}</span>
          </div>
          <div className="topbar-actions">
            <span className="demo-label">نسخهٔ توسعه</span>
            <AppearanceToggle />
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="dashboard-main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">فضای شما در همیار</span>
              <h1>{initialView === "classes" ? "کلاس‌های شما" : title}</h1>
              <p className="muted">{subtitles[initialView]}</p>
            </div>
            {initialView === "classes" ? (
              <Link className="button secondary" href="/supervisor">
                <ShieldCheck size={19} /> مرکز نظارت
              </Link>
            ) : (
              <Link className="text-action" href="/">
                کلاس‌ها <ArrowLeft size={18} />
              </Link>
            )}
          </div>
          {initialView === "classes" && (
            <>
              <section className="class-welcome">
                <div>
                  <span className="eyebrow">یادگیری، با خیال آسوده</span>
                  <h2>جا برای ایده‌های بزرگ.</h2>
                  <p>تخته، گفت‌وگو و ابزارهای کلاس، در یک فضای ساده.</p>
                  <Link className="button primary" href="/rooms/demo">
                    تجربهٔ اتاق نمونه <ArrowLeft size={18} />
                  </Link>
                </div>
                <div className="welcome-illustration" aria-hidden="true">
                  <div className="illustration-window">
                    <span />
                    <span />
                    <span />
                    <BookOpen size={67} strokeWidth={1.2} />
                    <div className="illustration-line" />
                    <div className="illustration-line short" />
                  </div>
                  <span className="floating-symbol">
                    <GraduationCap size={29} />
                  </span>
                </div>
              </section>
              <section className="rooms-section" aria-label="کلاس‌های نمونه">
                <div className="list-heading">
                  <h2>
                    فهرست کلاس‌ها{" "}
                    <span className="count-label">
                      {faNumber(demoRooms.length)}
                    </span>
                  </h2>
                  <label className="search-field">
                    <Search size={20} />
                    <input
                      aria-label="جست‌وجوی کلاس"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="جست‌وجوی کلاس یا معلم"
                    />
                  </label>
                </div>
                <div className="rooms-list">
                  {rooms.map((room) => (
                    <article
                      className={`room-card course-${room.color}`}
                      key={room.id}
                    >
                      <div className="course-card-top">
                        <span className={`course-icon ${room.color}`}>
                          <BookOpen size={25} />
                        </span>
                        <span className="soft-badge">کلاس نمونه</span>
                      </div>
                      <div className="room-description">
                        <span className="course-group">{room.group}</span>
                        <h3>{room.name}</h3>
                        <p>{room.topic}</p>
                      </div>
                      <div className="course-teacher">
                        <span className="avatar">{room.initials}</span>
                        <div>
                          <strong>{room.teacher}</strong>
                          <span>میزبان نمونه</span>
                        </div>
                      </div>
                      <div className="course-card-bottom">
                        <div className="room-meta">
                          <strong>{room.time}</strong>
                          <span>{room.duration}</span>
                        </div>
                        <Link
                          className="icon-button"
                          href="/rooms/demo"
                          aria-label={`ورود به اتاق نمونه ${room.name}`}
                        >
                          <ArrowLeft size={21} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {rooms.length === 0 && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h3>کلاسی با این عبارت پیدا نشد.</h3>
                    <button
                      className="button secondary"
                      onClick={() => setQuery("")}
                    >
                      پاک‌کردن جست‌وجو
                    </button>
                  </div>
                )}
                <p className="section-note">
                  <CircleHelp size={16} /> اطلاعات کلاس‌ها و میزبان‌ها نمونه
                  است. اتاق فعلاً تماس زنده و ضبط ندارد.
                </p>
              </section>
            </>
          )}
          {initialView === "people" && (
            <section className="ops-panel people-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">همراهان مجموعه</span>
                  <h2>اعضای مجموعه</h2>
                </div>
                <span className="soft-badge">
                  {faNumber(demoPeople.length)} عضو نمونه
                </span>
              </div>
              <div className="people-list">
                {demoPeople.map((person) => (
                  <div className="person-row" key={person.name}>
                    <span className="avatar">{person.initials}</span>
                    <div>
                      <strong>{person.name}</strong>
                      <span>{person.group}</span>
                    </div>
                    <span className="person-role">{person.role}</span>
                  </div>
                ))}
              </div>
              <p className="section-note">
                دعوت، عضویت و تغییر نقش پس از اتصال احراز هویت و پایگاه داده
                فعال می‌شوند.
              </p>
            </section>
          )}
          {initialView === "supervisor" && <SupervisorPanel />}
          {initialView === "support" && <SupportPanel />}
          {initialView === "settings" && (
            <section className="ops-panel settings-panel">
              <span className="eyebrow">به سلیقهٔ شما</span>
              <h2>تنظیمات مجموعه</h2>
              <div className="setting-row">
                <div>
                  <strong>تم روشن و تیره</strong>
                  <p className="muted">
                    انتخاب شما در این مرورگر ذخیره می‌شود.
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <div className="setting-row">
                <div>
                  <strong>نام، لوگو و رنگ برند</strong>
                  <p className="muted">
                    شخصی‌سازی سازمان پس از اتصال حساب مدیر فعال می‌شود.
                  </p>
                </div>
                <span className="soft-badge">در مرحلهٔ بعد</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>دسترسی، ضبط و نگهداری داده</strong>
                  <p className="muted">
                    این سیاست‌ها باید در سرور سازمان اعمال شوند.
                  </p>
                </div>
                <ShieldCheck size={24} className="muted" />
              </div>
            </section>
          )}
          <footer className="management-footer">
            <span>همیار · ساده برای همه</span>
            <span>زیرساخت وب واقعی؛ امکانات سازمانی در حال توسعه</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
