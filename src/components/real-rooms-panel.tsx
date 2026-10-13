"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Video, Plus } from "lucide-react";
type Room = {
  id: string;
  title: string;
  state: "scheduled" | "open" | "ended";
  locked: boolean;
};
type Member = { id: string; name: string; status: string };
const states = {
  scheduled: "آمادهٔ برنامه‌ریزی",
  open: "باز",
  ended: "پایان‌یافته",
};
export function RealRoomsPanel({
  organizationId,
  manager,
  members,
}: {
  organizationId: string;
  manager: boolean;
  members: Member[];
}) {
  const [rooms, setRooms] = useState<Room[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/workspace/rooms", {
      cache: "no-store",
      signal,
    });
    if (!response.ok)
      throw Error("دریافت اتاق‌ها انجام نشد؛ دسترسی و اتصال را بررسی کنید.");
    const data: Room[] = await response.json();
    if (!signal?.aborted) setRooms(data);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .catch(() => {
        if (!controller.signal.aborted) setNotice("دریافت اتاق‌ها انجام نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [organizationId, load]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      const hostMembershipId = String(data.get("host") ?? "");
      const response = await fetch("/api/workspace/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(data.get("title")),
          ...(hostMembershipId ? { hostMembershipId } : {}),
        }),
      });
      if (!response.ok)
        throw Error(
          "ساخت اتاق انجام نشد؛ میزبان باید عضو فعال همین مجموعه باشد.",
        );
      await load();
      form.reset();
      setNotice("اتاق در مجموعه ثبت شد.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "درخواست انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-panel">
      <div className="section-heading">
        <h2>اتاق‌های مجموعه</h2>
        <Video size={24} className="accent-text" />
      </div>
      <p className="section-note">
        اتاق‌های همین مجموعه را مدیریت کنید. اتصال رسانه هنوز فعال نشده است؛
        امکان ورود تا تکمیل سرویس رسانه ارائه نمی‌شود.
      </p>
      {manager && (
        <form className="ticket-form" onSubmit={create}>
          <label htmlFor="room-title">نام اتاق</label>
          <input
            id="room-title"
            name="title"
            required
            minLength={2}
            maxLength={120}
            disabled={loading || busy}
          />
          <label htmlFor="room-host">میزبان اتاق</label>
          <select id="room-host" name="host" disabled={loading || busy}>
            <option value="">خودم</option>
            {members
              .filter((m) => m.status === "active")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <button className="button primary" disabled={loading || busy}>
            <Plus size={18} />
            ثبت اتاق
          </button>
        </form>
      )}
      <p role="status" className="draft-notice">
        {notice}
      </p>
      {loading ? (
        <p className="section-note">در حال دریافت اتاق‌ها…</p>
      ) : rooms.length === 0 ? (
        <p className="section-note">هنوز اتاقی برای شما ثبت نشده است.</p>
      ) : (
        <div className="people-list">
          {rooms.map((room) => (
            <article className="person-row real-room-row" key={room.id}>
              <Video size={23} />
              <div>
                <strong>{room.title}</strong>
                <span>{states[room.state]}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
