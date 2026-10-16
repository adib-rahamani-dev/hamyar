# اجرای همیار روی سرور خودت؛ حالت عادی و داخلی

یک release، یک schema و دو پروفایل runtime داریم: `HAMYAR_DEPLOYMENT_MODE=normal|domestic`. انتخاب domestic فقط میزبان‌های allowlist را می‌پذیرد؛ داده را منتقل نمی‌کند و آزمون قطع اینترنت را جایگزین نمی‌کند. محصول به حساب Cloud رسانه یا realtime وابسته نیست. ورسل فعلاً وب/API را برای آزمایش اجرا می‌کند و دیتابیس آزمایش Neon است. برای ایران، PostgreSQL خودتان جای آن قرار می‌گیرد.

[وضعیت جاری](CURRENT_RELEASE.md)، [راهنمای سورس](CODE_GUIDE.fa.md) و [ADR 0008](adr/0008-persisted-classroom-and-owned-media.md) را هم بخوانید. ضبط سروری، فایل خصوصی و failover هنوز ساخته نشده‌اند؛ قالب نصب به معنی نصب/آزمون VPS نیست.

## چیزهایی که پیش از قطعی باید آماده باشند

Linux و Docker مناسب معماری مقصد، imageهای همان release، سورس، دامنه/DNS داخلی، TLS معتبر روی گوشی، backup رمزنگاری‌شدهٔ داده و کلیدهای خصوصی. شروع برنامه روی سرور جداشده نباید به npm install، registry، پنل Cloud یا صدور آنلاین گواهی خارجی وابسته باشد. برای نصب اولیه، registry و نصب بسته لازم است؛ image نهایی پس از ساخته‌شدن در startup وابستگی دانلود نمی‌کند.

یک مقصد مرجع نوشتن داشته باشید. دو DB مستقل همزمان بدون replication طراحی‌شده ننویسند. انتقال اولیه: توقف نوشتن، backup خصوصی، restore، کنترل تعداد/مالکیت رکورد، RLS و نقش runtime، سپس تغییر مسیر کاربران. این پروژه همگام‌سازی Neon با VPS یا failover خودکار ندارد؛ پس از قطع ممکن است دادهٔ منتقل‌نشده در دسترس نباشد.

## ساخت release روی Linux دارای Docker

از ریشهٔ repository، پس از `npm run check` و آزمون DB/مرورگر:

```bash
docker build --target runtime -t hamyar-web:RELEASE .
docker build --target migration -t hamyar-migration:RELEASE .
docker build --target gateway -t hamyar-gateway:RELEASE .
# تصاویر زیر را پیش از جداسازی شبکه آماده و بررسی کنید:
docker pull postgres:17.6-alpine
docker pull livekit/livekit-server:v1.13.9
```

`RELEASE` شناسهٔ یک release مشترک است؛ روی معماری مقصد بسازید. نسخهٔ Node در Dockerfile مشخص است؛ image و digest را پس از بررسی نگه دارید. خروجی standalone ساخته‌شده در Windows را image Linux حساب نکنید. موتور Docker این دستگاه در دسترس نیست؛ اجرای container Linux هنوز معیار باز پذیرش است. SFU واقعی loopback با دو مرورگر روی Windows آزموده می‌شود؛ CPU capacity monitor این نسخه در Windows پشتیبانی ندارد و برای ظرفیت‌سنجی استفاده نشده است.

پس از commit سورس بررسی‌شده و وجود imageها، این دستور هیچ imageای pull نمی‌کند:

```bash
npm run release:offline -- hamyar-web:RELEASE hamyar-migration:RELEASE hamyar-gateway:RELEASE postgres:17.6-alpine livekit/livekit-server:v1.13.9
```

خروجی در `.artifacts/offline-COMMIT/` شامل `source.tar`، `images.tar` و manifest با SHA256/شناسهٔ image است. env، private config و backup داخلش نیستند. اگر proxy یا worker جدا دارید image آن‌ها را هم اضافه کنید؛ proxy نصب‌شده روی میزبان و گواهی TLS باید پیشاپیش آماده باشند. checksum را بعد از انتقال کنترل و با `docker image load -i images.tar` بارگذاری کنید.

