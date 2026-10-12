# hamyar | همیار

پایهٔ پلتفرم کلاس و جلسهٔ آنلاین چندسازمانی برای مدارس، شرکت‌ها و افراد؛ با رابط فارسی RTL، تم سبز روشن/تیره و معماری مستقل رسانه.

**وضعیت: پایهٔ پروژه با اولین قابلیت واقعی دستگاه‌ها.** پیش‌نمایش دوربین و بررسی میکروفون با اجازهٔ مرورگر فعال‌اند؛ رسانه فقط در همین دستگاه پردازش می‌شود. هنوز احراز هویت، پایگاه دادهٔ متصل، کلاس چندنفره، اشتراک صفحه، تختهٔ مشترک یا ضبط واقعی وجود ندارد. چت و تختهٔ دمو در حافظهٔ همان مرورگر هستند و با خروج پاک می‌شوند. وضعیت دقیق در [نقشهٔ اجرا](docs/ROADMAP.md).

## اجرا

Node.js 22.13+ در شاخهٔ 22 یا Node.js 24/26؛ برای CI و استقرار، Node.js 22 LTS انتخاب اولیه است.

```powershell
npm ci
npm run dev
```

[پنل نمونه](http://localhost:3000)، [اتاق نمونه](http://localhost:3000/rooms/demo) و [liveness](http://localhost:3000/api/health). دمو برای اجرا نیاز به env یا Docker ندارد. health فقط پاسخ‌گویی برنامه را بررسی می‌کند و readiness سرویس‌ها نیست.

## فناوری و ساختار

رابط گلس در دو تم با موشن کوتاه، نور زمینهٔ آرام و واکنش کم‌دامنه به صدای میکروفون. دکمهٔ جلوه‌ها حرکت‌ها را خاموش می‌کند و `prefers-reduced-motion` خودکار رعایت می‌شود. برای امتحان دستگاه‌ها در اتاق روی دوربین/میکروفون کلیک کنید؛ هنگام خروج، trackها بسته می‌شوند. این قابلیت به معنی اتصال به کاربران دیگر نیست.

Next.js App Router، React، TypeScript strict، LiveKit SDK، CSS tokens، Vazirmatn محلی و Lucide نصب‌شده‌اند. PostgreSQL، Drizzle، Better Auth، Redis/BullMQ، Yjs و Egress/S3 در معماری انتخاب شده‌اند؛ موارد نصب‌نشده و مراحل اتصال در roadmap مشخص‌اند. `package-lock.json` مرجع نسخه‌های دقیق است.

```text
src/app/                 مسیرها، layout، health و توکن‌های طراحی
src/components/          پنل، تم، اتاق دمو و تختهٔ محلی
src/modules/rooms/       سیاست دسترسی سازمان و اتاق با آزمون منفی
src/modules/media/       grants، adapter server-only و تنظیمات کیفیت
src/lib/                 دادهٔ نمونه و ابزار نمایش
tests/e2e/               بررسی رفتاری دسکتاپ و موبایل
docs/                    هدف، طراحی، معماری، امنیت و تصمیم‌ها
.github/                 CI و بررسی به‌روزرسانی وابستگی‌ها
```

## زیرساخت توسعه

Docker Desktop با Linux containers باید اجرا باشد. برای نسخهٔ عملیاتی رسانه، Linux، دامنه، TLS، TURN و پهنای باند واقعی لازم است؛ Laragon تنها محیط توسعهٔ سورس است.

```powershell
Copy-Item .env.example .env.local
docker compose config --quiet
docker compose up -d
```

compose سرویس‌های PostgreSQL، Redis و LiveKit را فقط روی loopback منتشر می‌کند. رمزها صرفاً توسعه‌ای‌اند. LiveKit روی `ws://localhost:7880` و با devkey/secret آماده می‌شود؛ هیچ endpoint عمومی join در این نسخه وجود ندارد. برای آزمایش از دستگاه دیگر باید تنظیم آدرس/ICE و امنیت بازبینی شود. Egress، S3 و TURN production در این compose وجود ندارند. اجرای خود compose در محیط اولیه تأیید نشده، چون Docker daemon خاموش بود؛ syntax و وجود tag تصاویر بررسی شده‌اند.

## بررسی کیفیت

```powershell
npm run check
npm run build
npm run test:e2e
npm audit
```

روی Windows، آزمون مرورگر به‌طور پیش‌فرض از Edge نصب‌شده استفاده می‌کند. روی Linux/macOS ابتدا `npx playwright install chromium` را اجرا کنید. `PLAYWRIGHT_CHANNEL` را می‌توان برای استفاده از Chrome/Edge تنظیم کرد. تست E2E به production build نیاز دارد و سرور را خودکار اجرا می‌کند؛ CI همهٔ مراحل را اجرا می‌کند. اگر port 3000 اشغال است، قبل از آزمون مطمئن شوید سرور همیار روی آن اجراست.

## اسناد مرجع

- [قواعد توسعه](AGENTS.md)
- [هدف و دامنهٔ محصول](docs/PRODUCT.md)
- [معماری و دلایل انتخاب فناوری](docs/ARCHITECTURE.md)
- [سیستم طراحی](docs/DESIGN_SYSTEM.md)
- [امنیت و مدل تهدید](docs/SECURITY.md)
- [جریان ضبط میزبان](docs/RECORDING.md)
- [نقشهٔ اجرا](docs/ROADMAP.md)
- [تصمیم معماری نخست](docs/adr/0001-platform-foundation.md)

رسانه با WebRTC و LiveKit SFU مستقل از سرور پنل عبور خواهد کرد. سوپروایزر در محدودهٔ سازمان خودش کنترل دارد. رمزنگاری انتقال با E2EE فرق دارد؛ حالت E2EE و ضبط سمت سرور نیازمند تصمیم مستقل‌اند. هیچ ادعای نفوذناپذیری مطلق یا ظرفیت اندازه‌گیری‌نشده نداریم.
