import { expect, test } from "@playwright/test";
test("public production never substitutes sample rooms or members for missing infrastructure", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByText(
      "زیرساخت حساب و پایگاه داده هنوز روی این میزبان تنظیم نشده است.",
    ),
  ).toBeVisible();
  expect((await request.get("/demo")).status()).toBe(404);
  expect((await request.get("/rooms/demo")).status()).toBe(404);
  expect((await request.get("/dev/mailbox")).status()).toBe(404);
  for (const path of ["/members", "/supervisor", "/support", "/settings"]) {
    await page.goto(path);
    await expect(page.locator(".room-card,.supervisor-room")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "بازگشت به فضای نمونه" }),
    ).toHaveCount(0);
  }
  await page.goto("/account/sign-in");
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});
