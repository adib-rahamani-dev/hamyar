# امنیت و مدل تهدید

هیچ سامانه‌ای نفوذناپذیری مطلق ندارد. هدف کنترل‌های چندلایه، کاهش سطح حمله، آزمون و پاسخ به حادثه است. این نسخه تنها برخی پایه‌ها را دارد؛ برای استفادهٔ واقعی نیازمند اجرای موارد roadmap است.

## دسترسی

نقش سازمان: owner، admin، supervisor، member. نقش اتاق: host، presenter، attendee. مدرس می‌تواند host اتاق‌های تخصیص‌یافته باشد؛ دانش‌آموز attendee است. مجوز نشر صوت، دوربین و صفحه جدا و با انقضا هستند.

سوپروایزر تمام اتاق‌های سازمان خودش را می‌بیند و کنترل می‌کند. مدیر پلتفرم مجوز جهانی ضمنی در JWT ندارد؛ دسترسی اضطراری با MFA، دلیل، scope، expiry و audit. full access به معنی دورزدن رضایت دستگاه نیست: remote mute مجاز؛ remote unmute درخواست به کاربر است.

توکن در server-only صادر می‌شود؛ `room` و identity سازمانی، TTL پنج دقیقه، publishSources محدود، roomAdmin=false. policy باید از رکوردهای server ساخته شود؛ کپی role یا tenantId از بدنهٔ درخواست ممنوع. انقضای توکن پایان مجوز نشست برقرارشده نیست؛ برای downgrade، expiry grant و اخراج باید permission update/participant removal انجام شود.

## تهدید و کنترل لازم

| تهدید              | کنترل                                                                               |
| ------------------ | ----------------------------------------------------------------------------------- |
| نشت میان مدارس     | scope از نشست، composite FK، query scoped، RLS و تست منفی                           |
| سرقت نشست          | HttpOnly/Secure/SameSite cookie، rotation، revoke، MFA مدیران                       |
| CSRF و origin جعلی | بررسی Origin برای mutation، سیاست CSRF کتابخانهٔ auth، allowlist دامنه              |
| XSS                | متن چت بدون HTML، encode خروجی، CSP مبتنی بر nonce، عدم ذخیره token در localStorage |
| جعل مجوز رسانه     | grants سمت سرور، TTL، ban/reconnect check، امضای webhook                            |
| حمله به چت/تخته    | limit payload/rate، ACL کانال، سقف سند و snapshot، moderation                       |
| فایل مخرب          | سقف حجم/type، اسکن بدافزار، private bucket، URL امضاشده                             |
| ضبط غیرمجاز        | ACL سمت سرور، اعلان ضبط، tenant ownership و audit، private storage                  |
| مصرف منابع         | quota سازمان/اتاق، rate limit توزیع‌شده، admission control برای Egress              |
| زنجیره تأمین       | lockfile، CI، Dependabot، audit و update بررسی‌شده                                  |

headerهای nosniff، frame denial، referrer و device permissions در نسخهٔ فعلی فعال‌اند. CSP و HSTS production بعد از تعیین HTTPS، دامنه‌های SFU، WebSocket و nonce پیاده می‌شوند؛ policy ناقص و شکننده را به نام امنیت فعال نمی‌کنیم.

## رمزنگاری و ضبط

HTTPS/WSS و DTLS-SRTP در انتقال، encryption at rest در storage. E2EE واقعی نیازمند توزیع و مدیریت کلید و پشتیبانی client است و در این نسخه وجود ندارد. recorder باید محتوا را decrypt کند تا ضبط کند؛ دادن کلید به recorder آن را به endpoint مورد اعتماد تبدیل می‌کند. حالت خصوصی E2EE در طراحی اولیه ضبط سمت سرور را غیرفعال می‌کند. UI باید این تفاوت را واضح نشان دهد.

## محدودیت revocation در LiveKit self-hosted

