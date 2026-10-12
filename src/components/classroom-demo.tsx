"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Circle,
  Hand,
  MessageSquare,
  MicOff,
  MonitorUp,
  Send,
  Sparkles,
  VideoOff,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Whiteboard } from "./whiteboard";

export function ClassroomDemo() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      author: "راهنمای همیار",
      text: "به اتاق نمونه خوش آمدید! روی تخته رسم کنید و چت محلی را امتحان کنید. پیام‌ها به کاربر دیگری ارسال نمی‌شوند.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [raised, setRaised] = useState(false);
  const [notice, setNotice] = useState(
    "این اتاق به سرور رسانه متصل نیست؛ هیچ صدا یا تصویری دریافت یا ارسال نمی‌شود.",
  );
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length > 1)
      chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  return (
    <main className="classroom">
      <header className="room-header">
        <Link className="icon-button" href="/" aria-label="بازگشت به پیشخوان">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1>ریاضی؛ یک قدم جلوتر</h1>
          <p className="muted">مدرسهٔ آینده · پایه نهم · محیط نمونه</p>
        </div>
        <div className="topbar-actions">
          <span className="pill">
            <Sparkles size={13} /> اتاق نمونه
          </span>
          <ThemeToggle />
        </div>
      </header>
      <div className="demo-notice">
        <Sparkles size={16} />
        <span>
          تخته، چت و دست‌بلندکردن در این پیش‌نمایش محلی هستند و با خروج از صفحه
          پاک می‌شوند.
        </span>
      </div>
      <div className="classroom-grid">
        <div>
          <Whiteboard />
          {raised && (
            <div className="demo-hand" role="status">
              <Hand size={17} /> در پیش‌نمایش، دست شما بالا است.
            </div>
          )}
        </div>
        <aside className="panel chat-panel">
          <div className="section-heading">
            <h2>گفت‌وگوی کلاس</h2>
            <MessageSquare size={19} className="muted" />
          </div>
          <span className="muted small-text">فقط در همین مرورگر</span>
          <div
            className="chat-messages"
            role="log"
            aria-live="polite"
            aria-label="پیام‌های محلی"
          >
            {messages.map((message) => (
              <div className="chat-message" key={message.id}>
                <strong>{message.author}</strong>
                <p>{message.text}</p>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              const text = draft.trim();
              if (!text) return;
              setMessages((current) => [
                ...current.slice(-99),
                { id: crypto.randomUUID(), author: "شما · نمونه", text },
              ]);
              setDraft("");
            }}
          >
            <input
              aria-label="متن پیام"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              placeholder="یک پیام بنویسید..."
            />
            <button
              className="icon-button"
              type="submit"
              aria-label="ارسال پیام محلی"
              disabled={!draft.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </aside>
      </div>
      <div className="room-controls">
        <button
          className="media-control"
          onClick={() =>
            setNotice(
              "میکروفون هنوز به LiveKit متصل نیست. در اتاق واقعی، ابتدا اجازهٔ دستگاه و مجوز صحبت بررسی می‌شود.",
            )
          }
        >
          <MicOff size={18} /> میکروفون
        </button>
        <button
          className="media-control"
          onClick={() =>
            setNotice(
              "دوربین در نسخهٔ پایه فعال نیست. پیش‌نمایش و انتخاب دوربین در مرحلهٔ اتصال رسانه اضافه می‌شود.",
            )
          }
        >
          <VideoOff size={18} /> دوربین
        </button>
        <button
          className="media-control"
          onClick={() =>
            setNotice(
              "اشتراک صفحه پس از اتصال اتاق واقعی و اجازهٔ مرورگر فعال می‌شود.",
            )
          }
        >
          <MonitorUp size={18} /> اشتراک صفحه
        </button>
        <button
          className={`media-control ${raised ? "active" : ""}`}
          aria-pressed={raised}
          onClick={() => setRaised(!raised)}
        >
          <Hand size={18} />
          {raised ? "پایین‌آوردن دست" : "اجازهٔ صحبت"}
        </button>
        <button
          className="media-control"
          onClick={() =>
            setNotice(
              "ضبط واقعی در این نسخه وجود ندارد. میزبان در نسخهٔ عملیاتی از LiveKit Egress برای ضبط سمت سرور استفاده خواهد کرد.",
            )
          }
        >
          <Circle size={17} /> ضبط میزبان
        </button>
        <Link className="media-control exit" href="/">
          خروج از اتاق <ArrowRight size={17} />
        </Link>
      </div>
      <p className="room-info" role="status">
        {notice}
      </p>
    </main>
  );
}
