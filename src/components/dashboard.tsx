"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  GraduationCap,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { demoPeople, demoRooms, faNumber } from "@/lib/demo-data";

type View = "classes" | "people" | "supervisor" | "settings";
const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "classes", label: "کلاس‌ها", icon: Video },
  { id: "people", label: "اعضای مجموعه", icon: Users },
  { id: "supervisor", label: "مرکز نظارت", icon: ShieldCheck },
  { id: "settings", label: "تنظیمات", icon: Settings2 },
];

export function Dashboard() {
  const [view, setView] = useState<View>("classes");
  const [query, setQuery] = useState("");
  const rooms = demoRooms.filter((room) =>
    `${room.name} ${room.teacher} ${room.group}`.includes(query),
  );
  const title = navigation.find((item) => item.id === view)!.label;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="همیار، صفحه اصلی">
          <span className="brand-mark">
            <AudioLines size={27} />
          </span>
          <strong>همیار</strong>
        </Link>
        <div className="workspace-label">
          <GraduationCap size={21} />
          <span>مدرسهٔ آینده</span>
        </div>
        <nav className="main-nav" aria-label="منوی اصلی">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setView(id);
                setQuery("");
              }}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <span className="avatar">نم</span>
            <div>
              <strong>نیلوفر موسوی</strong>
              <span>مدیر مجموعه · نمونه</span>
            </div>
          </div>
          <details className="demo-details">
            <summary>
              <CircleHelp size={18} /> دربارهٔ نسخهٔ نمایشی
            </summary>
            <p>
              اطلاعات این محیط نمونه است. در اتاق، تخته و چت فقط در مرورگر شما
              کار می‌کنند. تماس زنده و ضبط هنوز فعال نیستند.
            </p>
          </details>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            مدرسهٔ آینده <ChevronLeft size={17} />
            <span>{title}</span>
          </div>
          <div className="topbar-actions">
            <span className="demo-label">نسخهٔ نمایشی</span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="dashboard-main">
          <div className="page-heading">
            <div>
              <h1>{view === "classes" ? "کلاس‌های شما" : title}</h1>
              <p className="muted">
                {view === "classes"
                  ? "کلاس مورد نظر را انتخاب کنید و وارد شوید."
                  : view === "people"
                    ? "معلم‌ها و مدیران مجموعه"
                    : view === "supervisor"
                      ? "دسترسی به تمام اتاق‌های مجموعه"
                      : "ظاهر و تنظیمات مجموعه"}
              </p>
            </div>
            {view !== "classes" && (
              <button
                className="button secondary"
                onClick={() => setView("classes")}
              >
                بازگشت به کلاس‌ها <ArrowLeft size={19} />
              </button>
            )}
          </div>

          {view === "classes" && (
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
                  <article className="room-card" key={room.id}>
                    <span className="room-symbol">
                      <BookOpen size={27} />
                    </span>
                    <div className="room-description">
                      <h3>{room.name}</h3>
                      <p>{room.group}</p>
                      <span>{room.teacher}</span>
                    </div>
                    <div className="room-meta">
                      <strong>{room.time}</strong>
                      <span>{room.duration}</span>
                    </div>
                    <Link
                      className={`button ${room.live ? "primary" : "secondary"}`}
                      href="/rooms/demo"
                    >
                      ورود به اتاق نمونه <ArrowLeft size={19} />
                    </Link>
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
                اطلاعات کلاس‌ها نمونه است. ورود، محیط نمایشی اتاق را باز می‌کند.
              </p>
            </section>
          )}

          {view === "people" && (
            <section className="panel people-panel">
              <div className="section-heading">
                <h2>اعضای مجموعه</h2>
                <span className="demo-label">
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
                افزودن و دعوت اعضا در نسخهٔ عملیاتی فعال می‌شود.
              </p>
            </section>
          )}

          {view === "supervisor" && (
            <section className="panel">
              <div className="section-heading">
                <h2>اتاق‌های مجموعه</h2>
                <ShieldCheck size={24} className="accent-text" />
              </div>
              <div className="supervisor-list">
                {demoRooms.map((room) => (
                  <article className="supervisor-room" key={room.id}>
                    <div>
                      <h3>{room.name}</h3>
                      <p className="muted">
                        {room.teacher} · {room.group}
                      </p>
                    </div>
                    <Link className="button secondary" href="/rooms/demo">
                      مشاهدهٔ اتاق <ArrowLeft size={19} />
                    </Link>
                  </article>
                ))}
              </div>
              <p className="section-note">
                این فهرست نمایشی است. کنترل افراد و دسترسی مدیریتی به سرور متصل
                نشده‌اند.
              </p>
            </section>
          )}

          {view === "settings" && (
            <section className="panel settings-panel">
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
                  <strong>نام و لوگوی مجموعه</strong>
                  <p className="muted">
                    در نسخهٔ عملیاتی قابل تنظیم خواهد بود.
                  </p>
                </div>
                <span className="person-role">به‌زودی</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>مجوزها و ضبط کلاس</strong>
                  <p className="muted">
                    در نسخهٔ عملیاتی، مدیر مجموعه این تنظیمات را مشخص می‌کند.
                  </p>
                </div>
                <ShieldCheck size={24} className="muted" />
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
