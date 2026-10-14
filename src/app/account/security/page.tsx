import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountFrame } from "@/components/account-frame";
import { SecurityPanel } from "@/components/security-panel";
import { identityConfigured } from "@/modules/identity/config";
import { getIdentity } from "@/modules/identity/runtime.server";
export const dynamic = "force-dynamic";
export default async function SecurityPage() {
  if (!identityConfigured(process.env)) redirect("/account/sign-in");
  await getIdentity().assertReady();
  const current = await getIdentity().auth.api.getSession({
    headers: await headers(),
  });
  if (!current) redirect("/account/sign-in");
  return (
    <AccountFrame>
      <SecurityPanel sessionId={current.session.id} />
    </AccountFrame>
  );
}
