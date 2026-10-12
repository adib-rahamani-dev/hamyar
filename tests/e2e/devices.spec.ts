import { expect, test } from "@playwright/test";

test("devices require a click, preview locally and release every track on exit", async ({
  page,
}) => {
  // Observe tracks from Chromium's synthetic devices; never access real hardware.
  await page.addInitScript(() => {
    const tracks: MediaStreamTrack[] = [];
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      tracks.push(...stream.getTracks());
      return stream;
    };
    Object.defineProperty(window, "testTracks", { value: tracks });
  });
  await page.goto("/rooms/demo");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testTracks: MediaStreamTrack[] }).testTracks
          .length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "روشن‌کردن میکروفون" }).click();
  await expect(
    page.getByRole("button", { name: "خاموش‌کردن میکروفون" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".classroom")).toHaveAttribute("data-audio", "on");
  await expect
    .poll(() =>
      page
        .locator(".classroom")
        .evaluate((element) =>
          Number(
            (element as HTMLElement).style.getPropertyValue("--voice-level"),
          ),
        ),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "روشن‌کردن دوربین" }).click();
  await expect(
    page.getByRole("button", { name: "خاموش‌کردن دوربین" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page
        .locator(".presenter-preview video")
        .evaluate((video: HTMLVideoElement) => Boolean(video.srcObject)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "خاموش‌کردن جلوه‌ها" }).click();
  await expect(page.locator(".classroom")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await page.getByRole("link", { name: "خروج", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "کلاس‌های شما" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testTracks: MediaStreamTrack[] }
      ).testTracks.every((track) => track.readyState === "ended"),
    ),
  ).toBe(true);
});

test("denied microphone access shows a readable error without an active state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await page.goto("/rooms/demo");
  await page.getByRole("button", { name: "روشن‌کردن میکروفون" }).click();
  await expect(page.getByRole("status")).toContainText(
    "اجازهٔ دسترسی داده نشد",
  );
  await expect(
    page.getByRole("button", { name: "روشن‌کردن میکروفون" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("reduced motion removes ambient animation without enabling a device", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/rooms/demo");
  await expect(page.locator(".classroom")).toHaveAttribute(
    "data-motion",
    "off",
  );
  expect(
    await page
      .locator(".ambient-glow.mint")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await expect(
    page.getByRole("button", { name: "روشن‌کردن میکروفون" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({
    path: `.artifacts/glass-${testInfo.project.name}-dark.png`,
  });
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  await page.screenshot({
    path: `.artifacts/glass-${testInfo.project.name}-light.png`,
  });
});
