import { getIdentity } from "@/modules/identity/runtime.server";
import { identityConfigured } from "@/modules/identity/config";

export const dynamic = "force-dynamic";
async function handle(request: Request) {
  if (!identityConfigured(process.env))
    return Response.json(
      {
        error: "IDENTITY_NOT_CONFIGURED",
        message: "ورود واقعی هنوز روی این میزبان تنظیم نشده است.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const identity = getIdentity();
    await identity.assertReady();
    return await identity.auth.handler(request);
  } catch {
    return Response.json(
      {
        error: "IDENTITY_UNAVAILABLE",
        message: "زیرساخت حساب در دسترس یا آماده نیست.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handle as GET, handle as POST };
