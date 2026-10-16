import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { AccountFrame } from "@/components/account-frame";
import { identityConfigured } from "@/modules/identity/config";
import { getIdentity } from "@/modules/identity/runtime.server";
import { createRoomRepository } from "@/modules/rooms/repository";
import { DomainError } from "@/modules/tenancy/service";
import { publicDeploymentStatus } from "@/modules/operations/deployment-status";
import { mediaConfig } from "@/modules/media/config";
import { deploymentMode } from "@/modules/operations/deployment-mode";
import { Radio, Users, MessageSquare, Server, ArrowUpLeft } from "lucide-react";
export const dynamic = "force-dynamic";
export const metadata = { title: "مرکز نظارت | همیار" };
export default async function SupervisorPage() {
  if (localDemoEnabled(process.env))
    return <Dashboard initialView="supervisor" />;
  if (!identityConfigured(process.env)) redirect("/account/sign-in");
  const { auth, pool, assertReady } = getIdentity();
  await assertReady();
  let snapshot;
  try {
    snapshot = await createRoomRepository(pool, auth).supervision(
      await headers(),
    );
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    return (
      <AccountFrame>
        <section className="ops-panel">
          <h1>دسترسی به مرکز نظارت</h1>
          <p className="section-note">
            یک مجموعهٔ فعال انتخاب کنید و با حسابی وارد شوید که دسترسی مدیریتی
            همان مجموعه را دارد.
          </p>
          <div className="auth-links">
            <Link href="/workspace">انتخاب مجموعه</Link>
            <Link href="/account/sign-in">ورود به حساب</Link>
            <Link href="/account/security">امنیت حساب</Link>
          </div>
        </section>
      </AccountFrame>
    );
  }
  const web = publicDeploymentStatus(process.env, process.versions.node);
  const states = {
    scheduled: "آمادهٔ برنامه‌ریزی",
    open: "باز",
    ended: "پایان‌یافته",
  };
  return (
    <AccountFrame navigation>
      <div className="real-workspace">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{snapshot.organization.name}</span>
            <h1>مرکز نظارت</h1>
            <p className="muted">
              اتاق‌ها، میزبان‌ها و درخواست‌های مجموعه در یک نگاه.
            </p>
          </div>
          <Link className="button secondary" href="/supervisor">
            تازه‌سازی وضعیت
          </Link>
        </div>
        <section className="supervisor-metrics" aria-label="خلاصهٔ مجموعه">
          {[
            { icon: Users, label: "اعضای فعال", value: snapshot.members },
            {
              icon: Radio,
              label: "اتاق‌های باز در این فهرست",
              value: snapshot.rooms.filter((r) => r.state === "open").length,
            },
            {
              icon: MessageSquare,
              label: "تیکت‌های پاسخ‌پذیر",
              value: snapshot.openTickets,
            },
          ].map(({ icon: Icon, label, value }) => (
            <article className="ops-panel supervisor-metric" key={label}>
              <Icon size={24} />
              <span>{label}</span>
              <strong>{value.toLocaleString("fa-IR")}</strong>
            </article>
          ))}
        </section>
        <section className="ops-panel">
          <h2>اعضا و اتاق‌ها</h2>
          <p className="section-note">
            {new Intl.NumberFormat("fa-IR").format(snapshot.members)} عضو فعال ·
            نمایش حداکثر ۱۰۰ اتاق
          </p>
          {snapshot.rooms.length === 0 ? (
            <p className="section-note">هنوز اتاقی ثبت نشده است.</p>
          ) : (
            <div className="people-list">
              {snapshot.rooms.map((room) => (
                <article className="person-row real-room-row" key={room.id}>
                  <div>
                    <strong>{room.title}</strong>
                    <span>
                      {states[room.state]}
                      {room.locked ? " · ورود بسته" : ""}
                    </span>
                    <small>
                      میزبان: {room.hosts ?? "میزبان فعالی ثبت نشده"} ·{" "}
                      {room.present.toLocaleString("fa-IR")} حاضر در وب
                    </small>
                  </div>
                  <Link className="button secondary" href={`/rooms/${room.id}`}>
                    ورود و نظارت <ArrowUpLeft size={16} />
                  </Link>
                </article>
              ))}
            </div>
          )}
          <p className="section-note">
            حضور وب از آخرین ارتباط در ۴۵ ثانیهٔ گذشته محاسبه می‌شود و تعداد
            اتصال صوت و تصویر نیست. سقف و ظرفیت باقی‌ماندهٔ رسانه بدون
            اندازه‌گیری سرور اعلام نمی‌شوند.
          </p>
        </section>
        <section className="ops-panel">
          <div className="section-heading">
            <h2>مشخصات واقعی محیط اجرا</h2>
            <Server size={24} />
          </div>
          <dl className="host-facts">
            <div>
              <dt>ارائه‌دهنده</dt>
              <dd>{web.hosting}</dd>
            </div>
            <div>
              <dt>محیط</dt>
              <dd>{web.environment}</dd>
            </div>
            <div>
              <dt>ناحیهٔ اجرای درخواست</dt>
              <dd>{web.region ?? "از میزبان اعلام نشده"}</dd>
            </div>
            <div>
              <dt>نسخهٔ اجرا</dt>
              <dd>{web.runtime}</dd>
            </div>
            <div>
              <dt>شیوهٔ استقرار</dt>
              <dd>
                {deploymentMode(process.env) === "domestic"
                  ? "زیرساخت داخلی"
                  : "عادی"}
              </dd>
            </div>
            <div>
              <dt>تنظیمات رسانه</dt>
              <dd>
                {mediaConfig(process.env)
                  ? "تنظیم شده؛ سلامت اتصال در اتاق بررسی می‌شود"
                  : "سرور رسانه متصل نشده"}
              </dd>
            </div>
            <div>
              <dt>حافظهٔ مصرفی این فرایند وب</dt>
              <dd>
                {Math.round(
                  process.memoryUsage().rss / 1024 / 1024,
                ).toLocaleString("fa-IR")}{" "}
                MiB
              </dd>
            </div>
            <div>
              <dt>زمان نمونه‌برداری</dt>
              <dd>
                {new Date(web.sampledAt).toLocaleString("fa-IR", {
                  timeZone: "Asia/Tehran",
                })}
              </dd>
            </div>
          </dl>
          <p className="section-note">
            CPU و RAM فیزیکی در سرویس serverless از این درخواست قابل اندازه‌گیری
            نیستند. عدد حافظه تنها همین فرایند است و ظرفیت قابل فروش سرور را
            نشان نمی‌دهد.
          </p>
        </section>
      </div>
    </AccountFrame>
  );
}
