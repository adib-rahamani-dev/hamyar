import { Dashboard } from "@/components/dashboard";
import { identityConfigured } from "@/modules/identity/config";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default function HomePage() {
  if (identityConfigured(process.env)) redirect("/workspace");
  return <Dashboard />;
}
