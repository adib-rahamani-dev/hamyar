import { Dashboard } from "@/components/dashboard";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default function DemoPage() {
  if (!localDemoEnabled(process.env)) notFound();
  return <Dashboard />;
}
