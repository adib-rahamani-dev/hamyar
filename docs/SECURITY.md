# امنیت همیار

نسخهٔ جاری با این سند و ADRهای 0003، 0007 و 0008 تعریف می‌شود. هیچ ادعای «ضدهک» یا ظرفیت بدون آزمون مستقل مجاز نیست.

## هویت و سازمان

- رمز با کتابخانهٔ هویت hash می‌شود؛ نشست واقعی DB و cookie HttpOnly/SameSite دارد. cookie cache غیرفعال است؛ logout/revoke روی نشست تازه بررسی می‌شوند.
- MFA مبتنی بر کدساز از حساب معمولی به درخواست مالک حذف شده؛ migration 0005 proof و secret قدیمی را پاک می‌کند. break-glass پلتفرم مستقل است و ساخته نشده.
- org از نشست معتبر و role از membership تازه است؛ مقادیر ارسالی کلاینت قابل اعتماد نیستند. query/mutation در transaction با SET LOCAL context اجرا می‌شود.
- runtime غیرمالک و بدون superuser/bypass است؛ ۱۳ جدول سازمانی FORCE RLS دارند. FK مرکب جلوی ارتباط رکوردهای دو سازمان را می‌گیرد. migration credential در وب/gateway قرار نمی‌گیرد. audit از app قابل UPDATE/DELETE نیست.
- روی حالت موقت `AUTH_EMAIL_VERIFICATION_REQUIRED=false`، ثبت‌نام/ورود ممکن است ولی emailVerified همچنان false و app.verified_email تهی است. دعوت ایمیلی و بازیابی بدون فرستنده دور زده نمی‌شوند. SMTP TLS یا فرستندهٔ اختیاری باید جدا تنظیم شود.

## API و ورودی

Origin mutation باید دقیقاً BETTER_AUTH_URL باشد. JSON strict، سقف ۸ KiB و counter مشترک DB برابر ۶۰ درخواست workspace در دقیقه برای هر user وجود دارد؛ polling هم از این بودجه مصرف می‌کند و برای مقیاس مدرسه باید اندازه‌گیری/تنظیم شود. خطای خام SQL، URL DB و credential به پاسخ نمی‌روند. کتابخانهٔ auth rate limit DB جدا دارد؛ NAT مدرسه باید آزموده شود.

متن چت/تیکت/برند به صورت متن render می‌شود؛ HTML/CSS دلخواه نیست. تخته color/width/points محدود و author سروری دارد. moderation متن مخفی‌شده را از snapshot حذف می‌کند. snapshotها no-store هستند؛ revoke دسترسی باعث حذف projection خصوصی از UI و قطع رسانه می‌شود.

## دعوت

دعوت ایمیلی اثبات ایمیل معتبر می‌خواهد و hash/expiry/لغو دارد. لینک اتاق قابلیت اشتراکی است؛ مالکیت ایمیل را اثبات نمی‌کند و فقط attendee همان اتاق می‌سازد. token تصادفی ۳۲ بایتی، hash در DB، expiry و maxUses محدود دارد. fragment به URL سرور نمی‌رود. redemption با context hash تنها لینک مورد نظر را پیدا می‌کند، سپس org از رکورد تعیین می‌شود. عضویت تعلیق‌شده/ban، اتاق بسته، سقف/expiry و race تراکنشی کنترل می‌شوند. لینک را عمومی منتشر نکنید؛ لغو لینک مجوز قبلی عضو را حذف نمی‌کند و برای آن ban لازم است.

## رسانه و revocation

توکن تنها server-side پس از نشست/role/room تازه صادر می‌شود: همان org و room، TTL حداکثر ۵ دقیقه یا باقیماندهٔ grant، sessionId امضاشده، بدون roomAdmin/data publish/metadata update. منابع صوت/دوربین/صفحه allowlist هستند. خود کاربر باید دستگاه را فعال کند؛ remote unmute سرور خاموش است.

gateway همیشه‌روشن Origin، امضا/expiry، sessionId و مجوز تازه را روی هر اتصال و reconnect بررسی می‌کند. پنج‌ثانیه یک‌بار دسترسی اتصال برقرار خوانده می‌شود؛ لغو/ban/تعلیق/پایان یا نبود DB به حذف participant در SFU و بستن signaling منجر می‌شود. به‌دلیل timeout DB/API و خطای شبکه قطع آنی تضمین نمی‌شود. اگر API کنترل SFU در دسترس نباشد، بستن signaling به‌تنهایی تضمین توقف فوری رسانه نیست؛ آن وضعیت باید در پایش عملیاتی هشدار شود. publisher با grant منقضی fresh join می‌خواهد؛ read-only خودکار به publisher تبدیل نمی‌شود.

**پورت/API signaling خام SFU هرگز عمومی نشود.** مسیر مرورگر باید الزاماً gateway باشد؛ firewall/TLS proxy و loopback/private bind بخشی از مدل امنیت‌اند. پورت‌های ICE/TURN رسانه عمومی و رمزنگاری‌شده‌اند و با API کنترل متفاوت‌اند. gateway حداکثر ۲۰۰ signaling connection با محدودیت صف/backpressure دارد؛ این عدد ظرفیت تجاری SFU نیست. JWT/query signaling در proxy، log و telemetry ذخیره نشوند.

SDK و دستگاه‌ها هنگام خروج/لغو/قطع نهایی متوقف و detached می‌شوند؛ نتیجهٔ دیرهنگام permission/connect نیز باید پاک شود. share screen فقط با gesture و پشتیبانی مرورگر. تحلیل سطح صوت محلی در regression بدون ذخیره/ارسال نمونه است؛ آن را recording ننامید.

## داده و خودمیزبانی

secret، env، private config، ضبط، دانش‌آموز واقعی، screenshot/trace/session آزمون وارد Git یا Vercel upload نمی‌شوند. bootstrap/schema/runtime رمز جدا دارند. PG در compose فقط شبکهٔ داخلی و loopback میزبان دارد؛ پورت raw را عمومی نکنید. وب/gateway فقط loopback پشت TLS. SMTP 465/587 با TLS/certificate verification؛ TLS verification را برای رفع خطا خاموش نکنید.

domestic allowlist اپراتور دارد و Cloud شناخته‌شده/میزبان تأییدنشده را رد می‌کند؛ تضمین جغرافیا یا دسترسی ISP نیست. TLS، DNS، image، package مورد نیاز و backup باید پیش از قطعی آماده باشند. تنها یک سایت مرجع نوشتن؛ backup/restore خصوصی و انتقال با کنترل صحت. رمزهای migration به وب داده نشوند و volume موجود خودکار حذف نشود.

## معیارهای باز production

آزمون مستقل نفوذ، CSP سازگار با WebRTC و scriptهای موجود، TLS/TURN از چند ISP، load/rate/NAT test، backup/restore، log/alert مناسب gateway، سیاست نگهداری/حذف داده و ضبط خصوصی لازم‌اند. ضبط Egress و storage فعلاً پیاده نشده؛ هیچ موفقیت ضبط قبل از webhook معتبر نمایش داده نشود. تست‌های فعلی دو tenant و مرورگر جای این پذیرش‌ها نیستند.
