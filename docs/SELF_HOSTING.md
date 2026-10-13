# همیار روی سرور خودت، با آمادگی برای قطع اینترنت بین‌المللی

ورسل فعلاً محیط آزمایش است. مقصد مستقل می‌تواند سرور خارج یا VPS ایران باشد؛ سرویس Cloud رسانه اجباری نیست. برنامه، حساب‌ها و schema یک سورس دارند. هدف داخلی کامل: وب/API، PostgreSQL، SFU/TURN، Redis، تخته/چت، recorder، فایل‌ها، DNS و مسیر ورود همگی از داخل ایران قابل دسترس باشند.

**وضعیت این برش:** Dockerfile و Compose برای وب، حساب، MFA، سازمان و اتاق پایدار اضافه شدند. قالب رسانه و برنامهٔ انتقال آماده‌اند. کلاس چندنفره، Egress، storage ضبط، SMTP داخلی، همگام‌سازی دادهٔ دو سایت و failover خودکار هنوز ساخته/آزموده نشده‌اند. این فایل‌ها به معنی استقرار انجام‌شده روی VPS نیستند. [ADR 0006](adr/0006-portable-self-hosting.md).

راستی‌آزمایی محلی: `npm run check`، build عادی و build مستقل پاس شدند. Compose با فایل‌های fixture خصوصی و `config --quiet` اعتبارسنجی شد؛ syntax اسکریپت bootstrap نیز بررسی شد. خروجی standalone با PostgreSQL آزمون واقعی روی مرورگر موبایل و دسکتاپ، ثبت‌نام → MFA → مجموعه/اتاق → خروج → ورود مجدد را پاس کرد. موتور Docker این دستگاه در دسترس نبود؛ build/اجرای image لینوکس و VPS هنوز آزموده نشده‌اند. CI اجرای standalone را روی Linux تعریف می‌کند؛ این به‌تنهایی آزمون container نیست.

برای تکرار آزمون مستقل، متغیرهای `TEST_DATABASE_URL` و `TEST_MIGRATION_DATABASE_URL` باید به DB مستقل با پسوند `_test` اشاره کنند:

```bash
npm run build:self-host
npm run test:standalone:e2e
```

## سه محیط و مرز داده

| محیط         | محل اجرا                                           | کاربرد                                                      |
| ------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| تست فعلی     | Vercel + Neon                                      | آزمایش عمومی تا زمان فراهم‌شدن سرور                         |
| مستقل عادی   | Linux + PostgreSQL و رسانهٔ خودمیزبان              | اجرای اصلی بدون الزام حساب Cloud                            |
| آمادهٔ داخلی | همان release روی Linux ایران، با داده و فایل آماده | استمرار کار در صورت قطع دسترسی بین‌المللی پس از آزمون واقعی |

تغییر سرور صرفاً با تغییر آدرس URL دیتابیس داده‌ها را جابه‌جا نمی‌کند. یک سایت مرجع برای نوشتن تعیین شود؛ دو DB مستقل همزمان ننویسند. برای انتقال اولیه: freeze نوشتن، backup خصوصی، restore، کنترل تعداد/مالکیت رکوردها و RLS، سپس تغییر مسیر کاربران. replication و RPO/RTO مرحلهٔ بعدند؛ نباید به همگام‌سازی جادویی بعد از قطع دسترسی تکیه کرد. دادهٔ Neon فعلی در این تغییر منتقل نشده است.

## ساخت image وب و migration

روی Linux با Docker، در ریشهٔ repository و وقتی اینترنت یا registry داخلی آماده در دسترس است:

```bash
docker build --target runtime -t hamyar-web:RELEASE .
docker build --target migration -t hamyar-migration:RELEASE .
docker image save -o hamyar-RELEASE.tar hamyar-web:RELEASE hamyar-migration:RELEASE postgres:17.6-alpine
```

`RELEASE` را با شناسهٔ release مشترک جایگزین کنید. تصویر PostgreSQL باید قبلاً pull شده باشد. release را روی معماری مقصد بسازید؛ خروجی standalone ساخته‌شده در ویندوز را image لینوکس حساب نکنید. Dockerfile نسخهٔ Node مشخص دارد؛ پس از آزمون و اسکن image، digest ثابت نگه دارید. build نیازمند npm/registry است، ولی image نهایی برای شروع نصب وابستگی انجام نمی‌دهد. تصاویر رسانه و proxy نیز جداگانه pin، ذخیره و در ایران آماده شوند.

