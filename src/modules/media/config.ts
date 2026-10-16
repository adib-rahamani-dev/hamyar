import { z } from "zod";
const configSchema = z.object({
  LIVEKIT_URL: z.url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(32),
  // Explicit acknowledgment that public signaling routes through the session-aware gateway.
  HAMYAR_MEDIA_GATEWAY: z.literal("enabled"),
});
export function mediaConfig(env: Record<string, string | undefined>) {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success || parsed.data.LIVEKIT_API_KEY === "devkey") return null;
  const url = new URL(parsed.data.LIVEKIT_URL);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    return null;
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "wss:" && !(local && url.protocol === "ws:"))
    return null;
  return parsed.data;
}
