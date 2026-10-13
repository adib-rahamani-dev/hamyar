import type { Metadata } from "next";
import { ClassroomDemo } from "@/components/classroom-demo";
import { localDemoEnabled } from "@/modules/operations/local-demo";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "اتاق نمونه" };

export default function DemoRoomPage() {
  if (!localDemoEnabled(process.env)) notFound();
  return <ClassroomDemo />;
}
