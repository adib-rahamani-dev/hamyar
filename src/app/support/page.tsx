import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "پشتیبانی | همیار" };
export default function SupportPage() {
  if (!localDemoEnabled(process.env)) redirect("/workspace");
  return <Dashboard initialView="support" />;
}
