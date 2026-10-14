"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor } from "lucide-react";
import { authClient } from "@/modules/identity/client";
type Session = {
  id: string;
  token: string;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
};
export function SecurityPanel({ sessionId }: { sessionId: string }) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => {
    void authClient
      .listSessions()
      .then((result) => {
        if (result.data) setSessions(result.data);
        else setNotice("دریافت نشست‌ها انجام نشد.");
      })
      .catch(() => setNotice("ارتباط برای دریافت نشست‌ها برقرار نشد."));
  }, []);
  return (
    <div className="real-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">امنیت حساب</span>
          <h1>کنترل دسترسی، دست شماست</h1>
          <p className="muted">نشست‌های فعال حساب و مدیریت دستگاه‌های متصل.</p>
        </div>
        <Link className="text-action" href="/workspace">
          مجموعه‌های شما
        </Link>
      </div>
      <p className="draft-notice" role="status">
        {notice}
      </p>
      <div className="operations-grid">
        <section className="ops-panel">
          <div className="section-heading">
            <h2>نشست‌های فعال</h2>
            <Monitor size={24} className="accent-text" />
          </div>
          <p className="section-note">
            نشست ناشناس را لغو کنید. لغو نشست جاری شما را از حساب خارج می‌کند.
          </p>
          {sessions.map((item) => (
            <div className="session-row" key={item.id}>
              <div>
                <strong>
                  {item.userAgent?.slice(0, 100) ||
                    "دستگاه با مشخصات اعلام‌نشده"}
                </strong>
                <p>{new Date(item.createdAt).toLocaleString("fa-IR")}</p>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm("این نشست لغو شود؟")) return;
                  setBusy(true);
                  try {
                    const result = await authClient.revokeSession({
                      token: item.token,
                    });
                    if (result.error) {
                      setNotice("لغو نشست انجام نشد.");
                      return;
                    }
                    if (item.id === sessionId) {
                      window.location.assign("/account/sign-in");
                      return;
                    }
                    setSessions((current) =>
                      current.filter((s) => s.id !== item.id),
                    );
                    setNotice("نشست لغو شد.");
                  } catch {
                    setNotice("ارتباط برقرار نشد.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                لغو نشست
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
