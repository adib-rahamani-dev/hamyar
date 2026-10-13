import { expect, test } from "@playwright/test";
test("unconfigured deployment denies auth and hides the development mailbox", async ({
  page,
  request,
}) => {
  await page.goto("/account/sign-in");
  await expect(
    page.getByText("حساب واقعی هنوز روی این میزبان تنظیم نشده است.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ورود به همیار" }),
  ).toBeDisabled();
  expect((await request.get("/api/auth/get-session")).status()).toBe(503);
  expect((await request.get("/api/workspace/organizations")).status()).toBe(
    503,
  );
  expect((await request.get("/dev/mailbox")).status()).toBe(404);
});
test("account screens remain readable in light theme, with keyboard, at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/account/sign-in");
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  for (const route of [
    "/account/sign-in",
    "/account/sign-up",
    "/account/reset",
    "/workspace",
  ]) {
    await page.goto(route);
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
