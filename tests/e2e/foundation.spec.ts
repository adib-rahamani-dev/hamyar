import { expect, test } from "@playwright/test";

test("dashboard supports Persian, both themes, search and scoped sample navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "کلاس‌های شما",
  );
  await page.getByRole("button", { name: "فعال‌کردن تم روشن" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "فعال‌کردن تم تیره" }).click();
  await page.getByRole("textbox", { name: "جست‌وجوی کلاس" }).fill("علوم");
  await expect(page.locator(".room-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "جست‌وجوی کلاس" }).fill("پیدانشدنی");
  await expect(page.getByText("کلاسی با این عبارت پیدا نشد.")).toBeVisible();
  await page.getByRole("button", { name: "اعضای مجموعه" }).click();
  await expect(page.locator(".person-row")).toHaveCount(4);
  await page.getByRole("button", { name: "مرکز نظارت" }).click();
  await expect(page.locator(".supervisor-room")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("viewport has no horizontal overflow on dashboard or classroom", async ({
  page,
}) => {
  for (const route of ["/", "/rooms/demo"]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  }
});

test("local classroom draws, undoes, exports and clearly explains unavailable media", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/rooms/demo");
  const board = page.getByRole("img", {
    name: "ناحیهٔ رسم؛ با ماوس یا لمس خط بکشید",
  });
  const bounds = await board.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + 30, bounds!.y + 30);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 110, bounds!.y + 100, { steps: 8 });
  await page.mouse.up();
  await expect(board.locator("polyline")).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "دانلود تخته" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "hamyar-whiteboard.svg",
  );
  if (await page.locator(".mobile-room-tabs").isVisible()) {
    await page.getByRole("button", { name: "گفت‌وگو", exact: true }).click();
    await page.getByRole("button", { name: "تخته", exact: true }).click();
    await expect(board.locator("polyline")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "برگشت آخرین خط" }).click();
  await expect(board.locator("polyline")).toHaveCount(0);
  if (await page.locator(".mobile-room-tabs").isVisible())
    await page.getByRole("button", { name: "گفت‌وگو", exact: true }).click();
  await page
    .getByRole("textbox", { name: "متن پیام" })
    .fill("سلام کلاس <script>test</script>");
  await page.getByRole("button", { name: "ارسال پیام محلی" }).click();
  await expect(page.getByText("سلام کلاس <script>test</script>")).toBeVisible();
  await page.getByRole("button", { name: "اجازهٔ صحبت", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "پایین‌آوردن دست" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "ضبط میزبان" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "ضبط واقعی در این نسخه وجود ندارد" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("classroom controls stay in view at 320px and help works with keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/rooms/demo");
  await page.getByRole("button", { name: "اجازهٔ صحبت", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  const controls = await page.locator(".room-bottom").boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(800);
  await page.getByRole("button", { name: "راهنمای اتاق" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "افراد", exact: true }).click();
  const participantToggle = page.getByRole("button", { name: "افراد ۲" });
  await participantToggle.focus();
  await page.keyboard.press("Enter");
  await expect(participantToggle).toHaveAttribute("aria-expanded", "false");
});

test("health endpoint is liveness only and sets basic security headers", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    status: "ok",
    mode: "foundation",
  });
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});
