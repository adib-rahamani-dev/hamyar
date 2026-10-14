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
    <AccountFrame>
      <div className="real-workspace">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{snapshot.organization.name}</span>
            <h1>مرکز نظارت</h1>
            <p className="muted">اطلاعات ثبت‌شدهٔ مجموعهٔ فعال شما.</p>
          </div>
        </div>
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
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="section-note">
            باز بودن اتاق در برنامه به معنی اتصال رسانه یا حضور زنده نیست. حضور
            و ظرفیت باقی‌مانده پس از اتصال سرویس رسانه قابل نمایش خواهند بود.
          </p>
        </section>
        <section className="ops-panel">
          <h2>میزبان وب</h2>
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
          </dl>
          <p className="section-note">
            CPU و RAM فیزیکی در سرویس serverless از این درخواست قابل اندازه‌گیری
            نیستند. مصرف رسانه و ظرفیت سازمان هنوز متصل نیست.
          </p>
        </section>
      </div>
    </AccountFrame>
  );
}
