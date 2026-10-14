"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Copy,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { authClient } from "@/modules/identity/client";
import { RealRoomsPanel } from "./real-rooms-panel";

type Organization = { id: string; name: string; kind: string; role: string };
type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
};
type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};
type Directory = {
  activeOrganizationId: string | null;
  organizations: Organization[];
};
const messages: Record<string, string> = {
  MEMBERSHIP_REVOKED: "عضویت فعال در این مجموعه ندارید.",
  NOT_FOUND: "این مورد در مجموعهٔ فعال پیدا نشد.",
  OWNER_REQUIRED: "این تغییر فقط برای مالک مجموعه مجاز است.",
  PROTECTED_MEMBERSHIP: "عضویت مالک و عضویت خودتان از این مسیر تغییر نمی‌کند.",
  INVITATION_INVALID: "دعوت معتبر نیست؛ ممکن است مصرف، لغو یا منقضی شده باشد.",
  SIGN_IN_REQUIRED: "نشست شما پایان یافته است. دوباره وارد شوید.",
  REQUEST_FAILED: "درخواست انجام نشد. دوباره تلاش کنید.",
};
const roles: Record<string, string> = {
  owner: "مالک",
  admin: "مدیر",
  supervisor: "سوپروایزر",
  member: "عضو",
};
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/workspace/${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      messages[data.error] ??
        "درخواست انجام نشد؛ اتصال و دسترسی را بررسی کنید.",
    );
  return data;
}
export function WorkspacePanel({
  name,
  userId,
}: {
  name: string;
  userId: string;
}) {
  const [directory, setDirectory] = useState<Directory>({
    activeOrganizationId: null,
    organizations: [],
  });
  const [members, setMembers] = useState<Member[]>([]),
    [invitations, setInvitations] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const active = directory.organizations.find(
    (o) => o.id === directory.activeOrganizationId,
  );
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<Directory>("organizations");
      setDirectory(result);
      const current = result.organizations.find(
        (o) => o.id === result.activeOrganizationId,
      );
      if (current && current.role !== "member") {
        const [people, invites] = await Promise.all([
          api<Member[]>("members"),
          api<Invite[]>("invitations"),
        ]);
        setMembers(people);
        setInvitations(invites);
      } else {
        setMembers([]);
        setInvitations([]);
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "دریافت اطلاعات ناموفق بود.",
      );
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function action(run: () => Promise<void>) {
    if (busy || loading) return;
    setBusy(true);
    setNotice("");
    setInviteLink("");
    try {
      await run();
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "درخواست ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    await action(async () => {
      await api("organizations", "POST", {
        name: data.get("name"),
        kind: data.get("kind"),
      });
      form.reset();
      setNotice("مجموعه ایجاد شد؛ شما مالک این مجموعه هستید.");
    });
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    await action(async () => {
      const result = await api<{ token: string }>("invitations", "POST", {
        email: data.get("email"),
        role: data.get("role"),
      });
      setInviteLink(
        `${window.location.origin}/workspace/invite#token=${result.token}`,
      );
      form.reset();
      setNotice(
        "دعوت ۴۸ساعته ساخته شد. ارسال خودکار ایمیل دعوت فعال نیست؛ لینک را به فرد دعوت‌شده برسانید.",
      );
    });
  }
  return (
    <div className="real-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">حساب شما · {name}</span>
          <h1>مجموعه‌های شما</h1>
          <p className="muted">
            دادهٔ پایدار؛ هر مجموعه با اعضا و دسترسی مستقل.
          </p>
        </div>
        <div className="account-actions">
          {active && active.role !== "member" && (
            <Link href="/supervisor" className="button secondary">
              مرکز نظارت
            </Link>
          )}
          <Link href="/account/security" className="button secondary">
            <ShieldCheck size={18} /> امنیت حساب
          </Link>
          <button
            className="icon-button"
            aria-label="خروج از حساب"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/account/sign-in");
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
      <p role="status" className="draft-notice">
        {loading ? "در حال دریافت مجموعه‌ها…" : notice}
      </p>
      <div className="operations-grid">
        <section className="ops-panel">
          <div className="section-heading">
            <h2>مجموعهٔ فعال</h2>
            <Building2 size={24} className="accent-text" />
          </div>
          {directory.organizations.length ? (
            <>
              <label htmlFor="active-organization">انتخاب مجموعه</label>
              <select
                id="active-organization"
                className="workspace-select"
                value={directory.activeOrganizationId ?? ""}
                disabled={busy || loading}
                onChange={(e) =>
                  void action(async () => {
                    await api(`switch/${e.target.value}`, "POST", {});
                  })
                }
              >
                <option value="" disabled>
                  یک مجموعه انتخاب کنید
                </option>
                {directory.organizations.map((o) => (
                  <option value={o.id} key={o.id}>
                    {o.name} · {roles[o.role]}
                  </option>
                ))}
              </select>
              <p className="section-note">
                {active
                  ? `نقش شما: ${roles[active.role]}`
                  : "هنوز مجموعه‌ای فعال نشده است."}
              </p>
            </>
          ) : (
            !loading && (
              <div className="quota-empty">
                <Building2 size={31} />
                <strong>هنوز عضو مجموعه‌ای نیستید.</strong>
                <p>مجموعه بسازید یا دعوت معتبر را بپذیرید.</p>
              </div>
            )
          )}
          <p className="section-note">
            اعضا و اتاق‌ها در همین مجموعه نگهداری می‌شوند. مدل تحصیلی و اتصال
            رسانه هنوز در حال تکمیل‌اند.
          </p>
        </section>
        <section className="ops-panel">
          <div className="section-heading">
            <h2>ساخت مجموعه</h2>
            <Plus size={23} className="accent-text" />
          </div>
          <form className="ticket-form" onSubmit={create}>
            <label htmlFor="organization-name">نام مجموعه</label>
            <input
              id="organization-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
            />
            <label htmlFor="organization-kind">نوع مجموعه</label>
            <select id="organization-kind" name="kind">
              <option value="school">مدرسه</option>
              <option value="company">شرکت</option>
              <option value="personal">شخصی</option>
            </select>
            <button className="button primary" disabled={busy || loading}>
              ایجاد مجموعه <Plus size={18} />
            </button>
          </form>
        </section>
      </div>
      {active && (
        <RealRoomsPanel
          key={active.id}
          organizationId={active.id}
          manager={active.role !== "member"}
          members={members}
        />
      )}
      {active && active.role !== "member" && (
        <>
          <section className="ops-panel">
            <div className="section-heading">
              <h2>اعضای {active.name}</h2>
              <Users size={24} className="accent-text" />
            </div>
            <div className="people-list">
              {members.map((person) => (
                <div className="person-row real-person" key={person.id}>
                  <span className="avatar">{person.name.slice(0, 1)}</span>
                  <div>
                    <strong>{person.name}</strong>
                    <span>
                      <bdi>{person.email}</bdi>
                    </span>
                  </div>
                  <span className="soft-badge">
                    {roles[person.role]} ·{" "}
                    {person.status === "active" ? "فعال" : "تعلیق‌شده"}
                  </span>
                  {person.role !== "owner" && person.userId !== userId && (
                    <select
                      className="role-select"
                      aria-label={`نقش ${person.name}`}
                      value={person.role}
                      disabled={busy || loading}
                      onChange={(event) =>
                        void action(async () => {
                          const nextRole = event.target.value;
                          if (!window.confirm(`نقش ${person.name} تغییر کند؟`))
                            return;
                          await api(`members/${person.id}`, "PATCH", {
                            role: nextRole,
                            status: person.status,
                          });
                          setNotice(
                            "نقش عضو تغییر کرد؛ دسترسی تازه در درخواست بعدی اعمال می‌شود.",
                          );
                        })
                      }
                    >
                      <option value="member">عضو</option>
                      <option value="admin">مدیر</option>
                      <option value="supervisor">سوپروایزر</option>
                    </select>
                  )}
                  {person.role !== "owner" && person.userId !== userId && (
                    <button
                      className="button secondary"
                      disabled={busy || loading}
                      onClick={() =>
                        void action(async () => {
                          if (
                            person.status === "active" &&
                            !window.confirm(`عضویت ${person.name} تعلیق شود؟`)
                          )
                            return;
                          await api(`members/${person.id}`, "PATCH", {
                            role: person.role,
                            status:
                              person.status === "active"
                                ? "suspended"
                                : "active",
                          });
                          setNotice("وضعیت عضویت تغییر کرد.");
                        })
                      }
                    >
                      {person.status === "active" ? "تعلیق" : "فعال‌کردن"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="section-note">
              نمایش تا ۱۰۰ عضو. تعلیق، دسترسی سازمانی را در درخواست بعدی قطع
              می‌کند.
            </p>
          </section>
          <section className="ops-panel">
            <h2>دعوت عضو</h2>
            <form className="ticket-form invitation-form" onSubmit={invite}>
              <div>
                <label htmlFor="invite-email">ایمیل فرد دعوت‌شده</label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  dir="ltr"
                  required
                  maxLength={254}
                />
              </div>
              <div>
                <label htmlFor="invite-role">نقش در مجموعه</label>
                <select id="invite-role" name="role">
                  <option value="member">عضو</option>
                  {active.role !== "member" && (
                    <>
                      <option value="supervisor">سوپروایزر</option>
                      <option value="admin">مدیر</option>
                    </>
                  )}
                </select>
              </div>
              <button className="button primary" disabled={busy || loading}>
                ساخت دعوت <ArrowLeft size={18} />
              </button>
            </form>
            {inviteLink && (
              <div className="invite-link">
                <label htmlFor="invite-url">
                  لینک دعوت؛ فقط برای دریافت‌کننده
                </label>
                <input id="invite-url" readOnly value={inviteLink} dir="ltr" />
                <button
                  className="icon-button"
                  aria-label="کپی لینک دعوت"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteLink);
                      setNotice("لینک کپی شد.");
                    } catch {
                      setNotice(
                        "کپی خودکار ممکن نیست؛ لینک را انتخاب و کپی کنید.",
                      );
                    }
                  }}
                >
                  <Copy size={18} />
                </button>
              </div>
            )}
            <div className="invitation-list">
              {invitations.map((i) => (
                <div className="person-row" key={i.id}>
                  <div>
                    <strong>
                      <bdi>{i.email}</bdi>
                    </strong>
                    <span>
                      {roles[i.role]} ·{" "}
                      {i.status === "accepted"
                        ? "پذیرفته‌شده"
                        : i.status === "cancelled"
                          ? "لغوشده"
                          : new Date(i.expires_at).getTime() < Date.now()
                            ? "منقضی‌شده"
                            : "منتظر پذیرش"}
                    </span>
                  </div>
                  {i.status === "pending" && (
                    <button
                      className="button secondary"
                      disabled={busy || loading}
                      onClick={() =>
                        void action(async () => {
                          if (!window.confirm("این دعوت لغو شود؟")) return;
                          await api(`cancel/${i.id}`, "POST", {});
                          setNotice("دعوت لغو شد.");
                        })
                      }
                    >
                      لغو دعوت
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
