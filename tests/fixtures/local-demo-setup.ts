import { request } from "@playwright/test";
/** Compile local development routes before browser contexts observe Fast Refresh. */
export default async function warmLocalRoutes() {
  const client = await request.newContext({
    baseURL: "http://127.0.0.1:3000",
    timeout: 60000,
  });
  try {
    for (const path of [
      "/",
      "/rooms/demo",
      "/supervisor",
      "/members",
      "/support",
      "/settings",
      "/account/sign-in",
      "/account/sign-up",
      "/account/reset",
      "/workspace",
    ])
      if ((await client.get(path)).status() !== 200)
        throw new Error(`Local fixture route failed: ${path}`);
  } finally {
    await client.dispose();
  }
}
