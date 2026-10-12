"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  ChevronDown,
  Circle,
  CircleHelp,
  Hand,
  Maximize2,
  MessageSquare,
  MicOff,
  MonitorUp,
  PencilLine,
  Send,
  Users,
  VideoOff,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Whiteboard } from "./whiteboard";

type MobilePanel = "board" | "chat" | "people";

export function ClassroomDemo() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      author: "راهنمای همیار",
      text: "به اتاق نمونه خوش آمدید. می‌توانید روی تخته بنویسید و گفت‌وگوی محلی را امتحان کنید.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [raised, setRaised] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("board");
  const [peopleOpen, setPeopleOpen] = useState(true);
  const chatList = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const help = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (chatList.current)
      chatList.current.scrollTop = chatList.current.scrollHeight;
  }, [messages.length, mobilePanel]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      setNotice("نمایش تمام‌صفحه در این مرورگر در دسترس نیست.");
    }
  }

  return (
    <main className="classroom">
      <header className="room-header">
        <Link className="room-brand" href="/" aria-label="بازگشت به کلاس‌ها">
          <span className="brand-mark">
            <AudioLines size={23} />
          </span>
          <strong>همیار</strong>
        </Link>
        <span className="header-divider" />
        <div className="room-title">
          <h1>کلاس ریاضی</h1>
          <p>پایه نهم · مدرسهٔ آینده</p>
        </div>
        <div className="topbar-actions">
          <span className="demo-label">نسخهٔ نمایشی</span>
          <button
            className="icon-button"
            aria-label="راهنمای اتاق"
            title="راهنمای اتاق"
            onClick={() => help.current?.showModal()}
          >
            <CircleHelp size={21} />
          </button>
          <ThemeToggle />
        </div>
      </header>
      <nav className="mobile-room-tabs" aria-label="بخش‌های اتاق">
        {(
          [
            { id: "board", label: "تخته", icon: PencilLine },
            { id: "chat", label: "گفت‌وگو", icon: MessageSquare },
            { id: "people", label: "افراد", icon: Users },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={mobilePanel === id}
            className={mobilePanel === id ? "active" : ""}
            onClick={() => setMobilePanel(id)}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
      <div className="room-workspace" data-panel={mobilePanel}>
        <aside className="room-sidebar" aria-label="افراد و گفت‌وگوی اتاق">
          <section className="presenter-panel">
            <div className="presenter-preview">
              <span className="presenter-avatar">سا</span>
              <span>
                <VideoOff size={17} /> دوربین خاموش است
              </span>
            </div>
            <div className="presenter-caption">
              <strong>سارا احمدی</strong>
              <span>مدرس · نمونه</span>
            </div>
          </section>
          <section className="participants-panel">
            <button
              className="participants-heading"
              aria-expanded={peopleOpen}
              onClick={() => setPeopleOpen(!peopleOpen)}
            >
              <span>
                <Users size={20} /> افراد <span className="count-label">۲</span>
              </span>
              <ChevronDown
                size={18}
                className={peopleOpen ? "chevron-open" : ""}
              />
            </button>
            {peopleOpen && (
              <div className="participant-list">
                <div className="participant-row">
                  <span className="avatar">سا</span>
                  <strong>
                    سارا احمدی <small>مدرس · نمونه</small>
                  </strong>
                  <MicOff size={18} className="muted" />
                </div>
                <div className="participant-row">
                  <span className="avatar you">ش</span>
                  <strong>
                    شما <small>مهمان · نمونه</small>
                  </strong>
                  {raised ? (
                    <Hand size={18} className="accent-text" />
                  ) : (
                    <MicOff size={18} className="muted" />
                  )}
                </div>
              </div>
            )}
          </section>
          <section className="chat-panel">
            <div className="chat-heading">
              <MessageSquare size={20} />
              <h2>گفت‌وگو</h2>
              <span>محلی</span>
            </div>
            <div
              ref={chatList}
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
            </div>
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                const text = draft.trim();
                if (!text) return;
                setMessages((current) => [
                  ...current.slice(-99),
                  { id: crypto.randomUUID(), author: "شما", text },
                ]);
                setDraft("");
              }}
            >
              <input
                aria-label="متن پیام"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1000}
                placeholder="پیام خود را بنویسید…"
              />
              <button
                className="icon-button"
                type="submit"
                aria-label="ارسال پیام محلی"
                disabled={!draft.trim()}
              >
                <Send size={20} />
              </button>
            </form>
          </section>
        </aside>
        <section ref={stage} className="room-stage" aria-label="فضای ارائه">
          <div className="stage-heading">
            <div>
              <PencilLine size={21} />
              <h2>تختهٔ کلاس</h2>
            </div>
            <button
              className="icon-button"
              title="نمایش تمام‌صفحه"
              aria-label="نمایش تمام‌صفحه"
              onClick={toggleFullscreen}
            >
              <Maximize2 size={19} />
            </button>
          </div>
          <Whiteboard />
          <div className="stage-footer">
            <span>تختهٔ شخصی · فقط در این مرورگر</span>
            {raised && (
              <span className="raised-label">
                <Hand size={17} /> دست شما بالا است
              </span>
            )}
          </div>
        </section>
      </div>
      <footer className="room-bottom">
        <span className="room-local-status">
          اتاق نمونه <span>صدا و تصویر متصل نیست</span>
        </span>
        <div className="room-controls" aria-label="کنترل‌های کلاس">
          <button
            className="media-control"
            onClick={() => setNotice("میکروفون در نسخهٔ نمایشی فعال نیست.")}
          >
            <MicOff size={23} />
            <span>میکروفون</span>
          </button>
          <button
            className="media-control"
            onClick={() => setNotice("دوربین در نسخهٔ نمایشی فعال نیست.")}
          >
            <VideoOff size={23} />
            <span>دوربین</span>
          </button>
          <button
            className="media-control"
            onClick={() => setNotice("اشتراک صفحه در نسخهٔ نمایشی فعال نیست.")}
          >
            <MonitorUp size={23} />
            <span>اشتراک صفحه</span>
          </button>
          <span className="controls-divider" />
          <button
            className={`media-control ${raised ? "active" : ""}`}
            aria-pressed={raised}
            aria-label={raised ? "پایین‌آوردن دست" : "اجازهٔ صحبت"}
            onClick={() => setRaised(!raised)}
          >
            <Hand size={23} />
            <span>{raised ? "دست پایین" : "اجازهٔ صحبت"}</span>
          </button>
          <button
            className="media-control"
            aria-label="ضبط میزبان"
            onClick={() => setNotice("ضبط واقعی در این نسخه وجود ندارد.")}
          >
            <Circle size={22} />
            <span>ضبط کلاس</span>
          </button>
        </div>
        <Link className="exit-button" href="/">
          <ArrowRight size={20} />
          <span>خروج</span>
        </Link>
      </footer>
      {notice && (
        <div className="room-toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="بستن پیام"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <dialog ref={help} className="help-dialog">
        <div className="section-heading">
          <h2>دربارهٔ اتاق نمونه</h2>
          <button
            className="icon-button"
            aria-label="بستن راهنما"
            onClick={() => help.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        <p>
          تخته، گفت‌وگو و دست‌بلندکردن را می‌توانید امتحان کنید. این کارها فقط
          در مرورگر شما انجام می‌شوند و با خروج از صفحه پاک می‌شوند.
        </p>
        <p>تماس زنده، دوربین، اشتراک صفحه و ضبط هنوز فعال نیستند.</p>
        <form method="dialog">
          <button className="button primary full">متوجه شدم</button>
        </form>
      </dialog>
    </main>
  );
}
