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

## قبل از production

احراز هویت واقعی و MFA، negative tests بین دو tenant، access revocation، origin/rate limits، TLS و TURN، CSP، اسکن فایل، backup و restore عملی، load test رسانه و ضبط، سیاست حریم خصوصی و بررسی نفوذ مستقل لازم‌اند.
