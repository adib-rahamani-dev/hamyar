import Link from "next/link";
import {
  ArrowDown,
  ArrowUpLeft,
  AudioLines,
  Check,
  GraduationCap,
  Headphones,
  Layers3,
  LockKeyhole,
  MessageSquare,
  Monitor,
  PenLine,
  Server,
  Users,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AppearanceToggle } from "./appearance-toggle";
import "@/app/landing.css";

const features = [
  {
    icon: PenLine,
    number: "۰۱",
    title: "فکرها را روی تخته بیاورید",
    text: "تختهٔ مشترک برای توضیح، ترسیم و همراه‌شدن؛ با امکان دریافت خروجی و مرور محتوای ذخیره‌شده.",
    className: "feature-board",
  },
  {
    icon: MessageSquare,
    number: "۰۲",
    title: "گفت‌وگو ادامه دارد",
    text: "پیام‌ها در اتاق می‌مانند. میزبان گفت‌وگو و دسترسی شرکت‌کنندگان را مدیریت می‌کند.",
    className: "feature-chat",
  },
  {
    icon: LockKeyhole,
    number: "۰۳",
    title: "اختیار کلاس، دست شماست",
    text: "دعوت محدود، قفل اتاق و اجازهٔ صحبت؛ هر مجموعه فضای مستقل خودش را دارد.",
    className: "feature-access",
  },
];

