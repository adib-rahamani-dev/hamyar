"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
type Ticket = {
  id: string;
  title: string;
  body: string;
  status: string;
  priority: string;
  name: string;
  createdAt: string;
};
type Inbox = {
  tickets: Ticket[];
  replies: {
    id: string;
    ticketId: string;
    name: string;
    body: string;
    createdAt: string;
  }[];
  manager: boolean;
};
const statuses: Record<string, string> = {
  open: "باز",
  answered: "پاسخ داده شده",
  closed: "بسته",
};
export function TicketInbox() {
  const [inbox, setInbox] = useState<Inbox | null>(null),
    [selected, setSelected] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/workspace/tickets", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw Error();
    const value = await response.json();
    if (!signal?.aborted) setInbox(value);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setNotice("ابتدا مجموعهٔ فعال را انتخاب کنید.");
    });
    return () => controller.abort();
  }, [load]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/workspace/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          body: data.get("body"),
          priority: data.get("priority"),
        }),
      });
      if (!response.ok) throw Error();
      const value = await response.json();
      await load();
      setSelected(value.id);
      form.reset();
      setNotice("تیکت ثبت شد و شمارهٔ پیگیری دارد.");
    } catch {
      setNotice("ثبت انجام نشد؛ متن فرم حفظ شده است.");
    } finally {
      setBusy(false);
    }
  }
  async function reply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/workspace/tickets/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: data.get("body"),
          close: data.get("close") === "on",
        }),
      });
      if (!response.ok) throw Error();
      form.reset();
      await load();
      setNotice("پاسخ ذخیره شد.");
    } catch {
      setNotice("پاسخ ذخیره نشد؛ وضعیت تیکت و دسترسی را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }
  const ticket = inbox?.tickets.find((t) => t.id === selected);
  return (
    <div className="real-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">پشتیبانی مجموعه</span>
          <h1>درخواست‌ها گم نمی‌شوند</h1>
          <p className="muted">
            اعضا درخواست ثبت می‌کنند؛ مدیر همین مجموعه پاسخ می‌دهد.
          </p>
        </div>
        <Link className="button secondary" href="/workspace">
          بازگشت به مجموعه‌ها
        </Link>
      </div>
      <p className="draft-notice" role="status">
        {notice}
      </p>
      <div className="operations-grid">
        <section className="ops-panel">
          <div className="section-heading">
            <h2>تیکت تازه</h2>
            <Plus size={22} />
          </div>
          <form className="ticket-form" onSubmit={create}>
            <label htmlFor="ticket-title">موضوع</label>
            <input
              id="ticket-title"
              name="title"
              required
              minLength={3}
              maxLength={120}
              disabled={busy || !inbox}
            />
            <label htmlFor="ticket-body">شرح درخواست</label>
            <textarea
              id="ticket-body"
              name="body"
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              disabled={busy || !inbox}
            />
            <label htmlFor="ticket-priority">اولویت</label>
            <select
              id="ticket-priority"
              name="priority"
              disabled={busy || !inbox}
            >
              <option value="normal">معمولی</option>
              <option value="high">بالا</option>
            </select>
            <button className="button primary" disabled={busy || !inbox}>
              ثبت تیکت
            </button>
          </form>
        </section>
        <section className="ops-panel">
          <div className="section-heading">
            <h2>درخواست‌های ثبت‌شده</h2>
            <MessageSquare size={22} />
          </div>
          {inbox?.tickets.length === 0 && (
            <p className="section-note">هنوز تیکتی ثبت نشده است.</p>
          )}
          <div className="people-list">
            {inbox?.tickets.map((t) => (
              <button
                className="ticket-choice"
                key={t.id}
                aria-pressed={selected === t.id}
                onClick={() => setSelected(t.id)}
              >
                <strong>{t.title}</strong>
                <span>
                  {statuses[t.status]} · {t.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
      {ticket && (
        <section className="ops-panel ticket-thread">
          <span className="eyebrow">
            شمارهٔ پیگیری: <bdi>{ticket.id.slice(0, 8)}</bdi>
          </span>
          <h2>{ticket.title}</h2>
          <p className="ticket-message">{ticket.body}</p>
          {inbox?.replies
            .filter((r) => r.ticketId === ticket.id)
            .slice()
            .reverse()
            .map((r) => (
              <article className="ticket-reply" key={r.id}>
                <strong>{r.name}</strong>
                <p className="ticket-message">{r.body}</p>
                <small>{new Date(r.createdAt).toLocaleString("fa-IR")}</small>
              </article>
            ))}
          {ticket.status !== "closed" && (
            <form className="ticket-form" onSubmit={reply}>
              <label htmlFor="reply-body">پاسخ تازه</label>
              <textarea
                id="reply-body"
                name="body"
                required
                maxLength={2000}
                rows={3}
                disabled={busy}
              />
              {inbox?.manager && (
                <label className="inline-check">
                  <input type="checkbox" name="close" /> پس از پاسخ تیکت بسته
                  شود
                </label>
              )}
              <button className="button primary" disabled={busy}>
                ثبت پاسخ
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