طبق [مستندات token](https://docs.livekit.io/frontends/reference/tokens-grants/)، حذف participant یا تغییر permission در self-hosted توکن قبلی را باطل نمی‌کند و SDK توکن reconnect تازه هم دریافت می‌کند. TTL کوتاه به‌تنهایی اخراج فوری و قطعی را تضمین نمی‌کند. قبل از production خودمیزبان باید دروازهٔ signaling با بررسی امضا، نشست، ban و cutoff توکن طراحی و آزموده شود، یا سرویس با revocation سمت SFU انتخاب شود. webhook حذف پس از ورود به‌تنهایی جلوگیری فوری از اتصال نیست. این دروازه در پایهٔ فعلی وجود ندارد؛ ban/reconnect تا آزمون واقعی قابل ادعا نیست.

## دادهٔ دانش‌آموز و audit

کمینه‌سازی داده، سیاست نگهداری چت/ضبط، export و حذف حساب، حذف backup طبق برنامه، بدون محتوای درس در telemetry. audit شامل actor، سازمان، اتاق، action، target، reason، correlationId و timestamp است. token، secret و محتوای خصوصی در log نباشد. webhook recording با امضای معتبر و deduplication در transaction پردازش شود.

## دریافت محلی دستگاه‌ها

`LocalCapture` فقط پس از کلیک کاربر `getUserMedia` را فراخوانی می‌کند؛ مجوز میکروفون و دوربین مستقل‌اند. خاموش‌کردن دستگاه به‌جای پنهان‌کردن UI، همهٔ trackهای آن را stop می‌کند. permission دیرهنگام پس از لغو یا خروج، بلافاصله بسته می‌شود. unmount و pagehide منابع را آزاد می‌کنند و قطع سخت‌افزار وضعیت را اصلاح می‌کند. Web Audio فقط سطح صدا را برای جلوهٔ محدود محاسبه می‌کند؛ هیچ اتصال به خروجی بلندگو، ضبط، ارسال، ذخیره یا telemetry صدا وجود ندارد. پاک‌سازی، خطای مجوز و خروج با دستگاه مصنوعی در آزمون‌ها پوشش داده شده‌اند. مجوز محلی دستگاه به معنی مجوز انتشار رسانه در اتاق نیست؛ کنترل publication در سرور همچنان لازم است.

## وضعیت عمومی و پیش‌نویس پشتیبانی

`/api/status` تنها allowlist اطلاعات عمومی وب را می‌دهد؛ credential، نام کامل متغیرهای محیطی، IP خصوصی، دادهٔ سازمان و مصرف کاربران ندارد. این endpoint جای احراز هویت مرکز نظارت عملیاتی نیست. ظرفیت نامعلوم null است و هویت میزبان کلاس تا اتصال repository همچنان نمونه باقی می‌ماند.

فرم پشتیبانی هیچ درخواست ثبت سروری یا ارسال پیام ندارد. ذخیرهٔ متن در مرورگر فقط با اقدام کاربر، با schema نسخه‌دار و سقف طول انجام می‌شود؛ حذف و دانلود قابل دسترس است. UI دربارهٔ دستگاه مشترک و پرهیز از اطلاعات حساس اطلاع می‌دهد. پیش از ثبت تیکت سروری، session، tenant scope، idempotency، origin/rate limit و persistence خصوصی لازم‌اند.

## هویت و سازمان — کنترل‌های پیاده‌شده

Better Auth، ایمیل تأییدشده، نشست DB، cookie HttpOnly/SameSite/Secure روی HTTPS و MFA با proof همان نشست پیاده و روی PostgreSQL آزموده شدند. cookie cache فعال نیست؛ خروج/revoke/reset نشست‌های مربوط را باطل می‌کنند. کلید TOTP و recovery فقط پس از اقدام کاربر در صفحهٔ امنیت نمایش داده می‌شوند و در localStorage یا telemetry ذخیره نمی‌شوند. ورود دستی TOTP فعلاً جای QR است.

Runtime غیرمالک و بدون bypass/superuser است؛ role ناامن رد می‌شود. جدول‌های سازمانی FORCE RLS و context تراکنشی دارند. org/role از session و membership تازه تعیین می‌شود. تعلیق/تغییر نقش روی درخواست بعدی اثر می‌کند؛ publication رسانهٔ برقرار هنوز وجود ندارد و revocation SFU حل نشده است. audit از app UPDATE/DELETE ندارد. invitation فقط hash نگه می‌دارد و token fragment به سرور در URL ارسال نمی‌شود.

API workspace Origin معتبر، JSON strict، payload حداکثر 8KB و 60 درخواست در دقیقه به‌ازای user با counter مشترک DB دارد. کتابخانه auth از rate limit پایگاه داده استفاده می‌کند؛ آستانه‌های پیش‌فرض آن باید در شبکهٔ واقعی و NAT مدرسه سنجیده شوند. logger کتابخانه خاموش است؛ endpointها خطای خام SQL یا credential برنمی‌گردانند. کلاس، چت، تخته، فایل، تیکت و ضبط هنوز تست tenant عملیاتی ندارند؛ این برش جای آزمون نفوذ مستقل production نیست.

## قبل از production

ورودی production دیگر نمونه را جایگزین حساب نمی‌کند. شش جدول سازمان/عضویت/دعوت/audit/اتاق/تخصیص با FORCE RLS محافظت می‌شوند. اعتبارنامهٔ مالک Neon در runtime وب قرار ندارد. پیش‌فرض signup و recovery در نبود ارسال ایمیل در سرور نیز 503 می‌دهند. استثنای موقت با درخواست مالک: AUTH_EMAIL_VERIFICATION_REQUIRED=false ثبت‌نام/ورود با رمز را فعال می‌کند، emailVerified همچنان false و app.verified_email تهی می‌ماند؛ پذیرش دعوت برای حساب تأییدنشده رد می‌شود. recovery بدون فرستنده همچنان 503 است. MFA و RLS باقی‌اند؛ [ADR 0005](adr/0005-temporary-password-signup.md) مسیر پایان این حالت را ثبت می‌کند. کلیدهای production با اجازهٔ صریح کاربر ساخته و فقط در تنظیمات محرمانه نگهداری شدند. نمونهٔ UI با flag توسعه در Vercel قابل فعال‌سازی نیست.

صندوق توسعه فقط با flag صریح، NODE_ENV=development، loopback و DB آزمون فعال است؛ روی Vercel و production غیرفعال است. signup محلی فقط ایمیل `.test` می‌پذیرد؛ tokenها در حافظهٔ محلی با TTL محدود هستند. این محیط باید فقط روی دستگاه توسعه و با دادهٔ مصنوعی استفاده شود. keys fixture برای HTTPS عمومی رد می‌شوند؛ request logging توسعه خاموش است تا URLهای verification/recovery چاپ نشوند.

احراز هویت واقعی و MFA، negative tests بین دو tenant، access revocation، origin/rate limits، TLS و TURN، CSP، اسکن فایل، backup و restore عملی، load test رسانه و ضبط، سیاست حریم خصوصی و بررسی نفوذ مستقل لازم‌اند.

## خودمیزبانی و انتقال محیط

credential نقش migration، bootstrap و runtime مستقل‌اند؛ web image فقط runtime را دریافت می‌کند. private استقرار از Git، Docker context و upload ورسل کنار گذاشته می‌شود. PostgreSQL در Compose مستقل port عمومی ندارد؛ وب فقط loopback برای HTTPS proxy منتشر می‌شود. bootstrap فقط volume تازهٔ اختصاصی را آماده می‌کند؛ volume موجود بدون بررسی اپراتور حذف یا بازنویسی نمی‌شود. یک سایت مرجع نوشتن مانع split-brain است؛ backup/restore و تغییر origin/کلید نشست باید آزموده شوند. مستقل‌شدن سرویس‌ها کنترل ban/reconnect رسانه را خودکار حل نمی‌کند. [ADR 0006](adr/0006-portable-self-hosting.md).

## سیاست جاری حساب — 2026-10-14

با درخواست مالک، تأیید دومرحله‌ای مبتنی بر برنامهٔ کدساز از جریان حساب حذف شد. ثبت‌نام، ورود، ساخت مجموعه و مدیریت با رمز عبور انجام می‌شوند؛ صفحه و endpoint کدساز دیگر فعال نیستند. migration 0005 وضعیت و secretهای قدیمی کدساز را پاک می‌کند، بدون حذف حساب یا نشست. عضویت/نقش معتبر، RLS، Origin و محدودیت ایمیل برقرارند؛ break-glass پلتفرم همچنان سیاست مستقل MFA دارد. این تصمیم الزام قبلی عمومی مدیران در توضیحات تاریخی را جایگزین می‌کند: [ADR 0007](adr/0007-password-only-authentication.md).