## فایل‌های خصوصی مقصد

در `infra/self-host/private` با دسترسی محدود فایل بسازید. templateها را به فایل تازه کپی و همهٔ placeholderها را جایگزین کنید؛ فایل خصوصی موجود را بازنویسی نکنید:

| template                | مقصد خصوصی                                             | نکته                                             |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `runtime.env.example`   | `private/runtime.env`                                  | وب، URL معتبر، کلید نشست و role فقط app          |
| `migration.env.example` | `private/migration.env`                                | schema role فقط عملیات، هرگز در وب               |
| `gateway.env.example`   | `private/gateway.env`                                  | app role با DB روی loopback:55432، کلید همان SFU |
| `livekit.yaml.example`  | `private/livekit.yaml`                                 | IP قابل دسترس، کلید خصوصی، STUN/TURN داخلی       |
| TLS خودتان              | `private/tls/fullchain.pem`, `private/tls/privkey.pem` | پوشش دامنهٔ TURN و رسانه/وب مطابق proxy          |
| `.env.example`          | `.env` همان پوشه                                       | tag تصویرها، بدون رمز                            |

سه فایل `bootstrap-password.txt`، `schema-password.txt` و `app-password.txt` داخل private بسازید؛ رمز مستقل قوی حداقل ۳۲ نویسه، خارج چت/Git. رمز roleها باید با URL env متناظر یکسان باشد؛ رمز URL را percent-encode کنید. bootstrap تنها روی volume تازه نقش‌ها را می‌سازد؛ volume موجود را برای رفع خطا حذف نکنید. bootstrap مدیریتی فقط در PG است؛ schema/app بدون bypass هستند. مهاجرت خودکار هنگام شروع وب نداریم.

حالت normal می‌تواند روی سرور معمولی هم با همین خدمات خودمیزبان اجرا شود. برای داخلی mode را در runtime.env و gateway.env هر دو domestic کنید؛ allowlist وب شامل سرویس‌های واقعی خودش و allowlist gateway شامل DB خودش باشد. نمونهٔ runtime:

```dotenv
HAMYAR_DEPLOYMENT_MODE=domestic
HAMYAR_DOMESTIC_HOSTS=postgres,localhost,127.0.0.1,media.YOUR-DOMAIN,smtp.YOUR-DOMAIN
AUTH_MAIL_TRANSPORT=disabled
RESEND_API_KEY=
```

نام‌های واقعی DB، SMTP و LIVEKIT_URL باید در allowlist باشند؛ URL/دامنهٔ خارجی تأییدنشده پذیرفته نیست. این allowlist اثبات موقعیت IP نیست. اگر SMTP دارید `AUTH_MAIL_TRANSPORT=smtp` و HOST/PORT465یا587/USER/PASSWORD/FROM را تنظیم کنید. TLS و certificate verification روشن‌اند. بدون فرستنده، حالت موقت `AUTH_EMAIL_VERIFICATION_REQUIRED=false` برای ورود با رمز ممکن است؛ بازیابی و دعوت ایمیلی تأییدنشده فعال نمی‌شوند. لینک اتاق همچنان با حساب معتبر قابل استفاده است.

## اجرای وب و دیتابیس

از ریشهٔ repository:

```bash
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml config --quiet
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml up -d --pull never postgres
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml --profile operations run --rm --pull never migrate
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml up -d --pull never web
```

PG روی شبکهٔ داخلی container و `127.0.0.1:55432` میزبان است؛ loopback برای gateway در host network لازم است. وب روی `127.0.0.1:3000`. هیچ‌کدام نباید raw در اینترنت باز شوند. health endpoint فقط liveness است؛ نشست/ورود و query مجاز readiness عملیاتی را می‌سنجند. schema/app/bootstrap credential مستقل‌اند. DB روی ماشین دیگر TLS معتبر لازم دارد.

## اجرای رسانه و دروازه

پروفایل `media` برای یک میزبان Linux با host network است. `livekit.yaml` باید API signaling را روی loopback نگه دارد و IP/node/STUN و certificateهای TURN با مقصد واقعی سازگار باشند. `LIVEKIT_URL=wss://media.YOUR-DOMAIN` به gateway پشت TLS اشاره دارد، نه raw SFU. API key/secret در وب، gateway و SFU یکسان و خصوصی است. `HAMYAR_MEDIA_GATEWAY=enabled` تنها وقتی مسیر واقعاً از gateway می‌گذرد.

