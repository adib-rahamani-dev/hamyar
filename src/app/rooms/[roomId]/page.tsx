import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import { getIdentity } from "@/modules/identity/runtime.server";
import { createClassroom } from "@/modules/classroom/service";
import { DomainError } from "@/modules/tenancy/service";
import { ClassroomPanel } from "@/components/classroom-panel";
import { AccountFrame } from "@/components/account-frame";
import type { ClassroomSnapshot } from "@/modules/classroom/types";
import "@/app/classroom.css";
import { identityConfigured } from "@/modules/identity/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "اتاق کلاس | همیار" };
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  if (!z.uuid().safeParse(roomId).success) notFound();
  if (!identityConfigured(process.env)) redirect("/account/sign-in");
  const runtime = getIdentity();
  await runtime.assertReady();
  const incoming = await headers();
  if (!(await runtime.auth.api.getSession({ headers: incoming })))
    redirect("/account/sign-in");
  try {
    const snapshot = await createClassroom(runtime.pool, runtime.auth).snapshot(
      incoming,
      roomId,
    );
    return (
      <ClassroomPanel
        initial={JSON.parse(JSON.stringify(snapshot)) as ClassroomSnapshot}
      />
    );
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    return (
      <AccountFrame>
        <section className="ops-panel auth-card">
          <h1>ورود به اتاق</h1>
          <p>
            اتاق در مجموعهٔ فعال شما قابل دسترس نیست. مجموعهٔ درست را انتخاب
            کنید یا لینک دعوت میزبان را باز کنید.
          </p>
          <Link href="/workspace" className="button primary">
            انتخاب مجموعه
          </Link>
        </section>
      </AccountFrame>
    );
  }
}
