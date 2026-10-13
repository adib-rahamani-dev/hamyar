import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountFrame } from "@/components/account-frame";
import { WorkspacePanel } from "@/components/workspace-panel";
import { identityConfigured } from "@/modules/identity/config";
import { getIdentity } from "@/modules/identity/runtime.server";
export const dynamic = "force-dynamic";
export default async function WorkspacePage() {
  if (!identityConfigured(process.env))
    return (
      <AccountFrame>
        <section className="ops-panel">
          <h1>فضای واقعی مجموعه</h1>
          <p className="section-note">
            زیرساخت حساب و پایگاه داده هنوز روی این میزبان تنظیم نشده است.
          </p>
          <Link className="text-action" href="/account/sign-in">
            صفحهٔ ورود و وضعیت راه‌اندازی
          </Link>
        </section>
      </AccountFrame>
    );
  await getIdentity().assertReady();
  const current = await getIdentity().auth.api.getSession({
    headers: await headers(),
  });
  if (!current) redirect("/account/sign-in");
  return (
    <AccountFrame>
      <WorkspacePanel
        name={current.user.name}
        userId={current.user.id}
        mfa={!!current.user.twoFactorEnabled && !!current.session.mfaVerifiedAt}
      />
    </AccountFrame>
  );
}
