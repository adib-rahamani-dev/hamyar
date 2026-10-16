import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getIdentity } from "@/modules/identity/runtime.server";
import { AccountFrame } from "@/components/account-frame";
import { OrganizationSettingsPanel } from "@/components/organization-settings-panel";
import { deploymentMode } from "@/modules/operations/deployment-mode";
import { identityConfigured } from "@/modules/identity/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "تنظیمات | همیار" };
export default async function SettingsPage() {
  if (localDemoEnabled(process.env))
    return <Dashboard initialView="settings" />;
  if (!identityConfigured(process.env)) redirect("/account/sign-in");
  const runtime = getIdentity();
  await runtime.assertReady();
  if (!(await runtime.auth.api.getSession({ headers: await headers() })))
    redirect("/account/sign-in");
  return (
    <AccountFrame navigation>
      <OrganizationSettingsPanel mode={deploymentMode(process.env)} />
    </AccountFrame>
  );
}
