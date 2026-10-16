import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { Landing } from "@/components/landing";
export const dynamic = "force-dynamic";

export default function HomePage() {
  if (localDemoEnabled(process.env)) return <Dashboard />;
  return <Landing />;
}
