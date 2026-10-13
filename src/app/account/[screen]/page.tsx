import { notFound } from "next/navigation";
import { AccountFrame } from "@/components/account-frame";
import { AuthPanel } from "@/components/auth-panel";
import {
  identityConfigured,
  emailVerificationRequired,
} from "@/modules/identity/config";
import { developmentMailboxEnabled } from "@/modules/identity/dev-mail-config";
const screens = [
  "sign-in",
  "sign-up",
  "reset",
  "new-password",
  "two-factor",
] as const;
export const dynamic = "force-dynamic";
export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { screen } = await params;
  if (!screens.includes(screen as (typeof screens)[number])) notFound();
  const query = await searchParams;
  return (
    <AccountFrame>
      <AuthPanel
        mode={screen as (typeof screens)[number]}
        token={query.token ?? ""}
        configured={identityConfigured(process.env)}
        emailVerificationRequired={emailVerificationRequired(process.env)}
        localMailbox={developmentMailboxEnabled(process.env)}
        emailConfigured={
          developmentMailboxEnabled(process.env) ||
          (!!process.env.RESEND_API_KEY && !!process.env.AUTH_EMAIL_FROM)
        }
      />
    </AccountFrame>
  );
}