روی مقصد، فایل image و سورس همین release شامل `infra/self-host` را پیشاپیش منتقل و image را با `docker image load -i hamyar-RELEASE.tar` بارگذاری کنید. archive سورس باید بدون `.env`، `.vercel` و فایل‌های خصوصی باشد؛ backup/کلیدها از کانال خصوصی جدا منتقل شوند.

## تنظیم برش وب و دیتابیس

در `infra/self-host` پوشهٔ `private` با دسترسی محدود بسازید. templateها را تنها به فایل‌های تازه کپی کنید و موارد جایگزین را تکمیل کنید:

- `runtime.env.example` → `private/runtime.env`: URL برنامه، کلید نشست و credential فقط نقش runtime.
- `migration.env.example` → `private/migration.env`: اتصال نقش schema، فقط برای container عملیات.
- سه فایل `private/bootstrap-password.txt`، `private/schema-password.txt` و `private/app-password.txt`: رمزهای مستقل خصوصی حداقل 32 نویسه؛ آن‌ها را در چت، Git یا آرگومان فرمان قرار ندهید.
- `.env.example` → `.env` همان پوشه: tag دو image ساخته‌شده؛ این فایل انتخاب image است و رمز ندارد.

رمزهای role باید با URLهای env متناظر یکسان باشند؛ نویسه‌های ویژهٔ رمز داخل URL percent-encode شوند. init فقط روی volume اختصاصی تازه نقش‌ها را ایجاد می‌کند. نقش bootstrap مدیریتی تنها در PostgreSQL است؛ hamyar_schema و hamyar_app هر دو بدون superuser/bypass هستند. migration نقش schema دارد و وب به آن credential دسترسی ندارد. volume موجود را حذف یا bootstrap را به دیتابیس موجود اعمال نکنید.

از ریشهٔ repository:

```bash
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml config --quiet
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml up -d --pull never postgres
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml --profile operations run --rm --pull never migrate
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml up -d --pull never web
```

تولید نباید هنگام شروع خودکار migration بزند. backup معتبر و نتیجهٔ migration را قبل از روشن‌کردن وب بررسی کنید. PostgreSQL هیچ port عمومی ندارد و تنها شبکهٔ خصوصی containerها به آن دسترسی دارد. اگر DB روی ماشین دیگری است TLS و certificate verification الزامی‌اند. healthcheck وب فقط liveness است؛ readiness دیتابیس را با endpoint نشست و مسیر حساب بررسی کنید.

وب روی `127.0.0.1:3000` میزبان منتشر می‌شود. reverse proxy روی همان میزبان باید HTTPS معتبر، Host صحیح و headerهای forward قابل اعتماد داشته باشد؛ دسترسی HTTP خام را عمومی نکنید. origin در BETTER_AUTH_URL باید دقیقاً HTTPS آدرس مقصد باشد. تغییر دامنه یا کلید نشست می‌تواند ورود مجدد بخواهد. migration secret را به proxy یا وب ندهید. محدودیت منابع پس از اندازه‌گیری workload تعیین شود؛ این قالب ظرفیت کلاس را تضمین نمی‌کند.

## رسانهٔ خودمیزبان

