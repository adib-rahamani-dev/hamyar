import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const origin = "http://127.0.0.1:3100";
async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(`/api/workspace/${path}`, {
    data,
    headers: { origin },
  });
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
  return response.json();
}
async function account(page: Page, name: string) {
  const response = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name,
      email: `class-${randomUUID()}@example.test`,
      password: "Synthetic-classroom-only-password!",
    },
  });
  expect(response.ok()).toBe(true);
}
async function tab(page: Page, name: string, mobile: boolean) {
  if (mobile) await page.getByRole("tab", { name, exact: true }).click();
}
test("two real unverified accounts → bounded room link → persisted chat/board → branding/ticket → revoked access", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(160000);
  const mobile = info.project.name === "mobile",
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const state = window as typeof window & {
      __hamyarCaptureTracks: MediaStreamTrack[];
    };
    state.__hamyarCaptureTracks = [];
    const acquire = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await acquire(constraints);
      state.__hamyarCaptureTracks.push(...stream.getTracks());
      return stream;
    };
  });
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: mobile ? 390 : 1280, height: 950 },
    extraHTTPHeaders: {
      "x-forwarded-for": mobile ? "192.0.2.35" : "192.0.2.34",
    },
    permissions: ["camera", "microphone"],
  });
  const guest = await context.newPage();
  guest.on("pageerror", (e) => errors.push(e.message));
  try {
    await account(page, "میزبان کلاس واقعی");
    await account(guest, "همراه کلاس واقعی");
    await post(page, "organizations", {
      name: "آموزشگاه تجربه",
      kind: "school",
    });
    const room = await post(page, "rooms", { title: "کارگاه گفت‌وگو" });
    await page.goto(`/rooms/${room.id}`);
    await expect(
      page.getByRole("heading", { name: "کارگاه گفت‌وگو" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "شروع جلسه", exact: true }).click();
    await expect(page.getByLabel("قلم سبز", { exact: true })).toBeEnabled();
    await tab(page, "افراد", mobile);
    if (!mobile) await page.getByRole("tab", { name: /افراد/ }).click();
    await page.getByRole("button", { name: "ساخت لینک دعوت" }).click();
    const invite = await page
      .getByLabel("دعوت ۲۴ساعته، حداکثر ۳۰ ورود تازه")
      .inputValue();
    await guest.goto(invite);
    await guest
      .getByRole("button", { name: "ورود به اتاق", exact: true })
      .click();
    await expect(guest).toHaveURL(new RegExp(`/rooms/${room.id}$`));
    expect(
      (await (await guest.request.get("/api/auth/get-session")).json()).user
        .emailVerified,
    ).toBe(false);
    await tab(guest, "گفت‌وگو", mobile);
    await guest
      .getByLabel("پیام کلاس")
      .fill("سلام از دستگاه دوم <b>متن امن</b>");
    await guest.getByRole("button", { name: "ارسال", exact: true }).click();
    await expect(
      guest.getByText("سلام از دستگاه دوم <b>متن امن</b>", { exact: true }),
    ).toBeVisible();
    await tab(page, "گفت‌وگو", mobile);
    if (!mobile)
      await page.getByRole("tab", { name: "گفت‌وگو", exact: true }).click();
    await expect(
      page.getByText("سلام از دستگاه دوم <b>متن امن</b>", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await tab(page, "تخته", mobile);
    const svg = page.getByRole("img", { name: "محتوای تختهٔ مشترک کلاس" }),
      box = (await svg.boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 120, { steps: 12 });
    await page.mouse.up();
    await expect(svg.locator("path[stroke-width]")).toHaveCount(1);
    await tab(guest, "تخته", mobile);
    await expect(
      guest
        .getByRole("img", { name: "محتوای تختهٔ مشترک کلاس" })
        .locator("path[stroke-width]"),
    ).toHaveCount(1, { timeout: 20000 });
    await expect(guest.getByLabel("قلم سبز", { exact: true })).toBeDisabled();
    await guest.reload();
    await expect(
      guest
        .getByRole("img", { name: "محتوای تختهٔ مشترک کلاس" })
        .locator("path[stroke-width]"),
    ).toHaveCount(1);
    const state = await (
      await page.request.get(`/api/workspace/classroom/${room.id}`)
    ).json();
    const participant = state.people.find(
      (p: { name: string }) => p.name === "همراه کلاس واقعی",
    );
    let mediaToken: { url: string; token: string } | undefined;
    const snapshotResponse = await guest.request.get(
      `/api/workspace/classroom/${room.id}`,
    );
    const etag = snapshotResponse.headers().etag;
    expect(etag).toBeTruthy();
    expect(
      (
        await guest.request.get(`/api/workspace/classroom/${room.id}`, {
          headers: { "if-none-match": etag! },
        })
      ).status(),
    ).toBe(304);
    if (process.env.HAMYAR_TEST_MEDIA === "1") {
      await tab(page, "صوت و تصویر", mobile);
      await tab(guest, "صوت و تصویر", mobile);
      await page
        .getByRole("button", { name: "اتصال به صوت و تصویر", exact: true })
        .click();
      await guest
        .getByRole("button", { name: "اتصال به صوت و تصویر", exact: true })
        .click();
      await expect(page.locator('[data-media-status="connected"]')).toBeVisible(
        { timeout: 25000 },
      );
      await expect(
        guest.locator('[data-media-status="connected"]'),
      ).toBeVisible({ timeout: 25000 });
      await expect(
        guest.getByLabel("میکروفون کلاس", { exact: true }),
      ).toBeDisabled();
      await page.getByLabel("دوربین کلاس", { exact: true }).click();
      await page.getByLabel("میکروفون کلاس", { exact: true }).click();
      await expect(guest.locator(".media-audio audio")).toHaveCount(1, {
        timeout: 20000,
      });
      await page.getByLabel("میکروفون کلاس", { exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            (
              window as typeof window & {
                __hamyarCaptureTracks: MediaStreamTrack[];
              }
            ).__hamyarCaptureTracks
              .filter((track) => track.kind === "audio")
              .every((track) => track.readyState === "ended"),
          ),
        )
        .toBe(true);
      await expect(
        page.getByLabel("میکروفون کلاس", { exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await expect(guest.locator(".media-feed video")).toBeVisible({
        timeout: 20000,
      });
      await expect
        .poll(
          () =>
            guest
              .locator(".media-feed video")
              .evaluate((v: HTMLVideoElement) => v.videoWidth),
          { timeout: 20000 },
        )
        .toBeGreaterThan(0);
      mediaToken = await post(guest, `classroom/${room.id}/join-media`, {});
    }
    await page.screenshot({
      path: `.artifacts/classroom-${info.project.name}-dark.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
    await page.screenshot({
      path: `.artifacts/classroom-${info.project.name}-light.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(mobile ? 390 : 1440);
    await post(page, `classroom/${room.id}/control`, {
      membershipId: participant.membershipId,
      action: "ban",
    });
    expect(
      (
        await guest.request.get(`/api/workspace/classroom/${room.id}`, {
          headers: { "if-none-match": etag! },
        })
      ).status(),
    ).toBe(403);
    if (mediaToken) {
      const { default: WebSocket } = await import("ws");
      const { RoomServiceClient } = await import("livekit-server-sdk");
      const denied = await new Promise<number>((resolve, reject) => {
        const target = new URL("/rtc", mediaToken!.url);
        target.searchParams.set("access_token", mediaToken!.token);
        const ws = new WebSocket(target, { origin, handshakeTimeout: 5000 });
        ws.on("unexpected-response", (_request, response) => {
          resolve(response.statusCode ?? 0);
          ws.terminate();
        });
        ws.on("open", () => {
          ws.close();
          reject(Error("Banned token reconnected"));
        });
        ws.on("error", () => {});
        setTimeout(() => {
          ws.terminate();
          reject(Error("Gateway denial timed out"));
        }, 6000).unref();
      });
      expect(denied).toBe(403);
      const claims = JSON.parse(
        Buffer.from(mediaToken.token.split(".")[1]!, "base64url").toString(),
      );
      const control = new RoomServiceClient(
        "http://127.0.0.1:7880",
        "hamyar_browser_fixture",
        "synthetic-isolated-media-fixture-secret-0123456789",
        { requestTimeout: 5 },
      );
      await expect
        .poll(
          async () =>
            (await control.listParticipants(claims.video.room)).some(
              (p) => p.identity === claims.sub,
            ),
          { timeout: 20000 },
        )
        .toBe(false);
    }
    await expect(
      guest.getByRole("heading", {
        name: "دسترسی این نشست به اتاق پایان یافت",
      }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      guest.getByText("سلام از دستگاه دوم <b>متن امن</b>", { exact: true }),
    ).toHaveCount(0);
    await page.goto("/settings");
    await page.getByLabel("نام نمایشی مجموعه").fill("همیار آموزش");
    await page
      .getByLabel("پیام خوشامد اتاق")
      .fill("یادگیری از همین‌جا شروع می‌شود.");
    await page.getByRole("button", { name: "ذخیرهٔ ظاهر مجموعه" }).click();
    await expect(
      page.getByText("ظاهر و پیام مجموعه ذخیره شدند."),
    ).toBeVisible();
    await page.goto(`/rooms/${room.id}`);
    await expect(page.getByText("همیار آموزش", { exact: true })).toBeVisible();
    await expect(
      page.getByText("یادگیری از همین‌جا شروع می‌شود.", { exact: true }),
    ).toBeVisible();
    await page.goto("/support");
    await page.getByLabel("موضوع", { exact: true }).fill("درخواست بررسی کلاس");
    await page
      .getByLabel("شرح درخواست")
      .fill("توضیح واقعی درخواست برای بررسی مدیر");
    await page.getByRole("button", { name: "ثبت تیکت", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "درخواست بررسی کلاس" }),
    ).toBeVisible();
    await page
      .getByLabel("پاسخ تازه")
      .fill("بررسی و پاسخ در همین مجموعه ثبت شد.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "ثبت پاسخ", exact: true }).click();
    await expect(
      page.getByText("بررسی و پاسخ در همین مجموعه ثبت شد.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("پاسخ تازه")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
