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
  Mic,
  MonitorUp,
  PencilLine,
  Send,
  Users,
  VideoOff,
  Video,
  Sparkles,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Whiteboard } from "./whiteboard";
import { LocalPreview } from "./local-preview";
import { useLocalMedia } from "./use-local-media";
import { useAudioReaction, useReducedMotion } from "./use-audio-reaction";

type MobilePanel = "board" | "chat" | "people";

export function ClassroomDemo() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      author: "راهنمای همیار",
      text: "سلام! این گفت‌وگو محلی است؛ یک پیام بنویسید.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [raised, setRaised] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("board");
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [effects, setEffects] = useState(true);
  const root = useRef<HTMLElement>(null);
  const { state: media, capture } = useLocalMedia();
  const reducedMotion = useReducedMotion();
  const animate = effects && !reducedMotion;
  useAudioReaction(media.audio, animate, root);
  const chatList = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const help = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (chatList.current && messages.length > 1)
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
    <main
      ref={root}
      className="classroom"
      data-motion={animate ? "on" : "off"}
      data-audio={media.audio ? "on" : "off"}
    >
      <div className="room-atmosphere" aria-hidden="true">
        <span className="ambient-glow mint" />
        <span className="ambient-glow blue" />
        <span className="ambient-glow lilac" />
      </div>
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
            className={`icon-button effects-toggle ${effects ? "selected" : ""}`}
            aria-label={effects ? "خاموش‌کردن جلوه‌ها" : "روشن‌کردن جلوه‌ها"}
            title={effects ? "خاموش‌کردن جلوه‌ها" : "روشن‌کردن جلوه‌ها"}
            aria-pressed={effects}
            onClick={() => setEffects(!effects)}
          >
            <Sparkles size={19} />
          </button>
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
          <LocalPreview
            stream={media.video}
            audioActive={Boolean(media.audio)}
            pending={media.pending.video}
          />
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
                  ) : media.audio ? (
                    <Mic size={18} className="accent-text" />
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
          <span className="local-status-title">
            <span className="local-indicator" /> پیش‌نمایش محلی
          </span>
          <span>
            {media.audio || media.video
              ? "دستگاه روشن · بدون ارسال به دیگران"
              : "دوربین و میکروفون خاموش‌اند"}
          </span>
        </span>
        <div className="room-controls" aria-label="کنترل‌های کلاس">
          <button
            className={`media-control ${media.audio ? "active" : ""}`}
            aria-label={
              media.pending.audio
                ? "لغو درخواست میکروفون"
                : media.audio
                  ? "خاموش‌کردن میکروفون"
                  : "روشن‌کردن میکروفون"
            }
            aria-pressed={Boolean(media.audio)}
            aria-busy={media.pending.audio}
            title="بررسی میکروفون فقط در این دستگاه"
            onClick={() => {
              if (media.audio || media.pending.audio) capture.stop("audio");
              else void capture.start("audio");
            }}
          >
            {media.audio ? <Mic size={23} /> : <MicOff size={23} />}
            <span>میکروفون</span>
          </button>
          <button
            className={`media-control ${media.video ? "active" : ""}`}
            aria-label={
              media.pending.video
                ? "لغو درخواست دوربین"
                : media.video
                  ? "خاموش‌کردن دوربین"
                  : "روشن‌کردن دوربین"
            }
            aria-pressed={Boolean(media.video)}
            aria-busy={media.pending.video}
            title="پیش‌نمایش دوربین فقط در این دستگاه"
            onClick={() => {
              if (media.video || media.pending.video) capture.stop("video");
              else void capture.start("video");
            }}
          >
            {media.video ? <Video size={23} /> : <VideoOff size={23} />}
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
        <Link className="exit-button" href="/" onClick={capture.stopAll}>
          <ArrowRight size={20} />
          <span>خروج</span>
        </Link>
      </footer>
      {(notice || media.error) && (
        <div className="room-toast" role="status">
          <span>{notice || media.error}</span>
          <button
            className="icon-button"
            aria-label="بستن پیام"
            onClick={() => {
              setNotice("");
              capture.clearError();
            }}
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
        <p>
          دوربین و میکروفون با اجازهٔ شما، فقط برای پیش‌نمایش در همین دستگاه
          روشن می‌شوند. صدا ضبط یا ارسال نمی‌شود. نور زمینه با صدای میکروفون شما
          تغییر ملایمی می‌کند؛ از دکمهٔ جلوه‌ها می‌توانید آن را خاموش کنید.
        </p>
        <p>اتصال چندنفره، اشتراک صفحه و ضبط کلاس هنوز فعال نیستند.</p>
        {(media.audio ||
          media.video ||
          media.pending.audio ||
          media.pending.video) && (
          <button className="button secondary full" onClick={capture.stopAll}>
            خاموش‌کردن همهٔ دستگاه‌ها
          </button>
        )}
        <form method="dialog">
          <button className="button primary full">متوجه شدم</button>
        </form>
      </dialog>
    </main>
  );
}
