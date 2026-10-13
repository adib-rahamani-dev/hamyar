import "server-only";
import { randomUUID } from "node:crypto";
import { developmentMailboxEnabled } from "./dev-mail-config";
import type { AuthMail } from "./auth";
type LocalMessage = AuthMail & { id: string; createdAt: string };
const store = globalThis as typeof globalThis & {
  hamyarDevMailbox?: LocalMessage[];
};
export function captureDevelopmentMail(mail: AuthMail) {
  if (!developmentMailboxEnabled(process.env) || !mail.to.endsWith(".test"))
    throw new Error("LOCAL_TEST_EMAIL_REQUIRED");
  if (new URL(mail.url).origin !== new URL(process.env.BETTER_AUTH_URL!).origin)
    throw new Error("LOCAL_URL_REQUIRED");
  const messages = (store.hamyarDevMailbox ??= []);
  messages.unshift({
    ...mail,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  });
  store.hamyarDevMailbox = messages.slice(0, 30);
}
export function developmentMessages() {
  if (!developmentMailboxEnabled(process.env)) return [];
  return (store.hamyarDevMailbox ?? []).filter(
    (mail) => Date.now() - new Date(mail.createdAt).getTime() < 15 * 60 * 1000,
  );
}
