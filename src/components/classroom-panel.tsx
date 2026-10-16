"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  AudioLines,
  Hand,
  MessageSquare,
  Users,
  LockKeyhole,
  Unlock,
  Copy,
  Play,
  Square,
  CircleHelp,
  Share2,
} from "lucide-react";
import type { ClassroomSnapshot } from "@/modules/classroom/types";
import { SharedBoard } from "./shared-board";
import { ThemeToggle } from "./theme-toggle";
import { AppearanceToggle } from "./appearance-toggle";
import { MediaStage } from "./media-stage";
import { useHydrated } from "./use-hydrated";
const errorText: Record<string, string> = {
  ROOM_NOT_OPEN: "جلسه هنوز شروع نشده یا پایان یافته است.",
  ROOM_ACCESS_DENIED: "اجازهٔ حضور در این اتاق را ندارید.",
  MEMBERSHIP_REVOKED: "عضویت شما فعال نیست.",
  MANAGER_REQUIRED: "این کار فقط برای میزبان یا مدیر اتاق است.",
  BOARD_PERMISSION_REQUIRED: "اجازهٔ نوشتن روی تخته را از میزبان بخواهید.",
  BOARD_CHANGED: "تخته تازه تغییر کرده؛ دوباره تلاش کنید.",
  BOARD_FULL: "تخته به سقف خطوط رسیده؛ خروجی بگیرید و یک صفحهٔ تازه شروع کنید.",
  RATE_LIMITED: "چند لحظه مکث کنید و دوباره تلاش کنید.",
};
class ClassroomError extends Error {
  constructor(public code: string) {
    super(
      errorText[code] ?? "درخواست انجام نشد؛ اتصال و دسترسی را بررسی کنید.",
    );
  }
}
async function call<T>(
  roomId: string,
  command = "",
  body?: unknown,
  signal?: AbortSignal,
  snapshotCache?: { etag?: string; value?: T },
): Promise<T> {
  const response = await fetch(
    `/api/workspace/classroom/${roomId}${command ? `/${command}` : ""}`,
    {
      method: body === undefined ? "GET" : "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers:
        body === undefined
          ? snapshotCache?.etag
            ? { "If-None-Match": snapshotCache.etag }
            : undefined
          : { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
    },
  );
  if (response.status === 304 && snapshotCache?.value)
    return snapshotCache.value;
  const value = await response.json();
  if (!response.ok) throw new ClassroomError(value.error);
  if (snapshotCache) {
    snapshotCache.etag = response.headers.get("etag") ?? undefined;
    snapshotCache.value = value;
  }
  return value;
}
/** Bounded snapshots work without a hosted realtime vendor. Heartbeat presence is web presence,
 * not an assertion of media delivery. User gestures alone acquire devices; exit stops all tracks.
 */
export function ClassroomPanel({ initial }: { initial: ClassroomSnapshot }) {
  const hydrated = useHydrated();
  const pendingMessage = useRef<{ body: string; id: string } | null>(null);
  const snapshotCache = useRef<{ etag?: string; value?: ClassroomSnapshot }>({
    value: initial,
  });
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("board"),
    [sidebar, setSidebar] = useState("chat");
  const [notice, setNotice] = useState(""),
    [online, setOnline] = useState(true),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState("");
  const [links, setLinks] = useState<
    {
      id: string;
      expiresAt: string;
      uses: number;
      maxUses: number;
      revoked: boolean;
    }[]
  >([]);
  const [showHelp, setShowHelp] = useState(false);
  const [accessLost, setAccessLost] = useState(false);
  const inflight = useRef(false),
    alive = useRef(true);
  const roomId = initial.room.id;
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const next = await call<ClassroomSnapshot>(
        roomId,
        "",
        undefined,
        signal,
        snapshotCache.current,
      );
      if (alive.current && !signal?.aborted) {
        setData(next);
        setOnline(true);
      }
    },
    [roomId],
  );
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    let tick = 0;
    const poll = async () => {
      if (document.hidden || inflight.current) return;
      inflight.current = true;
      try {
        await refresh(controller.signal);
        if (++tick % 3 === 0)
          await call(roomId, "presence", {}, controller.signal);
      } catch (error) {
        if (!controller.signal.aborted && alive.current) {
          setOnline(false);
          if (
            error instanceof ClassroomError &&
            [
              "SIGN_IN_REQUIRED",
              "MEMBERSHIP_REVOKED",
              "ROOM_ACCESS_DENIED",
              "NOT_FOUND",
              "ORGANIZATION_REQUIRED",
              "EMAIL_VERIFICATION_REQUIRED",
            ].includes(error.code)
          )
            setAccessLost(true);
        }
      } finally {
        inflight.current = false;
      }
    };
    void call(roomId, "presence", {}, controller.signal).catch(() => {});
    const timer = setInterval(() => void poll(), 8000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive.current = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [roomId, refresh]);
  async function action(command: string, body: unknown) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await call(roomId, command, body);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "درخواست انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function chat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      body = String(new FormData(form).get("body"));
    if (!body.trim() || busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (!pendingMessage.current || pendingMessage.current.body !== body)
        pendingMessage.current = { body, id: crypto.randomUUID() };
      await call(roomId, "message", {
        clientId: pendingMessage.current.id,
        body,
      });
      form.reset();
      pendingMessage.current = null;
      await refresh().catch(() => {
        setOnline(false);
        setNotice("پیام ذخیره شد؛ دریافت پیام‌های تازه دوباره بررسی می‌شود.");
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ارسال انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  const open = data.room.state === "open",
    manager = data.me.manager;
  const myPresence = data.people.find((p) => p.userId === data.me.userId);
  async function makeLink() {
    setBusy(true);
    setNotice("");
    try {
      const result = await call<{ token: string }>(roomId, "links", {
        hours: 24,
        maxUses: 30,
      });
      setInvite(`${location.origin}/join#token=${result.token}`);
      setLinks(await call(roomId, "links"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "دعوت ساخته نشد.");
    } finally {
      setBusy(false);
    }
  }
  if (accessLost)
    return (
      <div className="live-classroom">
        <main className="classroom-start">
          <div>
            <h1>دسترسی این نشست به اتاق پایان یافت</h1>
            <p>وضعیت عضویت یا مجوز اتاق تغییر کرده است.</p>
            <Link href="/workspace" className="button primary">
              بازگشت به مجموعه‌ها
            </Link>
          </div>
        </main>
      </div>
    );
  return (
    <div className="live-classroom" data-tone={data.brand.tone}>
      <a className="skip-link" href="#classroom-content">
        رفتن به محتوای کلاس
      </a>
      <header className="classroom-header">
        <Link
          href="/workspace"
          className="classroom-back"
          aria-label="بازگشت به مجموعه‌ها"
        >
          <ArrowRight size={22} />
        </Link>
        <div className="classroom-title">
          <span className="classroom-brand">
            <AudioLines size={18} /> {data.brand.displayName}
          </span>
          <h1>{data.room.title}</h1>
        </div>
        <span className={`classroom-state ${open ? "is-live" : ""}`}>
          <i />
          {data.room.state === "scheduled"
            ? "آمادهٔ شروع"
            : open
              ? "جلسه باز است"
              : "جلسه پایان یافته"}
        </span>
        <div className="classroom-header-actions">
          <AppearanceToggle />
          <ThemeToggle />
          <button
            className="icon-button"
            aria-label="راهنمای اتاق"
            aria-expanded={showHelp}
            onClick={() => setShowHelp(!showHelp)}
          >
            <CircleHelp size={21} />
          </button>
        </div>
      </header>
      <div
        className="classroom-mobile-tabs"
        role="tablist"
        aria-label="بخش‌های اتاق"
      >
        {[
          ["board", "تخته"],
          ["chat", "گفت‌وگو"],
          ["people", "افراد"],
          ["media", "صوت و تصویر"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id!)}
          >
            {label}
          </button>
        ))}
      </div>
      {!online && (
        <p role="status" className="classroom-offline">
          ارتباط قطع شده؛ محتوای آخر حفظ شده و اتصال دوباره بررسی می‌شود.
        </p>
      )}
      {notice && (
        <p role="status" className="classroom-notice">
          {notice}
        </p>
      )}
      {showHelp && (
        <div className="classroom-help">
          <strong>از همین‌جا شروع کنید</strong>
          <p>
            میزبان جلسه را باز می‌کند و لینک دعوت می‌سازد. چت و تخته برای اعضای
            مجاز ذخیره می‌شوند. حضور افراد از بازبودن این صفحه محاسبه می‌شود. از
            بخش صوت و تصویر متصل شوید؛ دوربین و میکروفون تنها با اقدام خودتان و
            مجوز میزبان فعال می‌شوند.
          </p>
        </div>
      )}
      <main
        id="classroom-content"
        className="classroom-body"
        data-mobile-tab={tab}
      >
        <div className="classroom-stage">
          {data.brand.welcome && (
            <p className="classroom-welcome">{data.brand.welcome}</p>
          )}
          {!open && (
            <div className="classroom-start">
              <div>
                <strong>
                  {data.room.state === "scheduled"
                    ? "همه‌چیز از یک گفت‌وگوی خوب شروع می‌شود."
                    : "محتوای جلسه برای مرور باقی مانده است."}
                </strong>
                <p>
                  {data.room.state === "scheduled"
                    ? "با شروع جلسه، نوشتن روی تخته و گفت‌وگو فعال می‌شوند."
                    : "ارسال پیام و تغییر تخته متوقف شده‌اند؛ می‌توانید خروجی بگیرید."}
                </p>
              </div>
              {manager && data.room.state === "scheduled" && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void action("state", { state: "open" })}
                >
                  <Play size={19} /> شروع جلسه
                </button>
              )}
            </div>
          )}
          <SharedBoard
            strokes={data.board.strokes}
            revision={data.board.revision}
            editable={open && data.me.canDraw && online}
            canClear={manager}
            busy={busy}
            command={(body) => action("board", body)}
          />
        </div>
        <aside className="classroom-sidebar">
          <MediaStage
            roomId={roomId}
            open={open && online}
            canSpeak={data.me.canSpeak}
          />
          <div
            className="classroom-side-tabs"
            role="tablist"
            aria-label="پنل اتاق"
          >
            <button
              role="tab"
              aria-selected={sidebar === "chat"}
              onClick={() => setSidebar("chat")}
            >
              <MessageSquare size={17} /> گفت‌وگو
            </button>
            <button
              role="tab"
              aria-selected={sidebar === "people"}
              onClick={() => setSidebar("people")}
            >
              <Users size={17} /> افراد (
              {data.people
                .filter((p) => p.present)
                .length.toLocaleString("fa-IR")}
              )
            </button>
          </div>
          <section
            className="classroom-chat"
            hidden={sidebar !== "chat" && tab !== "chat"}
          >
            <div
              className="classroom-messages"
              aria-label="پیام‌های کلاس"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {!data.messages.length && (
                <div className="classroom-empty">
                  <MessageSquare size={30} />
                  <strong>گفت‌وگو را شروع کنید</strong>
                  <p>سؤال‌ها، نکته‌ها و پاسخ‌ها اینجا می‌مانند.</p>
                </div>
              )}
              {data.messages.map((m) => (
                <article
                  className={`classroom-message ${m.mine ? "mine" : ""}`}
                  key={m.id}
                >
                  <div>
                    <strong>{m.name}</strong>
                    <time>
                      {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p>{m.hidden ? "پیام توسط میزبان حذف شده است." : m.body}</p>
                  {manager && !m.hidden && (
                    <button
                      className="text-action"
                      aria-label={`حذف پیام ${m.name}`}
                      disabled={busy || !open}
                      onClick={() => void action("hide", { messageId: m.id })}
                    >
                      حذف
                    </button>
                  )}
                </article>
              ))}
            </div>
            <form onSubmit={chat} className="classroom-chat-form">
              <label className="sr-only" htmlFor="chat-body">
                پیام کلاس
              </label>
              <textarea
                id="chat-body"
                name="body"
                maxLength={2000}
                rows={2}
                required
                placeholder="پیام یا سؤال شما…"
                disabled={!hydrated || !open || !online || busy}
              />
              <button
                className="button primary"
                disabled={!hydrated || !open || !online || busy}
              >
                ارسال
              </button>
            </form>
          </section>
          <section
            className="classroom-people"
            hidden={sidebar !== "people" && tab !== "people"}
          >
            <p className="section-note">
              حضور در محیط اتاق؛ اتصال رسانه جداگانه است.
            </p>
            {data.people.map((person) => (
              <article className="classroom-person" key={person.membershipId}>
                <span
                  className={`presence-dot ${person.present ? "present" : ""}`}
                />
                <div>
                  <strong>
                    {person.name}{" "}
                    {person.userId === data.me.userId ? "(شما)" : ""}
                  </strong>
                  <small>
                    {person.role === "host"
                      ? "میزبان"
                      : person.role === "presenter"
                        ? "ارائه‌دهنده"
                        : "شرکت‌کننده"}
                    {person.banned ? " · دسترسی بسته" : ""}
                  </small>
                </div>
                {person.raisedHand && (
                  <Hand size={20} className="accent-text" />
                )}
                {manager &&
                  person.userId !== data.me.userId &&
                  person.role !== "host" &&
                  !person.protected && (
                    <div className="person-controls">
                      <button
                        className="text-action"
                        disabled={busy || !open || person.banned}
                        onClick={() =>
                          void action("control", {
                            membershipId: person.membershipId,
                            action: person.canSpeak ? "revoke" : "allow",
                          })
                        }
                      >
                        {person.canSpeak ? "قطع اجازه" : "اجازهٔ ۱۰ دقیقه"}
                      </button>
                      <button
                        className="text-action danger-text"
                        disabled={busy || !open || person.banned}
                        onClick={() => {
                          if (
                            window.confirm("دسترسی این فرد به اتاق بسته شود؟")
                          )
                            void action("control", {
                              membershipId: person.membershipId,
                              action: "ban",
                            });
                        }}
                      >
                        بستن دسترسی
                      </button>
                    </div>
                  )}
              </article>
            ))}
            {manager && (
              <div className="classroom-invite">
                <button
                  className="button secondary"
                  disabled={busy || data.room.state === "ended"}
                  onClick={() => void makeLink()}
                >
                  <Share2 size={17} /> ساخت لینک دعوت
                </button>
                {invite && (
                  <>
                    <label htmlFor="classroom-invite">
                      دعوت ۲۴ساعته، حداکثر ۳۰ ورود تازه
                    </label>
                    <input
                      id="classroom-invite"
                      readOnly
                      dir="ltr"
                      value={invite}
                    />
                    <button
                      className="text-action"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(invite)
                          .then(() => setNotice("لینک کپی شد."))
                          .catch(() => setNotice("لینک را از کادر کپی کنید."))
                      }
                    >
                      <Copy size={16} /> کپی لینک
                    </button>
                  </>
                )}
                {links.map((link) => (
                  <div className="room-link-row" key={link.id}>
                    <span>
                      {link.uses.toLocaleString("fa-IR")} /{" "}
                      {link.maxUses.toLocaleString("fa-IR")} ورود ·{" "}
                      {link.revoked ? "لغوشده" : "فعال"}
                    </span>
                    <button
                      className="text-action"
                      disabled={link.revoked || busy}
                      onClick={async () => {
                        await action("revoke-link", { id: link.id });
                        setLinks(await call(roomId, "links"));
                      }}
                    >
                      لغو لینک
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>
      <footer className="classroom-toolbar">
        <div className="device-controls">
          <button
            disabled={!hydrated || !open || !online || busy}
            aria-pressed={!!myPresence?.raisedHand}
            onClick={() =>
              void action("presence", { raisedHand: !myPresence?.raisedHand })
            }
          >
            <Hand size={22} />
            <span>اجازه</span>
          </button>
        </div>
        <div className="room-controls">
          {manager && open && (
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void action("state", { locked: !data.room.locked })
                }
              >
                {data.room.locked ? (
                  <Unlock size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}{" "}
                {data.room.locked ? "بازکردن اتاق" : "قفل"}
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "جلسه برای همه پایان یابد؟ این اتاق دوباره باز نمی‌شود.",
                    )
                  )
                    void action("state", { state: "ended" });
                }}
              >
                <Square size={17} /> پایان
              </button>
            </>
          )}
          <Link
            className="button secondary"
            href="/workspace"
            onClick={() => {
              void call(roomId, "presence", { leave: true }).catch(() => {});
            }}
          >
            خروج
          </Link>
        </div>
      </footer>
    </div>
  );
}
