import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "تنظیمات | همیار" };
export default function SettingsPage() {
  if (!localDemoEnabled(process.env)) redirect("/account/security");
  return <Dashboard initialView="settings" />;
}
