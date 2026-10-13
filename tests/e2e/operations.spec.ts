import { expect, test } from "@playwright/test";

test("panel effects can be disabled with keyboard and remain disabled after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "خاموش‌کردن جلوه‌های پنل" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-effects", "off");
  await expect(page.locator(".welcome-illustration")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "روشن‌کردن جلوه‌های پنل" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "روشن‌کردن جلوه‌های پنل" }).click();
  await expect(page.locator(".welcome-illustration")).toBeVisible();
});

test("supervisor displays real web facts and unknown capacity, and recovers from failure", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/status");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const status = await response.json();
  expect(status.capacity).toMatchObject({
    remaining: null,
    used: null,
    limit: null,
  });
  await page.goto("/supervisor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "مرکز نظارت",
  );
  await expect(page.locator(".server-facts").first()).toContainText(
    status.hosting,
  );
  await expect(page.locator(".capacity-card")).toContainText(
    "هنوز قابل محاسبه نیست",
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.getByRole("button", { name: "به‌روزرسانی وضعیت سرور" }).click();
  await expect(page.locator(".inline-error[role='alert']")).toContainText(
    "دریافت وضعیت ناموفق",
  );
  await page.unroute("**/api/status");
  await page.getByRole("button", { name: "به‌روزرسانی وضعیت سرور" }).click();
  await expect(page.locator(".inline-error[role='alert']")).toHaveCount(0);
});

test("support validates, persists and deletes only a local draft without fake submission", async ({
  page,
}) => {
  await page.goto("/support");
  await page.getByRole("button", { name: "ذخیرهٔ پیش‌نویس" }).click();
  await expect(page.locator("#subject-error")).toContainText("حداقل");
  await page
    .getByLabel("موضوع درخواست", { exact: true })
    .fill("مشکل اتصال نمونه");
  await page
    .getByLabel("شرح مسئله", { exact: true })
    .fill("پس از تغییر شبکه اتصال قطع شد و نیاز به بررسی دارد.");
  await page.getByRole("button", { name: "ذخیرهٔ پیش‌نویس" }).click();
  await expect(page.getByRole("status")).toContainText(
    "برای پشتیبانی ارسال نشده",
  );
  await page.reload();
  await expect(page.getByLabel("موضوع درخواست", { exact: true })).toHaveValue(
    "مشکل اتصال نمونه",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "دانلود فایل" }).click();
  expect((await download).suggestedFilename()).toBe("hamyar-ticket-draft.txt");
  await page.getByRole("button", { name: "پاک‌کردن پیش‌نویس" }).click();
  await page.reload();
  await expect(page.getByLabel("موضوع درخواست", { exact: true })).toHaveValue(
    "",
  );
});

test("management pages support light theme, reduced motion and 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/supervisor", "/support"]) {
    await page.goto(route);
    if (route === "/supervisor")
      await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
    await expect(
      page.getByRole("button", { name: "فعال‌کردن تم تیره" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
    await page.getByRole("link", { name: "رفتن به محتوای اصلی" }).focus();
    await expect(
      page.getByRole("link", { name: "رفتن به محتوای اصلی" }),
    ).toBeVisible();
  }
});