export function Landing() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        رفتن به محتوای اصلی
      </a>
      <header className="landing-header landing-container">
        <Link href="/" className="landing-brand" aria-label="همیار، صفحهٔ اصلی">
          <span className="brand-mark">
            <AudioLines size={26} />
          </span>
          <strong>
            همیار<span>کنار هم، بهتر.</span>
          </strong>
        </Link>
        <nav className="landing-nav" aria-label="راهنمای همیار">
          <a href="#experience">تجربهٔ همیار</a>
          <a href="#independent">روی زیرساخت شما</a>
          <a href="#questions">پرسش‌های رایج</a>
        </nav>
        <div className="landing-actions">
          <AppearanceToggle />
          <ThemeToggle />
          <Link className="button secondary" href="/workspace">
            ورود <ArrowUpLeft size={17} />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="landing-hero landing-container">
          <div className="hero-copy">
            <span className="landing-kicker">
              <span /> فضای کلاس و جلسهٔ شما
            </span>
            <h1>
              فاصله کمتر.
              <br />
              <span>همراهی بیشتر.</span>
            </h1>
            <p>
              یک جای آرام برای یادگرفتن، گفت‌وگو و ساختن. کلاس و جلسه‌تان را
              فارسی، ساده و روی زیرساخت انتخابی خودتان برگزار کنید.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/workspace">
                ورود به فضای شما <ArrowUpLeft size={20} />
              </Link>
              <Link className="hero-device-link" href="/device-check">
                <Headphones size={19} /> قبل از کلاس، دستگاهت را تست کن
              </Link>
            </div>
            <div className="hero-promises">
              <span>
                <Check size={16} /> فارسی و راست‌به‌چپ
              </span>
              <span>
                <Check size={16} /> فونت و دارایی‌های محلی
              </span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-grid" />
            <span className="art-caption">فضا برای ایده‌های بزرگ</span>
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-center">
              <AudioLines strokeWidth={1.1} />
              <span>
                هم‌صدا.
                <br />
                هم‌فکر. همیار.
              </span>
            </div>
            <div className="art-note note-board">
              <PenLine size={19} />
              <span>
                اینجا ایده‌ها
                <br />
                <strong>شکل می‌گیرند.</strong>
              </span>
              <svg viewBox="0 0 150 40">
                <path d="M5 28 Q30 2 50 24 T100 17 T145 13" />
              </svg>
            </div>
            <div className="art-note note-voice">
              <span className="art-dot" />
              <span>صدا، تصویر، ارتباط</span>
              <span className="art-wave">
                {[12, 24, 17, 32, 22, 14, 26].map((height, i) => (
                  <i key={i} style={{ height }} />
                ))}
              </span>
            </div>
            <div className="art-note note-chat">
              <MessageSquare size={19} />
              <span>
                هر سؤال،
                <br />
                <strong>شروع یک گفت‌وگو.</strong>
              </span>
            </div>
            <span className="art-footnote">تصویر مفهومی از فضای همیار</span>
          </div>
          <a href="#experience" className="hero-scroll">
            <ArrowDown size={17} /> آشنایی با همیار
          </a>
        </section>
        <div className="landing-audiences landing-container">
          <span>یک فضا، برای کنار هم بودن</span>
          <span>
            <GraduationCap size={21} /> مدرسه و آموزشگاه
          </span>
          <span>
            <Users size={21} /> تیم‌ها و شرکت‌ها
          </span>
          <span>
            <Monitor size={21} /> آموزش مستقل
          </span>
        </div>
        <section className="landing-section landing-container" id="experience">
          <div className="landing-section-heading">
            <div>
              <span className="landing-eyebrow">
                کمتر درگیر ابزار، بیشتر درگیر یادگیری
              </span>
              <h2>همه دور یک ایده.</h2>
            </div>
            <p>
              ابزارهای اصلی کنار هم‌اند؛
              <br />
              تا تمرکز روی آدم‌ها و محتوای جلسه بماند.
            </p>
          </div>
          <div className="landing-features">
            {features.map(({ icon: Icon, ...feature }) => (
              <article
                className={`landing-feature ${feature.className}`}
                key={feature.number}
              >
                <div className="feature-top">
                  <span className="feature-icon">
                    <Icon size={24} strokeWidth={1.5} />
                  </span>
                  <span>{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
          <p className="landing-fineprint">
            چت و تخته به‌صورت دوره‌ای همگام می‌شوند؛ مشاهدهٔ تغییرات ممکن است تا
            حدود ۸ ثانیه زمان ببرد.
          </p>
        </section>
        <section className="landing-container" id="independent">
          <div className="landing-independence">
            <div className="independence-visual" aria-hidden="true">
              <span>
                <Server size={30} />
              </span>
              <i />
              <span>
                <Layers3 size={30} />
              </span>
              <i />
              <span>
                <Monitor size={30} />
              </span>
            </div>
            <div>
              <span className="landing-eyebrow">زیرساخت انتخابی شما</span>
              <h2>همیار، روی زمین خودتان.</h2>
              <p>
                وب، پایگاه داده و رسانه را می‌توانید خودتان میزبانی کنید. برای
                بخش‌های اصلی، حساب اجباری در سرویس‌های ابری رسانه یا ارتباط زنده
                لازم نیست.
              </p>
              <Link href="/device-check" className="independence-link">
                از همین مرورگر شروع کنید <ArrowUpLeft size={18} />
              </Link>
            </div>
          </div>
        </section>
        <section
          className="landing-section landing-container landing-faq"
          id="questions"
        >
          <div>
            <span className="landing-eyebrow">پیش از شروع</span>
            <h2>چند سؤال خوب.</h2>
            <p>
              شفاف دربارهٔ چیزی که امروز
              <br />
              می‌توانید از همیار انتظار داشته باشید.
            </p>
          </div>
          <div className="landing-questions">
            <details>
              <summary>برای ورود به کلاس از کجا شروع کنم؟</summary>
              <p>
                اگر میزبان برایتان لینک دعوت فرستاده، همان لینک را باز کنید و
                وارد حساب شوید. برای ساخت یا مدیریت اتاق، از «ورود به فضای شما»
                مجموعهٔ خود را انتخاب کنید.
              </p>
            </details>
            <details>
              <summary>دوربین و میکروفون خودکار روشن می‌شوند؟</summary>
              <p>
                خیر. دسترسی تنها با انتخاب خودتان درخواست می‌شود. در صفحهٔ تست
                دستگاه، صدا و تصویر فقط روی همان دستگاه بررسی می‌شوند؛ چیزی ضبط
                یا ارسال نمی‌شود.
              </p>
            </details>
            <details>
              <summary>برای صوت و تصویر چه چیزی لازم است؟</summary>
              <p>
                مدیر زیرساخت باید سرور رسانه و در صورت نیاز TURN را تنظیم کند.
                تست دستگاه فقط آمادگی دستگاه شما را بررسی می‌کند و سلامت تماس یا
                شبکه را تضمین نمی‌کند.
              </p>
            </details>
            <details>
              <summary>ضبط جلسه و نسخهٔ کامل مدرسه آماده‌اند؟</summary>
              <p>
                هنوز خیر. ضبط سروری، مدیریت کامل دوره و شهریه و ظرفیت‌سنجی تجاری
                در برنامهٔ توسعه‌اند. نسخهٔ فعلی برای ارزیابی و استفادهٔ آزمایشی
                است؛ ظرفیت یا سطح خدمت تضمین‌شده ارائه نمی‌کند.
              </p>
            </details>
          </div>
        </section>
        <section className="landing-container">
          <div className="landing-final">
            <AudioLines size={36} strokeWidth={1.4} />
            <h2>
              برای یک گفت‌وگوی خوب،
              <br />
              جای خوبی انتخاب کنید.
            </h2>
            <Link className="button primary" href="/workspace">
              رفتن به فضای شما <ArrowUpLeft size={19} />
            </Link>
            <span>پیش از ورود، دوربین و میکروفون خاموش‌اند.</span>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <Link className="landing-brand" href="/">
          <AudioLines size={23} />
          <strong>همیار</strong>
        </Link>
        <span>فارسی ساخته شده، برای کنار هم بودن.</span>
        <Link href="/device-check">
          بررسی دستگاه <ArrowUpLeft size={15} />
        </Link>
      </footer>
    </div>
  );
}
