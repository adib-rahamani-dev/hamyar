import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "اعضای مجموعه | همیار" };
export default function MembersPage() {
  return <Dashboard initialView="people" />;
}
