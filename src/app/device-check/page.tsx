import { z } from "zod";
import { AccountFrame } from "@/components/account-frame";
import { DeviceCheck } from "@/components/device-check";

export const metadata = { title: "بررسی دوربین و میکروفون" };
export default async function DeviceCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const { room } = await searchParams;
  const parsed = z.uuid().safeParse(room);
  return (
    <AccountFrame>
      <DeviceCheck roomId={parsed.success ? parsed.data : undefined} />
    </AccountFrame>
  );
}
