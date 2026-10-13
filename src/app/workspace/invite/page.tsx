import { AccountFrame } from "@/components/account-frame";
import { AcceptInvite } from "@/components/accept-invite";
export const dynamic = "force-dynamic";
export default function InvitePage() {
  return (
    <AccountFrame>
      <AcceptInvite />
    </AccountFrame>
  );
}
