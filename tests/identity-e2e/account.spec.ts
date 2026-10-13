import { expect, test } from "@playwright/test";
import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
function totp(secret: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret) bits += chars.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((v) => parseInt(v, 2))),
    counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const value = createHmac("sha1", key).update(counter).digest(),
    offset = value[value.length - 1]! & 15;
  return String((value.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
test("real sign-in → MFA → organization → invite → role change → suspension → sign-out", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email =
      process.env[`HAMYAR_FIXTURE_${info.project.name.toUpperCase()}_OWNER`]!,
    guest =
      process.env[`HAMYAR_FIXTURE_${info.project.name.toUpperCase()}_GUEST`]!;
  await page.goto("/account/sign-in");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill("Synthetic-browser-test-password!");
  await page.getByRole("button", { name: "ورود به همیار" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole("button", { name: "ایجاد مجموعه" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "فعال‌کردن تأیید دومرحله‌ای" }).click();
  await page
    .getByLabel("رمز عبور حساب")
    .fill("Synthetic-browser-test-password!");
  await page.getByRole("button", { name: "راه‌اندازی MFA" }).click();
  const secret = await page.getByLabel("کلید محرمانهٔ برنامه").inputValue();
  await page.getByLabel("کد شش‌رقمی برنامه").fill(totp(secret));
  await page.getByRole("button", { name: "تأیید و فعال‌کردن" }).click();
  await expect(page.getByRole("status")).toContainText(
    "تأیید دومرحله‌ای فعال شد",
  );
  await page.getByRole("link", { name: "ادامه به مجموعه‌ها" }).click();
  await expect(
    page.getByRole("button", { name: "ایجاد مجموعه" }),
  ).toBeEnabled();
  await page.getByLabel("نام مجموعه").fill("مدرسهٔ آزمایش مرورگر");
  await page.getByRole("button", { name: "ایجاد مجموعه" }).click();
  await expect(
    page.getByRole("heading", { name: "اعضای مدرسهٔ آزمایش مرورگر" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("انتخاب مجموعه")).toContainText(
    "مدرسهٔ آزمایش مرورگر",
  );
  await page.getByLabel("نام مجموعه").fill("شرکت آزمایشی");
  await page.getByLabel("نوع مجموعه").selectOption("company");
  await page.getByRole("button", { name: "ایجاد مجموعه" }).click();
  await expect(
    page.getByRole("heading", { name: "اعضای شرکت آزمایشی" }),
  ).toBeVisible();
  const school = await page
    .getByLabel("انتخاب مجموعه")
    .locator("option")
    .filter({ hasText: "مدرسهٔ آزمایش مرورگر" })
    .getAttribute("value");
  await page.getByLabel("انتخاب مجموعه").selectOption(school!);
  await expect(
    page.getByRole("heading", { name: "اعضای مدرسهٔ آزمایش مرورگر" }),
  ).toBeVisible();
  await page.getByLabel("نام اتاق").fill("اتاق آزمون پایدار");
  await page.getByRole("button", { name: "ثبت اتاق" }).click();
  await expect(
    page.getByText("اتاق آزمون پایدار", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("اتاق آزمون پایدار", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "مرکز نظارت", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "مرکز نظارت", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("اتاق آزمون پایدار", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/۱ عضو فعال/)).toBeVisible();
  await expect(page.locator(".supervisor-room")).toHaveCount(0);
  await page.getByRole("link", { name: "مجموعه‌های شما", exact: true }).click();
  await page.getByLabel("ایمیل فرد دعوت‌شده").fill(guest);
  await page.getByRole("button", { name: "ساخت دعوت" }).click();
  const invite = await page
    .getByLabel("لینک دعوت؛ فقط برای دریافت‌کننده")
    .inputValue();
  expect(invite).toContain("#token=");
  const context = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for":
          info.project.name === "mobile" ? "192.0.2.22" : "192.0.2.21",
      },
    }),
    student = await context.newPage();
  await student.goto("http://127.0.0.1:3100/account/sign-in");
  await student.getByLabel("ایمیل", { exact: true }).fill(guest);
  await student
    .getByLabel("رمز عبور", { exact: true })
    .fill("Synthetic-browser-test-password!");
  await student.getByRole("button", { name: "ورود به همیار" }).click();
  await expect(student).toHaveURL(/\/workspace$/);
  await student.goto(invite);
  await student.getByRole("button", { name: "پذیرش دعوت" }).click();
  await expect(student).toHaveURL(/\/workspace$/);
  await page.reload();
  await expect(page.locator(".real-person")).toHaveCount(2);
  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByLabel("نقش عضو آزمایشی").selectOption("supervisor");
  await expect(
    page.getByRole("status").filter({ hasText: "نقش عضو تغییر کرد" }),
  ).toBeVisible();
  const denied = await student.request.get(
    "http://127.0.0.1:3100/api/workspace/members",
  );
  expect(denied.status()).toBe(428);
  await page.getByRole("button", { name: "تعلیق", exact: true }).click();
  await expect(
    page.locator(".real-person").filter({ hasText: guest }),
  ).toContainText("تعلیق‌شده");
  await student.reload();
  await expect(student.getByText("هنوز عضو مجموعه‌ای نیستید.")).toBeVisible();
  await mkdir(".artifacts", { recursive: true });
  await page.getByRole("heading", { name: "مجموعه‌های شما" }).click();
  await page.screenshot({
    path: `.artifacts/identity-workspace-${info.project.name}-dark.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  await page.getByRole("heading", { name: "مجموعه‌های شما" }).click();
  await page.screenshot({
    path: `.artifacts/identity-workspace-${info.project.name}-light.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(info.project.name === "mobile" ? 390 : 1440);
  await page.getByRole("button", { name: "خروج از حساب" }).click();
  await expect(page).toHaveURL(/\/account\/sign-in$/);
  const unauthorized = await page.request.get("/api/workspace/organizations");
  expect(unauthorized.status()).toBe(401);
  await context.close();
  expect(errors).toEqual([]);
});
