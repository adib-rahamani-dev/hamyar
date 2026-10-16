"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
/** The capability stays in the fragment, never in server request URLs or referrers. */
export function RoomJoin({ signedIn }: { signedIn: boolean }) {
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(location.hash.slice(1));
    setToken(query.get("token") ?? "");
  }, []);
  const valid = /^[\w-]{43}$/.test(token);
  return (
    <section className="ops-panel auth-card">
      <span className="auth-symbol">
        <ShieldCheck size={30} />
      </span>
      <span className="eyebrow">دعوت به کلاس همیار</span>
      <h1>به گفت‌وگو بپیوندید</h1>
      <p className="section-note">
        این لینک اجازهٔ ورود به یک اتاق مشخص را می‌دهد. نام شما از حسابتان گرفته
        می‌شود؛ به اتاق‌های دیگر دسترسی ایجاد نمی‌کند.
      </p>
      {signedIn ? (
        <button
          className="button primary"
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            setNotice("");
            try {
              const response = await fetch("/api/workspace/room-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const data = await response.json();
              if (!response.ok) {
                setNotice(
                  data.error === "ROOM_NOT_OPEN"
                    ? "میزبان باید جلسه را شروع و قفل اتاق را باز کند."
                    : "دعوت قابل استفاده نیست؛ ممکن است منقضی، لغو یا پر شده باشد.",
                );
                return;
              }
              window.location.assign(`/rooms/${data.roomId}`);
            } catch {
              setNotice("ارتباط برقرار نشد؛ دوباره تلاش کنید.");
            } finally {
              setBusy(false);
            }
          }}
        >
          ورود به اتاق <ArrowLeft size={18} />
        </button>
      ) : (
        <div className="auth-links">
          <Link
            className="button primary"
            href={`/account/sign-in${valid ? `#room-invite=${token}` : ""}`}
          >
            ورود به حساب و ادامه
          </Link>
          <Link
            href={`/account/sign-up${valid ? `#room-invite=${token}` : ""}`}
          >
            حساب ندارم؛ ثبت‌نام
          </Link>
        </div>
      )}
      <p role="status" className="draft-notice">
        {notice}
      </p>
    </section>
  );
}
