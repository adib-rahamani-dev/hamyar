# نقشهٔ اجرا و وضعیت واقعی

## فاز صفر — پایهٔ فعلی

- [x] Git و origin و main و push
- [x] Next.js / React / TypeScript و lockfile
- [x] راهنمای پروژه، دامنه، معماری، امنیت، طراحی و ADR
- [x] پنل نمونهٔ فارسی responsive، تم روشن/تیره، اتاق نمونه و تختهٔ محلی
- [x] policy دسترسی tenant و نقش، grants محدود و آزمون منفی
- [x] adapter صدور توکن سمت سرور و تنظیمات adaptive/dynacast
- [x] compose توسعه برای PostgreSQL، Redis و LiveKit؛ نیازمند اجرای Docker
- [x] CI lint/typecheck/test/format/build و Dependabot

دمو حافظه‌ای است؛ دادهٔ واقعی، اتصال چندنفره، اشتراک صفحه، ضبط و تختهٔ مشترک ندارد. دوربین و میکروفون به‌صورت پیش‌نمایش واقعی محلی و با رضایت کاربر فعال‌اند؛ هیچ رسانه‌ای منتشر نمی‌شود. adapter توکن endpoint عمومی یا auth متصل ندارد. compose شامل Egress/TURN production نیست.

## گام فعلی — دستگاه‌ها و رابط گلس

- [x] پیش‌نمایش واقعی دوربین و میکروفون با اجازهٔ مرورگر
- [x] مدیریت مستقل دستگاه‌ها، خطای مجوز و قطع سخت‌افزار، لغو درخواست و پاک‌سازی هنگام خروج
- [x] نور گلس با واکنش به سطح صدای محلی، بدون ضبط/ارسال نمونه‌های صدا
- [x] جلوه‌های قابل خاموش‌کردن و رعایت reduced motion
- [x] قلم سازگار با دو تم و خروجی SVG با رنگ‌های واقعی
- [ ] انتخاب دستگاه و بررسی شبکه در صفحهٔ پیش از ورود
- [ ] اتصال پیش‌نمایش به نشست معتبر و کلاس چندنفره

## فاز یک — حساب و داده

- [ ] Better Auth، session، سازمان، invitation و MFA مدیران
- [ ] Drizzle schema/migrations، membership، مدرسه، کلاس، enrollment و room
- [ ] scoped repositories و composite FK، RLS و تست دو سازمان
- [ ] مدیریت اعضا/اتاق‌ها/برند با persistence و audit

معیار پذیرش: هیچ API با تغییر شناسه به دادهٔ سازمان دیگر دسترسی ندهد؛ revocation روی نشست‌های فعال اثر کند.

## فاز دو — اتاق واقعی

- [ ] prejoin device check، انتخاب دوربین و رضایت دستگاه
- [ ] join endpoint معتبر، LiveKit room، TURN/TLS و webhook
- [ ] لابی، publish grants زمان‌دار، hand raise، mute، remove، lock/end
- [ ] chat persisted و moderation؛ Yjs ACL، snapshot و resync
- [ ] reconnect UI و reauthorization، حالت فقط صدا
- [ ] supervisor console از دادهٔ واقعی

معیار پذیرش: کلاس چندنفره روی شبکه‌های واقعی و موبایل؛ خاموش‌کردن رسانه و پاک‌سازی در خروج؛ ban قابل دورزدن با reconnect نباشد.

## فاز سه — ضبط و گزارش

- [ ] Egress worker، private S3، idempotent state machine و webhook
- [ ] template فارسی شامل تخته/اشتراک صفحه، اعلان به همه
- [ ] player، مجوز بازپخش، retention، حضور و غیاب

معیار پذیرش: فایل واقعی پس از بستن مرورگر میزبان ادامه یابد، با اجازه بازپخش شود و با retention حذف شود.

## فاز چهار — production

- [ ] telemetry بدون PII، load/network tests و هزینهٔ پهنای باند
- [ ] CSP/HSTS، backup restore، incident runbook و آزمون نفوذ
- [ ] quotas، billing در صورت نیاز، SSO و domain سفارشی
- [ ] لندینگ معرفی پس از روشن‌شدن قابلیت‌های قابل ارائه

اولویت‌ها با اندازه‌گیری و نیاز مشتری تغییر می‌کنند؛ قابلیت AI و افزودن سرویس‌های بیشتر بعد از پایداری هسته.