`LIVEKIT_URL`، `LIVEKIT_API_KEY` و `LIVEKIT_API_SECRET` مربوط به سرور LiveKit خودت می‌شوند. ساخت پروژه در LiveKit Cloud شرط نیست. نصب سرور متن‌باز از [مسیر رسمی self-host](https://docs.livekit.io/transport/self-hosting/deployment/) امکان‌پذیر است.

قالب `infra/self-host/livekit.yaml.example` از تنظیمات رسمی شروع می‌کند: IP قابل دسترسِ مشخص، Redis خصوصی و STUN داخلی. آن را با IP/دامنه و secret واقعی به فایل خصوصی تبدیل کنید. تنظیم TURN با `external_tls` فقط پشت TLS terminator لایهٔ چهارِ درست کار می‌کند؛ HTTP reverse proxy کافی نیست. برای جای‌گیری signaling و TURN روی 443 مشترک، [generator رسمی VM](https://docs.livekit.io/transport/self-hosting/vm/) نقطهٔ شروع مناسب است؛ فایل‌های خروجی آن secret دارند و باید خارج Git باشند. آن generator دانلود و صدور گواهی خارجی انجام می‌دهد؛ قبل از قطعی آماده و روی محیط داخلی بررسی شود.

نسخهٔ سرور را بعد از آزمون SDK pin کنید. راهنمای بررسی قالب با [config-sample نسخهٔ 1.13.9](https://github.com/livekit/livekit/blob/v1.13.9/config-sample.yaml) خوانده شد؛ نسخهٔ dev فعلی compose ریشه جداست. `--dev` و devkey/secret برای سرور عمومی قابل استفاده نیستند. پورت‌های واقعی و قواعد firewall را بر اساس روش نصب انتخاب کنید؛ signaling/API خام، Redis و metrics نباید عمومی شوند. SFU از UDP/TCP و TURN خودت استفاده می‌کند؛ Vercel واسطهٔ ارسال رسانه نمی‌شود.

endpoint join هنوز ساخته نشده است. علاوه بر توکن کوتاه‌عمر و مجوزهای محدود، دروازهٔ reconnect باید عضویت/ban/انقضای grant را دوباره بررسی کند. self-host صرفاً با TTL توکن یا webhook اخراج فوری قطعی نمی‌دهد؛ محدودیت و معیار پذیرش در SECURITY و ROADMAP ثبت است. تا آزمون این مسیر، رسانه را آمادهٔ کاربران واقعی اعلام نکنید.

## ورود، ضبط و فایل‌ها

ورود با رمز و MFA روی هر میزبان از DB همان محیط استفاده می‌کند. حالت موقت فعلی `AUTH_EMAIL_VERIFICATION_REQUIRED=false` همچنان ایمیل را تأیید نمی‌کند؛ بازیابی رمز و پذیرش دعوت حساب تأییدنشده محدودند. مسیر ایمیل فعلی به Resend وصل می‌شود؛ adapter فرستندهٔ داخلی/SMTP و آزمون آن کار باقی‌مانده‌اند. در محیط داخلی نهایی هیچ جریان ضروری به OAuth یا سرویس ایمیل خارج وابسته نباشد.

ضبط هدف: Egress روی سرور خودت، storage خصوصی S3-compatible داخلی یا مقصد دیسک خصوصی با کنترل دسترسی، webhook معتبر و lifecycle قابل پیگیری. [راهنمای Egress](https://docs.livekit.io/transport/self-hosting/egress/) مرجع است؛ در این تغییر container ضبط یا ضبط موفقی ایجاد نشده است. منابع ضبط، retention، backup و انتقال فایل مستقل از دیتابیس مدیریت شوند.

## تمرین قطع دسترسی، قبل از نیاز واقعی

imageها، release، backup دیتابیس، فایل‌ها، DNS و زنجیرهٔ گواهی داخل ایران آماده باشند. صدور/تمدید گواهی در زمان قطعی و رفتار مرورگر با DNS، trust و OCSP آزموده شود؛ گواهی نامعتبر روی گوشی به رضایت دوربین/میکروفون لطمه می‌زند. دامنه یا مسیر DNS نباید تنها به پنل خارجی قابل دسترس تکیه کند. فونت و assets همیار محلی‌اند؛ CDN خارجی جدید اضافه نشود.

در شبکهٔ آزمون، egress بین‌المللی را مسدود کنید و دو دستگاه از شبکه‌های داخلی مختلف را وصل کنید. ثبت‌نام/ورود/MFA، مجوز سازمان، کلاس و TURN، reconnect و ban، چت/تخته، ضبط و بازپخش، restart بدون pull، backup/restore و DNS را بررسی کنید. warm-cache کافی نیست؛ restart سرد با registry خارجی غیرقابل دسترس هم آزموده شود. هیچ ادعای «کار می‌کند در اینترنت ملی» پیش از این تمرین ثبت نمی‌شود.
