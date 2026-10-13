export type DeploymentStatus = {
  sampledAt: string;
  hosting: string;
  environment: string;
  region: string | null;
  runtime: string;
  media: "not-connected";
  capacity: { limit: null; used: null; remaining: null; reason: string };
};

/** Public deployment facts only. Tenant usage and infrastructure telemetry need auth. */
export function publicDeploymentStatus(
  env: Record<string, string | undefined>,
  nodeVersion: string,
  now = new Date(),
): DeploymentStatus {
  const vercel = env.VERCEL === "1";
  const region =
    vercel && /^[a-z]{3}\d$/.test(env.VERCEL_REGION ?? "")
      ? env.VERCEL_REGION!
      : null;
  const environments: Record<string, string> = {
    production: "استقرار اصلی",
    preview: "پیش‌نمایش",
    development: "توسعه",
  };
  return {
    sampledAt: now.toISOString(),
    hosting: vercel ? "Vercel" : "اجرای محلی / میزبان مستقل",
    environment: vercel
      ? (environments[env.VERCEL_ENV ?? ""] ?? "نامشخص")
      : "محیط توسعه یا مستقل",
    region,
    runtime: `Node.js ${/^\d+/.exec(nodeVersion)?.[0] ?? "نامشخص"}`,
    media: "not-connected",
    capacity: {
      limit: null,
      used: null,
      remaining: null,
      reason: "سقف سازمان و مصرف زندهٔ سرور رسانه هنوز متصل نیستند.",
    },
  };
}
