import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default function HomePage() {
  if (localDemoEnabled(process.env)) return <Dashboard />;
  redirect("/workspace");
}
