# راه‌اندازی حساب و سازمان واقعی

این برش در `/account/sign-in`، `/account/security`، `/workspace` و `/supervisor` اجرا می‌شود. ورودی عمومی به فضای مجموعه می‌رود؛ دمو در production/Vercel نمایش داده نمی‌شود. اتاق و اعضا از اطلاعات همان سازمان خوانده می‌شوند.

## تنظیمات لازم

| نام                    | کاربرد                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| DATABASE_URL           | اتصال runtime با نقش غیرمالک و بدون bypass؛ PostgreSQL واقعی            |
| MIGRATION_DATABASE_URL | اتصال جداگانهٔ مالک schema برای migration؛ برای runtime استفاده نمی‌شود |
| BETTER_AUTH_URL        | origin دقیق برنامه؛ HTTPS، یا loopback برای توسعه                       |
| BETTER_AUTH_SECRET     | کلید خصوصی پرآنتروپیِ تنظیم‌شده توسط مسئول زیرساخت؛ حداقل 32 نویسه      |
| RESEND_API_KEY         | کلید سرویس ایمیل واقعی                                                  |
| AUTH_EMAIL_FROM        | فرستنده از دامنهٔ تأییدشده در Resend                                    |

مقادیر محرمانه را در چت، Git یا خروجی فرمان قرار ندهید. فایل `.env.local` موجود را با template بازنویسی نکنید؛ فقط کلیدهای لازم را اضافه کنید. template credentialهای توسعهٔ localhost دارد و برای production مناسب نیست. کلید نشست و رمز نقش production با اجازهٔ صریح کاربر ساخته و در Vercel محرمانه ثبت شدند؛ فایل تنظیم اپراتور در `.vercel` از Git و upload کنار گذاشته می‌شود.

## پایگاه داده

مالک migration باید مالک schema باشد و اجازهٔ DDL داشته باشد. نقش runtime به نام `hamyar_app` با credential خصوصی جدا ایجاد شود: LOGIN، NOSUPERUSER، NOCREATEDB، NOCREATEROLE، NOBYPASSRLS؛ عضو نقش مالک نباشد. برای production، schema یا database اختصاصی همیار به کار ببرید.

با اتصال migration:

```powershell
npm run db:migrate
```

پس از ایجاد نقش runtime، `scripts/grant-runtime.sql` را با همان مالک schema در SQL editor/psql اجرا کنید. این فایل credential نمی‌سازد. migrationها نسخه‌دار، checksumدار، تراکنشی و دارای advisory lock هستند؛ migration اعمال‌شده را ویرایش نکنید. schemaهای Drizzle در `src/modules/identity/schema.ts` و `src/modules/tenancy/schema.ts` هستند؛ policyهای RLS در SQL نگهداری می‌شوند.

اتصال provider باید TLS با certificate verification داشته باشد؛ `rejectUnauthorized:false` اضافه نکنید. runtime حداکثر 5 اتصال در هر instance دارد؛ برای serverless از اتصال pooler مناسب provider استفاده کنید. pooler باید transaction و SET LOCAL را پشتیبانی کند. role، TLS، grants و RLS را پیش از دادهٔ واقعی بررسی کنید.

## توسعه و آزمون

compose برای PostgreSQL 17 تعریف شده است. SQL bootstrap توسعه، role جداگانهٔ runtime می‌سازد و فقط روی volume تازه اجرا می‌شود. برای volume قدیمی، bootstrap/grants را صریح بررسی و اعمال کنید؛ حذف volume خودکار انجام ندهید.

```powershell
npm run check
npm run build
npm run test:e2e
```

آزمون هویت به PostgreSQL جدا نیاز دارد؛ نام database باید به `_test` ختم شود. `TEST_DATABASE_URL` اتصال app و `TEST_MIGRATION_DATABASE_URL` اتصال مالک همان database هستند. این متغیرها را فقط در محیط آزمون تنظیم کنید؛ اسکریپت fallback به DB واقعی ندارد.

```powershell
npm run test:integration
npm run test:identity:e2e
```

E2E هویت روی port 3100 اجرا می‌شود؛ دادهٔ مصنوعی `example.test` می‌سازد و از کلید fixture فقط برای همین سرور loopback استفاده می‌کند. هیچ ایمیل بیرونی در آزمون فرستاده نمی‌شود. verification/recovery در integration از خروجی callback حافظه‌ای آزمون گرفته می‌شوند؛ UI ورود، MFA و مدیریت روی PostgreSQL واقعی آزمایش می‌شوند. فایل‌های آزمون و تصویر در `.artifacts`/`test-results` از Git خارج‌اند.

### اجرای محلی بدون دامنه

با همان دو متغیر TEST_DATABASE_URL و TEST_MIGRATION_DATABASE_URL:

این دو اتصال را می‌توانید در فایل مستقل و Git-ignored به نام `.env.identity.local` قرار دهید. فرمان محلی این فایل را می‌خواند و `.env.local` موجود را بازنویسی نمی‌کند. برای محیط فعلی این فایل با credential عمومیِ fixture و اتصال cluster مستقل WSL آماده شده است؛ در محیط دیگری باید نشانی همان DB آزمون را تنظیم کنید.

```powershell
npm run local:identity
```

