"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpLeft,
  AudioLines,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  MonitorPlay,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { demoPeople, demoRooms, faNumber } from "@/lib/demo-data";

type View = "overview" | "classes" | "people" | "supervisor" | "settings";
const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "پیشخوان", icon: LayoutDashboard },
  { id: "classes", label: "کلاس‌ها و اتاق‌ها", icon: Video },
  { id: "people", label: "اعضای مجموعه", icon: Users },
  { id: "supervisor", label: "مرکز نظارت", icon: ShieldCheck },
  { id: "settings", label: "تنظیمات و ظاهر", icon: Settings2 },
];

export function Dashboard() {
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);
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
            <AudioLines size={27} strokeWidth={2.3} />
          </span>
          <span>
            همیار<small>فضای یادگیری شما</small>
          </span>
        </Link>
        <div className="organization-card">
          <span className="organization-icon">
            <GraduationCap size={23} />
          </span>
          <div>
            <strong>مدرسهٔ آینده</strong>
            <small>فضای کاری نمونه</small>
          </div>
          <span className="tiny-badge">مدرسه</span>
        </div>
        <div className="nav-label">فضای کاری</div>
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
              <Icon size={20} />
              <span>{label}</span>
              {id === "supervisor" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={21} />
          <strong>یک کلاس، هزار امکان</strong>
          <p>
            آموزش، تعامل و همکاری؛
            <br />
            همه در یک فضای مشترک.
          </p>
          <Link href="/rooms/demo">
            کشف اتاق نمونه <ArrowUpLeft size={16} />
          </Link>
        </div>
        <button
          className="help-button"
          onClick={() => setHelp(!help)}
          aria-expanded={help}
        >
          <CircleHelp size={19} /> راهنمای نسخهٔ اولیه
        </button>
        <div className="sidebar-profile">
          <span className="avatar">نم</span>
          <div>
            <strong>نیلوفر موسوی</strong>
            <small>مدیر مجموعه · نمونه</small>
          </div>
          <ShieldCheck size={17} />
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            فضای کاری <ChevronLeft size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-label">
              <span /> نسخهٔ پایه
            </span>
            <ThemeToggle />
            <span className="avatar small">نم</span>
          </div>
        </header>
        <main id="main-content" className="dashboard-main">
          <div className="demo-notice">
            <Sparkles size={16} />
            <span>
              این محیط یک دموی تعاملی با اطلاعات نمونه است. اتصال زنده و ذخیرهٔ
              اطلاعات در مراحل بعد اضافه می‌شوند.
            </span>
          </div>
          {help && (
            <div className="help-panel" role="status">
              <strong>از اینجا شروع کنید</strong>
              <p>
                تم را تغییر دهید، اتاق‌ها و اعضا را ببینید و وارد اتاق نمونه
                شوید. تخته و چت اتاق فقط در همان مرورگر کار می‌کنند. دوربین، ضبط
                و اشتراک صفحه هنوز متصل نیستند.
              </p>
              <button className="text-button" onClick={() => setHelp(false)}>
                بستن راهنما
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">اینجا، یادگیری جریان دارد</p>
              <h1>
                {view === "overview"
                  ? "روزهای خوب، از یک کلاس شروع می‌شوند."
                  : title}
              </h1>
              <p className="muted">
                {view === "overview"
                  ? "کلاس‌ها، آدم‌ها و لحظه‌های یادگیری را از همین‌جا همراهی کنید."
                  : "محیط نمونهٔ مدرسهٔ آینده؛ پایه‌ای برای تجربهٔ نهایی همیار."}
              </p>
            </div>
            <Link className="button primary" href="/rooms/demo">
              <Video size={18} /> تجربهٔ اتاق نمونه <ArrowUpLeft size={17} />
            </Link>
          </div>

          {view === "overview" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="اتاق‌های مجموعه"
                  value={faNumber(demoRooms.length)}
                  caption="برای هر درس، یک فضای اختصاصی"
                  icon={Video}
                  color="green"
                />
                <Stat
                  label="اعضای نمونه"
                  value={faNumber(demoPeople.length)}
                  caption="معلم‌ها و مدیران همراه شما"
                  icon={Users}
                  color="purple"
                />
                <Stat
                  label="ظرفیت کلاس‌ها"
                  value={faNumber(
                    demoRooms.reduce((sum, room) => sum + room.members, 0),
                  )}
                  caption="مجموع ظرفیت تعریف‌شدهٔ نمونه"
                  icon={GraduationCap}
                  color="amber"
                />
                <Stat
                  label="اتاق نمونهٔ فعال"
                  value="۱"
                  caption="پیش‌نمایش محیط کلاس"
                  icon={Radio}
                  color="blue"
                />
              </div>
              <div className="overview-grid">
                <section className="hero-card">
                  <div className="hero-content">
                    <span className="pill">
                      <span className="status-dot" /> آمادهٔ تجربه
                    </span>
                    <h2>
                      فاصله کمتر.
                      <br />
                      یادگیری بیشتر.
                    </h2>
                    <p>
                      یک تختهٔ مشترک، یک گفت‌وگوی خوب
                      <br />و فضایی که برای کلاس شما ساخته می‌شود.
                    </p>
                    <Link className="button primary" href="/rooms/demo">
                      بریم سر کلاس <ArrowUpLeft size={18} />
                    </Link>
                    <div className="hero-footer">
                      <span className="stack-avatar">سا</span>
                      <span className="stack-avatar second">عر</span>
                      <span className="stack-avatar third">مک</span>
                      <span>برای همهٔ همراهان کلاس</span>
                    </div>
                  </div>
                  <div className="hero-visual" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="visual-tile main-tile">
                      <BookOpen size={57} strokeWidth={1.4} />
                      <span>هر روز، یک کشف تازه</span>
                    </div>
                    <div className="visual-tile audio-tile">
                      <AudioLines size={33} />
                    </div>
                    <div className="visual-tile sparkle-tile">
                      <Sparkles size={26} />
                    </div>
                    <span className="visual-dot dot-one" />
                    <span className="visual-dot dot-two" />
                  </div>
                </section>
                <section className="panel schedule-panel">
                  <div className="section-heading">
                    <h2>برنامهٔ نمونه</h2>
                    <CalendarDays size={20} className="muted" />
                  </div>
                  <p className="muted small-text">یک نگاه به مسیر یادگیری</p>
                  <div className="schedule-list">
                    {demoRooms.map((room, index) => (
                      <div className="schedule-item" key={room.id}>
                        <div className="schedule-time">
                          {room.time}
                          <span>
                            {index === 0 ? "اتاق نمونه" : "برنامه‌ریزی‌شده"}
                          </span>
                        </div>
                        <div className={`timeline-dot ${room.color}`} />
                        <div>
                          <strong>{room.name}</strong>
                          <small>
                            {room.teacher} · {room.duration}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-button schedule-link"
                    onClick={() => setView("classes")}
                  >
                    مشاهدهٔ همهٔ کلاس‌ها <ChevronLeft size={16} />
                  </button>
                </section>
              </div>
            </>
          )}

          {(view === "overview" || view === "classes") && (
            <section className="rooms-section">
              <div className="section-heading">
                <div>
                  <h2>
                    کلاس‌ها و اتاق‌ها{" "}
                    <span className="count-label">
                      {faNumber(demoRooms.length)}
                    </span>
                  </h2>
                  <p className="muted small-text">
                    فضاهای کوچک برای اتفاق‌های بزرگ
                  </p>
                </div>
                <label className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="جست‌وجوی کلاس"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جست‌وجوی کلاس یا معلم..."
                  />
                </label>
              </div>
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <article className="room-card" key={room.id}>
                    <div className={`room-cover ${room.color}`}>
                      <div className="cover-pattern" />
                      <span className="cover-icon">
                        <BookOpen size={29} />
                      </span>
                      <span className={`pill ${room.live ? "live" : ""}`}>
                        {room.live && <span className="status-dot" />}
                        {room.live ? "اتاق تعاملی نمونه" : "برنامهٔ نمونه"}
                      </span>
                      <span className="cover-topic">{room.topic}</span>
                    </div>
                    <div className="room-card-body">
                      <p className="eyebrow">{room.group}</p>
                      <h3>{room.name}</h3>
                      <div className="room-teacher">
                        <span className={`avatar small ${room.color}`}>
                          {room.initials}
                        </span>
                        <span>{room.teacher}</span>
                        <span className="role-label">میزبان</span>
                      </div>
                      <div className="room-meta">
                        <span>
                          <Users size={15} />
                          {faNumber(room.members)} نفر
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {room.time}
                        </span>
                      </div>
                      <Link
                        className={`button full ${room.live ? "primary" : "secondary"}`}
                        href="/rooms/demo"
                      >
                        مشاهدهٔ محیط نمونه <ArrowUpLeft size={17} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              {rooms.length === 0 && (
                <div className="empty-state">
                  <Search size={27} />
                  <h3>کلاسی با این عبارت پیدا نشد.</h3>
                  <button className="text-button" onClick={() => setQuery("")}>
                    پاک‌کردن جست‌وجو
                  </button>
                </div>
              )}
            </section>
          )}

          {view === "people" && (
            <section className="panel people-panel">
              <div className="section-heading">
                <h2>همراهان مجموعه</h2>
                <span className="tiny-badge">اطلاعات نمونه</span>
              </div>
              <div className="people-list">
                {demoPeople.map((person) => (
                  <div className="person-row" key={person.name}>
                    <span className={`avatar ${person.color}`}>
                      {person.initials}
                    </span>
                    <div>
                      <strong>{person.name}</strong>
                      <small>{person.group}</small>
                    </div>
                    <span className="pill">{person.role}</span>
                  </div>
                ))}
              </div>
              <p className="muted">
                دعوت عضو، ثبت دانش‌آموز و تخصیص نقش پس از اتصال حساب و پایگاه
                داده فعال می‌شوند.
              </p>
            </section>
          )}

          {view === "supervisor" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>یک نگاه به همهٔ اتاق‌ها</h2>
                  <p className="muted">
                    نظارت در محدودهٔ سازمان، با ثبت اقدامات مدیریتی.
                  </p>
                </div>
                <ShieldCheck className="accent-text" size={29} />
              </div>
              <div className="supervisor-grid">
                {demoRooms.map((room) => (
                  <div className="supervisor-room" key={room.id}>
                    <div className="section-heading">
                      <span
                        className={`status-dot ${room.live ? "" : "idle"}`}
                      />
                      <span className="muted small-text">
                        {room.live ? "نمونهٔ قابل مشاهده" : "برنامهٔ نمونه"}
                      </span>
                    </div>
                    <h3>{room.name}</h3>
                    <p className="muted">
                      {room.teacher} · {room.group}
                    </p>
                    <Link className="button secondary full" href="/rooms/demo">
                      <MonitorPlay size={17} /> ورود به اتاق نمونه
                    </Link>
                  </div>
                ))}
              </div>
              <div className="inline-note">
                <ShieldCheck size={18} />
                <span>
                  کنترل رسانه و اقدامات مدیریتی واقعی پس از اتصال سرور فعال
                  می‌شوند. روشن‌کردن دستگاه افراد نیاز به رضایت خودشان دارد.
                </span>
              </div>
            </section>
          )}

          {view === "settings" && (
            <section className="panel settings-panel">
              <div className="section-heading">
                <h2>ظاهر آشنا، تجربهٔ شخصی</h2>
                <Settings2 size={23} />
              </div>
              <div className="setting-row">
                <div>
                  <strong>تم محیط</strong>
                  <p className="muted">
                    روشن یا تیره؛ انتخاب شما در این مرورگر ذخیره می‌شود.
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <div className="setting-row">
                <div>
                  <strong>رنگ هویت همیار</strong>
                  <p className="muted">سبز زمردی، با سطوح آرام و خوانا.</p>
                </div>
                <div className="color-swatches">
                  <span />
                  <span />
                  <span />
                  <Check size={16} />
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>هویت مجموعه</strong>
                  <p className="muted">
                    لوگو، نام و رنگ برند پس از اتصال سازمان قابل تنظیم می‌شوند.
                  </p>
                </div>
                <span className="tiny-badge">در نقشهٔ توسعه</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>حریم خصوصی و ضبط</strong>
                  <p className="muted">
                    مجوز میزبان، اطلاع به اعضا و دورهٔ نگهداری سازمانی.
                  </p>
                </div>
                <ShieldCheck size={22} className="accent-text" />
              </div>
            </section>
          )}

          <footer className="dashboard-footer">
            <span>همیار؛ کنار هم، یک قدم جلوتر.</span>
            <span>پایهٔ محصول · نسخهٔ ۰.۱</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={20} />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <p>{caption}</p>
    </article>
  );
}
