import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    cloudTracks: MediaStreamTrack[];
    cloudConstraints: MediaStreamConstraints[];
    cloudRelease?: () => void;
  }
}
async function instrument(page: Page) {
  await page.addInitScript(() => {
    window.cloudTracks = [];
    window.cloudConstraints = [];
    const acquire = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.cloudConstraints.push(constraints ?? {});
      const stream = await acquire(constraints);
      window.cloudTracks.push(...stream.getTracks());
      return stream;
    };
  });
}

test("private device check: explicit consent, real preview, input choice, release on navigation", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("/device-check");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "خیال راحت",
  );
  expect(await page.evaluate(() => window.cloudConstraints.length)).toBe(0);
  await page.getByRole("button", { name: "تست دوربین", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "خاموش‌کردن دوربین" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page
        .getByLabel("پیش‌نمایش دوربین شما")
        .evaluate((element: HTMLVideoElement) => element.videoWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "تست میکروفون", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "خاموش‌کردن میکروفون" }),
  ).toHaveAttribute("aria-pressed", "true");
  const select = page.getByLabel("انتخاب دوربین", { exact: true });
  await expect.poll(() => select.locator("option").count()).toBeGreaterThan(1);
  const deviceId = await select.locator("option").nth(1).getAttribute("value");
  await select.selectOption(deviceId!);
  await expect
    .poll(() => page.evaluate(() => window.cloudConstraints.at(-1)?.video))
    .toMatchObject({ deviceId: { exact: deviceId } });
  await expect
    .poll(() => page.evaluate(() => window.cloudTracks[0]?.readyState))
    .toBe("ended");
  await page.getByRole("button", { name: "پخش صدای آزمایشی" }).click();
  await expect(page.getByText("صدایی شنیدید؟", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.getByRole("link", { name: "ادامه به مجموعه‌های شما" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.cloudTracks.every((track) => track.readyState === "ended"),
      ),
    )
    .toBe(true);
});

test("cancelled permissions close late tracks, denial explains recovery, all-off releases devices", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("/device-check");
  await page.evaluate(() => {
    const acquire = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await acquire(constraints);
      await new Promise<void>((resolve) => {
        window.cloudRelease = resolve;
      });
      return stream;
    };
  });
  await page.getByRole("button", { name: "تست میکروفون", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!window.cloudRelease))
    .toBe(true);
  await page.getByRole("button", { name: "لغو درخواست میکروفون" }).click();
  await page.evaluate(() => window.cloudRelease?.());
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.cloudTracks.every((track) => track.readyState === "ended"),
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "تست میکروفون", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Private detail", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "تست دوربین", exact: true }).click();
  const error = page
    .getByRole("alert")
    .filter({ hasText: "یک مورد نیاز به بررسی دارد" });
  await expect(error).toContainText("اجازهٔ دسترسی داده نشد");
  await expect(error).not.toContainText("Private detail");
  await page.getByRole("button", { name: "راهنمای رفع مشکل" }).click();
  await expect(
    page.getByRole("heading", { name: "دستگاه پیدا نمی‌شود یا اجازه رد شده" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "خاموش‌کردن همه" }).click();
  expect(
    await page.evaluate(() =>
      window.cloudTracks.every((track) => track.readyState === "ended"),
    ),
  ).toBe(true);
});

test("landing is usable in both themes, on small screens and with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "همراهی بیشتر",
  );
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByText("دوربین و میکروفون خودکار روشن می‌شوند؟", { exact: true })
    .click();
  await expect(
    page.getByText("خیر. دسترسی تنها", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "قبل از کلاس، دستگاهت را تست کن" })
    .click();
  await expect(page).toHaveURL(/\/device-check$/);
});
