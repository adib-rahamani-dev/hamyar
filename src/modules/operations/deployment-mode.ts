import { z } from "zod";
export const deploymentModeSchema = z.enum(["normal", "domestic"]);
/** A runtime operator setting, not a browser toggle or a claim about ISP reachability. */
export function deploymentMode(env: Record<string, string | undefined>) {
  return deploymentModeSchema.parse(env.HAMYAR_DEPLOYMENT_MODE ?? "normal");
}
export function assertDomesticDependencies(
  env: Record<string, string | undefined>,
) {
  if (deploymentMode(env) !== "domestic") return;
  const hostname = env.DATABASE_URL ? new URL(env.DATABASE_URL).hostname : "";
  if (/(^|\.)(neon\.tech|supabase\.co)$/.test(hostname) || env.RESEND_API_KEY)
    throw new Error("DOMESTIC_EXTERNAL_DEPENDENCY");
  const allowed = (env.HAMYAR_DOMESTIC_HOSTS ?? "postgres,localhost,127.0.0.1")
    .split(",")
    .map((v) => v.trim().toLowerCase());
  const hosts = [
    hostname,
    ...(env.SMTP_HOST ? [env.SMTP_HOST] : []),
    ...(env.LIVEKIT_URL ? [new URL(env.LIVEKIT_URL).hostname] : []),
  ];
  if (
    hosts.some((host) =>
      /(^|\.)(neon\.tech|supabase\.co|livekit\.cloud)$/i.test(host),
    )
  )
    throw new Error("DOMESTIC_EXTERNAL_DEPENDENCY");
  if (hosts.some((host) => !allowed.includes(host.toLowerCase())))
    throw new Error("DOMESTIC_HOST_NOT_APPROVED");
}
