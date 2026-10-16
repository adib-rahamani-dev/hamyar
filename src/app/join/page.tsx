import { headers } from "next/headers";
import { AccountFrame } from "@/components/account-frame";
import { RoomJoin } from "@/components/room-join";
import { identityConfigured } from "@/modules/identity/config";
import { getIdentity } from "@/modules/identity/runtime.server";
export const dynamic = "force-dynamic";
export const metadata = { title: "دعوت به اتاق | همیار" };
export default async function JoinPage() {
  let signedIn = false;
  if (identityConfigured(process.env)) {
    const runtime = getIdentity();
    await runtime.assertReady();
    signedIn = !!(await runtime.auth.api.getSession({
      headers: await headers(),
    }));
  }
  return (
    <AccountFrame>
      <RoomJoin signedIn={signedIn} />
    </AccountFrame>
  );
}