این فرمان Next dev را فقط روی `http://127.0.0.1:3100` اجرا می‌کند، از database جداگانهٔ `_test` استفاده می‌کند و کلید development fixture دارد. فقط دادهٔ مصنوعی و ایمیل با پسوند `.test` وارد کنید. در `/dev/mailbox` لینک تأیید/بازیابی در حافظهٔ محلی، با سقف 30 پیام و 15 دقیقه نگهداری دیده می‌شود؛ هیچ پیام اینترنتی ارسال نمی‌شود. صندوق تنها با development، loopback، database آزمون و flag صریح فعال است؛ روی Vercel یا production همیشه 404 است. کلیدهای شناخته‌شدهٔ fixture برای origin عمومی HTTPS پذیرفته نمی‌شوند. Next dev URLهای درخواست/توکن را در terminal log نمی‌کند.

این فرمان را از اینترنت با tunnel قابل دسترسی نکنید. پس از راه‌اندازی PostgreSQL واقعی production و ایمیل معتبر، از تنظیمات مجزا استفاده کنید. WSL ممکن است در حالت idle خاموش شود؛ هنگام استفاده باید distribution و PostgreSQL فعال بمانند. این محیط در 2026-10-13 روی cluster مستقل PostgreSQL 14 در WSL با app role غیرمالک آزموده شد؛ compose/CI نسخهٔ 17 دارند.

برای شروع مجدد cluster همین دستگاه، `wsl -d Ubuntu-22.04 -u root -- pg_ctlcluster 14 hamyar start` را اجرا کنید. port این cluster برابر 55432 است. اگر IP خروجی `wsl -d Ubuntu-22.04 -- hostname -I` تغییر کرد، فقط نشانی اتصال‌های `.env.identity.local` را اصلاح کنید. cluster دیگر WSL متعلق به این پروژه نیست؛ آن را متوقف یا بازنشانی نکنید.

## مسیر کاربر

۱. ثبت‌نام، دریافت و بازکردن ایمیل تأیید؛ بدون ایمیل تأییدشده ورود انجام نمی‌شود.
۲. ورود، فعال‌کردن TOTP از امنیت حساب، ورود دستی کلید در برنامهٔ تأییدکننده و تأیید کد؛ کدهای بازیابی را امن نگه دارید.
۳. ساخت مدرسه/شرکت/فضای شخصی و انتخاب مجموعهٔ فعال؛ مالک از session تعیین می‌شود.
۴. ساخت دعوت و تحویل لینک fragment به گیرنده؛ ارسال خودکار دعوت هنوز فعال نیست. گیرنده پس از ورود، لینک را دوباره باز کند.
۵. مدیریت نقش/تعلیق اعضای غیرمالک و لغو دعوت؛ policy در سرور و RLS اعمال می‌شود.
۶. لغو نشست از امنیت حساب یا خروج؛ نشست لغوشده در درخواست بعدی پذیرفته نمی‌شود.

## گزینهٔ رایگان برای آغاز

در بررسی 2026-10-13، [Neon Free](https://neon.com/pricing) برای هر پروژه 1 GB storage و 100 CU-hours compute دارد. [Resend Free](https://resend.com/pricing) تا 3,000 ایمیل در ماه با سقف 100 در روز دارد؛ دامنهٔ فرستنده باید تأیید شود. شرایط و سقف‌ها را هنگام ایجاد منبع دوباره بررسی کنید. Free تضمین ظرفیت یا پایداری production نیست. این سرویس‌ها سرور LiveKit/TURN/ضبط فراهم نمی‌کنند.

در بررسی اولیهٔ Vercel، resource یا env هویت موجود نبود. در ادامهٔ 2026-10-13 با اجازهٔ کاربر، Neon Free اختصاصی hamyar-production ایجاد شد؛ migrationها اعمال و نقش hamyar_app مستقل غیرمالک با اتصال pooled و TLS verify-full بررسی شد. DATABASE_URL و BETTER_AUTH_SECRET و BETTER_AUTH_URL در Vercel ثبت شدند. credential مالک از runtime حذف شد و تنها در تنظیم خصوصی اپراتور نگهداری می‌شود. دیتابیس تولید با fixture seed نشده است. [ADR 0004](adr/0004-public-entry-and-managed-postgres.md) جزئیات را ثبت می‌کند.

دامنهٔ ایمیل هنوز آماده نیست؛ کاربر ورود ایمیلی را حفظ و تهیهٔ دامنه را به بعد موکول کرد. نبود سرویس ایمیل signup/reset را در UI و سرور غیرفعال می‌کند و account ناقص ساخته نمی‌شود. LiveKit Cloud هنوز نیازمند حساب/پروژه و LIVEKIT_URL، LIVEKIT_API_KEY و LIVEKIT_API_SECRET واقعی در Vercel است. حذف دمو از انتشار عمومی به معنی تکمیل رسانه و ضبط نیست.

## محدودیت باقی‌مانده

پنل تا 100 عضو/دعوت را می‌خواند؛ pagination، انتقال مالکیت، دعوت خودکار ایمیلی، QR محلی MFA، تغییر نام/برند، مدل مدرسه/کلاس/enrollment و break-glass هنوز مرحلهٔ بعدند. MFA فعلی با ورود دستی کلید کار می‌کند. تیکت، رسانه، تختهٔ مشترک و ضبط همچنان آمادهٔ استفادهٔ واقعی نیستند.