```bash
docker compose --env-file infra/self-host/.env -f infra/self-host/compose.yaml --profile media up -d --pull never media gateway
```

قالب `nginx.conf.example` در http context میزبان قرار می‌گیرد؛ دامنه و certificate را جایگزین کنید و قبل از reload پیکربندی را با nginx بررسی کنید. وب443→3000 و media443→8090. log queryهای signaling خاموش است. پورت **7880**، PostgreSQL و هر API/metrics خام خصوصی بمانند؛ دورزدن gateway مدل ban/reconnect را باطل می‌کند.

رسانهٔ رمزنگاری‌شده به 7881/TCP و بازهٔ UDP50000–60000 و TURN3478/UDP و5349/TCP نیاز دارد؛ قواعد را مطابق IP و پیکربندی واقعی محدود کنید. TURN با TLS مستقیم certificate محلی دارد. بعضی شبکه‌ها فقط443 را عبور می‌دهند؛ TURN443 مشترک با وب به IP جدا یا TLS/L4 multiplexing درست نیاز دارد و در این template ساخته نشده است. فقط تغییر عدد پورت کافی نیست. Redis برای تک‌گره اجباری نیست؛ چندگره/HA طراحی و آزمون جدا می‌خواهد.

gateway امضا/Origin/نشست/عضویت/ban/مجوز را روی اتصال و هر پنج ثانیه بررسی می‌کند و در لغو، حذف participant را از SFU می‌خواهد. اگر DB یا API خصوصی قطع باشد وضعیت را در پایش مدیریت کنید؛ قطع رسانهٔ آنی تضمین نیست. از روی health صرف ادعای آماده‌بودن تماس نکنید. سقف۴۰ participant در قالب SFU یک limit اپراتور است و ظرفیت تضمین‌شدهٔ سخت‌افزار نیست.

## آزمون پذیرش روی مقصد

دو حساب و دو دستگاه از دو شبکهٔ واقعی: ثبت‌نام/ورود، مجموعه و اتاق، چت/تخته، انتشار/دریافت صدا و تصویر، screen share مرورگر پشتیبانی‌شده، TURN، قطع کوتاه و reconnect، لغو مجوز/ban و رد توکن قبلی، پایان جلسه، توقف دستگاه در خروج، برند و تیکت را بررسی کنید. load test باید ناشر، subscriber، bitrate، TURN و ضبط آینده را جدا حساب کند.

برای آزمون استقلال، egress بین‌المللی را در شبکهٔ آزمایش ببندید و containerها/مرورگر را سرد restart کنید. DNS و TLS روی گوشی، SMTP در صورت فعال‌بودن، backup/restore و راه‌اندازی با `--pull never` را کنترل کنید. warm cache کافی نیست؛ هیچ ادعای «آمادهٔ اینترنت ملی» پیش از این تمرین ثبت نشود. ضبط/بازپخش و همگام‌سازی داده هنوز تکمیل نشده‌اند و مانع فروش نسخهٔ کامل با SLA هستند.

## اجرای محلی از سورس

`npm ci`، تنظیم env محلی با DB غیرمالک، `npm run db:migrate` با اتصال schema مستقل، `npm run dev` برای وب و `npm run build:gateway && npm run start:gateway` برای دروازه. credential نمونه را عمومی نکنید و SFU dev را در اینترنت نگذارید. برای آزمون مستقل خروجی وب: `npm run build:self-host` و `npm run test:standalone:e2e` با DB جداگانهٔ `_test`.

منابع تنظیمات: [LiveKit self-hosting](https://docs.livekit.io/transport/self-hosting/deployment/)، [config نسخهٔ1.13.9](https://github.com/livekit/livekit/blob/v1.13.9/config-sample.yaml)، [Nodemailer SMTP](https://nodemailer.com/smtp). متن‌بازبودن ابزار، نیاز به عملیات شبکه/TLS و آزمایش واقعی را حذف نمی‌کند.
