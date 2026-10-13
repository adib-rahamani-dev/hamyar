# hamyar | همیار

پایهٔ پلتفرم کلاس و جلسهٔ آنلاین چندسازمانی برای مدارس، شرکت‌ها و افراد؛ با رابط فارسی RTL، تم سبز روشن/تیره و معماری مستقل رسانه.

**وضعیت: حساب، سازمان و اتاق پایدار؛ محصول کامل هنوز آماده نیست.** Better Auth، MFA، PostgreSQL، مرز سازمانی، دعوت، اعضا، اتاق و مرکز نظارت خصوصی پیاده و آزموده‌اند. Neon Free و کلید نشست روی Vercel تنظیم شده‌اند؛ ثبت‌نام/ورود با رمز موقتاً بدون تأیید ایمیل فعال است؛ بازیابی بدون فرستنده و پذیرش دعوت با ایمیل تأییدنشده غیرفعال‌اند. رسانهٔ چندنفره، تخته/چت مشترک و ضبط هنوز متصل نیستند. دمو از انتشار عمومی خارج شده است. وضعیت دقیق در [نقشهٔ اجرا](docs/ROADMAP.md).

## اجرا

Node.js 22.13+ در شاخهٔ 22 یا Node.js 24/26؛ برای CI و استقرار، Node.js 22 LTS انتخاب اولیه است.

```powershell
npm ci
npm run dev
```

[پنل نمونه](http://localhost:3000)، [اتاق نمونه](http://localhost:3000/rooms/demo) و [liveness](http://localhost:3000/api/health). دمو برای اجرا نیاز به env یا Docker ندارد. health فقط پاسخ‌گویی برنامه را بررسی می‌کند و readiness سرویس‌ها نیست.

## فناوری و ساختار

رابط گلس در دو تم با موشن کوتاه، نور زمینهٔ آرام و واکنش کم‌دامنه به صدای میکروفون. دکمهٔ جلوه‌ها حرکت‌ها را خاموش می‌کند و `prefers-reduced-motion` خودکار رعایت می‌شود. برای امتحان دستگاه‌ها در اتاق روی دوربین/میکروفون کلیک کنید؛ هنگام خروج، trackها بسته می‌شوند. این قابلیت به معنی اتصال به کاربران دیگر نیست.

Next.js App Router، React، TypeScript strict، LiveKit SDK، Drizzle، Better Auth، pg، CSS tokens، Vazirmatn محلی و Lucide نصب‌شده‌اند. Redis/BullMQ، Yjs و Egress/S3 مراحل بعدند. `package-lock.json` مرجع نسخه‌های دقیق است.

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
# فقط اگر .env.local از قبل وجود ندارد:
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
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

نسخهٔ عمومی دیگر دادهٔ نمونه نمایش نمی‌دهد: ورودی به `/workspace` می‌رود و `/demo` و `/rooms/demo` در production/Vercel برابر 404 هستند. رابط قدیمی تنها برای regression محلی با `NODE_ENV=development` و `HAMYAR_LOCAL_DEMOS=1` اجرا می‌شود. `npm run test:e2e` رابط محلی و `npm run test:public:e2e` مرز production را آزمون می‌کنند. دیتابیس فعال به معنی آماده‌بودن رسانه یا signup عمومی نیست؛ [ADR 0004](docs/adr/0004-public-entry-and-managed-postgres.md) وضعیت را توضیح می‌دهد.

برش حساب و سازمان واقعی در `/account/sign-in`، `/account/security` و `/workspace` ساخته شده است: ثبت‌نام/verification/reset، نشست DB، MFA، ساخت/انتخاب سازمان، اعضا، اتاق پایدار و دعوت محدود. روی PostgreSQL با role غیرمالک آزموده می‌شود. در استقرار فاقد env معتبر فعال نیست؛ [راهنمای هویت](docs/IDENTITY_SETUP.md) تنظیمات و آزمون‌ها را توضیح می‌دهد.

پنل‌های مدیریت در `/supervisor`، `/support`، `/members` و `/settings` مسیر مستقل دارند. `/api/status` مشخصات عمومی واقعی اجرای وب را می‌دهد؛ ظرفیت رسانه و دادهٔ میزبان اتاق هنوز متصل نیستند. پشتیبانی فعلاً پیش‌نویس محلی با ذخیره/حذف و دانلود است و ارسال سروری ندارد.

- [قواعد توسعه](AGENTS.md)
- [هدف و دامنهٔ محصول](docs/PRODUCT.md)
- [معماری و دلایل انتخاب فناوری](docs/ARCHITECTURE.md)
- [سیستم طراحی](docs/DESIGN_SYSTEM.md)
- [امنیت و مدل تهدید](docs/SECURITY.md)
- [جریان ضبط میزبان](docs/RECORDING.md)
- [نقشهٔ اجرا](docs/ROADMAP.md)
- [پرامپت جامع تکمیل تا نسخهٔ قابل استفاده](docs/BUILD_TO_PRODUCTION_PROMPT.fa.md)
- [مرز وضعیت عمومی و پیش‌نویس پشتیبانی](docs/adr/0002-public-status-and-support-drafts.md)
- [هویت واقعی، MFA و مرز سازمان](docs/adr/0003-identity-and-tenant-boundary.md)
- [تصمیم معماری نخست](docs/adr/0001-platform-foundation.md)

رسانه با WebRTC و LiveKit SFU مستقل از سرور پنل عبور خواهد کرد. سوپروایزر در محدودهٔ سازمان خودش کنترل دارد. رمزنگاری انتقال با E2EE فرق دارد؛ حالت E2EE و ضبط سمت سرور نیازمند تصمیم مستقل‌اند. هیچ ادعای نفوذناپذیری مطلق یا ظرفیت اندازه‌گیری‌نشده نداریم.

## اجرا روی سرور خودت

ورسل محیط آزمایش فعلی است. [راهنمای خودمیزبانی و آمادگی شبکهٔ داخلی](docs/SELF_HOSTING.md) و [ADR 0006](docs/adr/0006-portable-self-hosting.md) مسیر جاری‌اند. Dockerfile وب مستقل و migration جدا، Compose خصوصی PostgreSQL و template رسانه اضافه شدند؛ اجرا روی VPS، اتصال کلاس چندنفره و ضبط هنوز انجام نشده‌اند. LiveKit Cloud شرط کارکرد محصول نیست؛ کلید رسانه می‌تواند از سرور خود همیار باشد. برای زمان قطعی، image، داده، فایل و DNS/TLS داخلی باید پیشاپیش آماده و آزموده شوند.
