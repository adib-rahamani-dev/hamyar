# hamyar | همیار

کلاس و جلسهٔ آنلاین چندسازمانی برای مدرسه، شرکت و شخص؛ فارسی/RTL، دو تم و رابط ساده با گلس محدود. یک سورس برای حالت عادی و زیرساخت داخلی، بدون الزام حساب Cloud رسانه یا realtime.

**وضعیت جاری:** حساب/سازمان/اتاق واقعی، چت و تختهٔ مشترک ذخیره‌شده، دعوت اتاق محدود، اجازه/اخراج، تیکت و برند مجموعه ساخته شده‌اند. دریافت/انتشار رسانه با SFU خودمیزبان و دو مرورگر محلی آزموده شده است. نسخهٔ عمومی ورسل وب/API را اجرا می‌کند و هنوز مقصد عمومی SFU/TURN ندارد. ضبط سروری، فایل خصوصی، مدل آموزشی کامل، ظرفیت‌سنجی و پذیرش VPS/اینترنت داخلی بازند؛ این نسخه هنوز محصول کامل دارای SLA نیست.

[نسخهٔ آزمایشی عمومی](https://hamyar-chi.vercel.app/workspace) · [وضعیت دقیق و راه تست](docs/CURRENT_RELEASE.md) · [نقشهٔ اجرا](docs/ROADMAP.md)

## خواندن سورس

از [راهنمای فارسی بخش‌های سورس](docs/CODE_GUIDE.fa.md) شروع کنید؛ مسیر هر ماژول، جریان مرورگر→API→DB، امنیت سازمان، چت/تخته، دعوت و رسانه را توضیح می‌دهد. قبل از تغییر PRODUCT، ARCHITECTURE، DESIGN_SYSTEM و SECURITY را بخوانید. تصمیم تازهٔ معماری ADR می‌خواهد.

## اجرا و بررسی

Node.js 22.13+ در شاخهٔ22 یا24/26، با lockfile همین release:

```bash
npm ci
# env محلی موجود را بازنویسی نکنید؛ .env.example فقط قالب است.
# PostgreSQL واقعی + نقش migration مستقل و app غیرمالک لازم‌اند.
npm run db:migrate
npm run dev
npm run check
npm run build
```

صفحهٔ اصلی در `/` معرفی نسخهٔ آزمایشی است؛ `/device-check` برای بررسی خصوصی دوربین، میکروفون و صدای خروجی، بدون ورود به حساب، در دسترس است. انتخاب ورودی در همان تب به اتصال اتاق منتقل می‌شود؛ هیچ بسته یا سرویس خارجی تازه‌ای لازم نیست.

مدیریت در `/workspace`، اتاق در `/rooms/UUID`، نظارت `/supervisor`، برند `/settings` و تیکت `/support`. شروع اتاق و لینک دعوت، گوشی دوم را وارد می‌کند. polling چت/تخته هر۸ثانیه است. رسانه فقط پس از کلیک اتصال و با سرور واقعی آماده می‌شود. health فقط liveness است. ثبت‌نام موقت بدون تأیید ایمیل مالکیت ایمیل را اثبات نمی‌کند؛ بازیابی بدون SMTP/فرستنده غیرفعال است.

```bash
# با TEST_DATABASE_URL و TEST_MIGRATION_DATABASE_URL در DB مستقل _test:
npm run test:integration
npm run test:signup:e2e
npm run test:public:e2e
npm run build:gateway
npm run build:self-host
npm run test:standalone:e2e
```

Playwright روی Windows از Edge نصب‌شده استفاده می‌کند؛ Linux/macOS به نصب Chromium آزمون نیاز دارند. `npm run test:e2e` فقط regression نمونهٔ محلی توسعه است؛ روی production/Vercel نمونه‌ها404 هستند. هیچ دادهٔ نمونه/حساب آزمون به تولید seed نمی‌شود.

## دو حالت و اجرای مستقل

[SELF_HOSTING](docs/SELF_HOSTING.md) ساخت سه image وب/migration/gateway، PG و SFU/TURN، TLS proxy، کلیدهای جدا و انتقال داده را توضیح می‌دهد. `HAMYAR_DEPLOYMENT_MODE=normal|domestic` یک release را با تنظیمات متفاوت اجرا می‌کند؛ انتقال خودکار داده و failover نیست. [ADR0008](docs/adr/0008-persisted-classroom-and-owned-media.md) دلیل انتخاب را ثبت می‌کند.

```bash
# بعد از ساخت و بررسی imageهای Linux و commit سورس؛ این دستور pull نمی‌کند:
npm run release:offline -- hamyar-web:RELEASE hamyar-migration:RELEASE hamyar-gateway:RELEASE postgres:17.6-alpine livekit/livekit-server:v1.13.9
```

archive سورس commit، imageهای موجود و checksum در .artifacts است؛ secret، TLS خصوصی و backup جداگانه و امن منتقل می‌شوند. قبل از قطعی باید داده/DNS/TLS/image آماده و شروع سرد با egress بین‌المللی بسته آزموده شود. Docker daemon این دستگاه در دسترس نیست؛ صحت Compose جای آزمون container/VPS واقعی را نمی‌گیرد.

## ساختار و فناوری

`src/app` مسیر و API؛ `src/components` نمایش؛ `src/modules` منطق دامنه؛ `migrations` schema/RLS؛ `scripts` عملیات؛ `infra/self-host` نصب؛ `tests` رفتار واقعی؛ `docs` قرارداد و توضیح. Next.js، React، TypeScript strict، PostgreSQL/Drizzle، Better Auth، LiveKit، ws، SMTP/Nodemailer، CSS tokens، Lucide و Vazirmatn محلی. Redis/Yjs/Egress برای نیازهای بعدی هستند؛ در runtime تک‌گرهٔ فعلی ضروری نیستند.

secret، env خصوصی، ضبط، اطلاعات دانش‌آموز و artifact آزمون وارد Git نشوند. org/role تنها از نشست معتبر، مجوز deny-default، SFU مستقل از وب، خاموش‌کردن دستگاه با رضایت/اقدام مالک دستگاه و بدون ادعای نفوذناپذیری یا ظرفیت خیالی.
