import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "اعضای مجموعه | همیار" };
export default function MembersPage() {
  if (!localDemoEnabled(process.env)) redirect("/workspace");
  return <Dashboard initialView="people" />;
}
