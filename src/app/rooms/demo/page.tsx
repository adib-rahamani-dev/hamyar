import type { Metadata } from "next";
import { ClassroomDemo } from "@/components/classroom-demo";

export const metadata: Metadata = { title: "اتاق نمونه" };

export default function DemoRoomPage() {
  return <ClassroomDemo />;
}
