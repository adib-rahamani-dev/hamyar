import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("signup without sender → unverified session → password-only management → persisted room → sign-out and real sign-in", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `signup-${randomUUID()}@example.test`;
  const password = "Synthetic-browser-signup-password!";
  await page.goto("/account/sign-up");
  await expect(page.getByText(/فعلاً بدون تأیید ایمیل/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ساخت حساب", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("نام و نام خانوادگی").fill("مدیر ثبت‌نام آزمایشی");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ساخت حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  const session = await (
    await page.request.get("/api/auth/get-session")
  ).json();
  expect(session.user.emailVerified).toBe(false);
  await expect(
    page.getByRole("button", { name: "ایجاد مجموعه" }),
  ).toBeEnabled();
  await page.getByLabel("نام مجموعه").fill("مدرسهٔ ثبت‌نام واقعی");
  await page.getByRole("button", { name: "ایجاد مجموعه" }).click();
  await expect(
    page.getByRole("heading", { name: "اعضای مدرسهٔ ثبت‌نام واقعی" }),
  ).toBeVisible();
  await page.getByLabel("نام اتاق").fill("اتاق حساب تازه");
  await page.getByRole("button", { name: "ثبت اتاق" }).click();
  await expect(page.getByText("اتاق حساب تازه", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "خروج از حساب" }).click();
  await expect(page).toHaveURL(/\/account\/sign-in$/);
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود به همیار" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await page.getByLabel("انتخاب مجموعه").selectOption({
    label: "مدرسهٔ ثبت‌نام واقعی · مالک",
  });
  await expect(page.getByText("اتاق حساب تازه", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(info.project.name === "mobile" ? 390 : 1440);
  await page.goto("/account/reset");
  await expect(page.getByText(/بازیابی رمز فعلاً در دسترس نیست/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ادامه", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await page.request.post("/api/auth/request-password-reset", {
        headers: { origin: "http://127.0.0.1:3100" },
        data: { email },
      })
    ).status(),
  ).toBe(503);
  expect(errors).toEqual([]);
});
