import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getIdentity } from "@/modules/identity/runtime.server";
import { AccountFrame } from "@/components/account-frame";
import { TicketInbox } from "@/components/ticket-inbox";
import { identityConfigured } from "@/modules/identity/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "پشتیبانی | همیار" };
export default async function SupportPage() {
  if (localDemoEnabled(process.env)) return <Dashboard initialView="support" />;
  if (!identityConfigured(process.env)) redirect("/account/sign-in");
  const runtime = getIdentity();
  await runtime.assertReady();
  if (!(await runtime.auth.api.getSession({ headers: await headers() })))
    redirect("/account/sign-in");
  return (
    <AccountFrame navigation>
      <TicketInbox />
    </AccountFrame>
  );
}
