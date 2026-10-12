# راهنمای توسعهٔ همیار

پیش از تغییر، `docs/PRODUCT.md`، `docs/ARCHITECTURE.md`، `docs/DESIGN_SYSTEM.md` و `docs/SECURITY.md` را بخوانید. تغییر تصمیم معماری باید همراه ADR جدید باشد.

- همیار محصول کلاس و جلسهٔ آنلاین چندسازمانی است؛ مدرسه، شرکت و شخص سه نوع سازمان هستند. لندینگ در فاز بعد است.
- زبان پیش‌فرض فارسی، جهت RTL و تم پیش‌فرض تیره با سبز زمردی است. هر صفحه باید تم روشن، موبایل، کیبورد و reduced motion را پشتیبانی کند.
- وضعیت فعلی پایهٔ پروژه و دموی UI است. امکانات نمونه را با دادهٔ واقعی، اتصال رسانه، احراز هویت یا ضبط واقعی اشتباه نگیرید؛ `docs/ROADMAP.md` وضعیت مرجع است.
- TypeScript strict؛ منطق دامنه در `src/modules`، اجزای نمایش در `src/components` و مسیرها در `src/app`.
- برای هر query و mutation سازمان را از نشست معتبر تعیین کنید. tenantId، role و grant ارسالی کلاینت قابل اعتماد نیستند.
- سوپروایزر دسترسی کامل در سازمان خودش دارد. دسترسی پلتفرم فرایند مستقل break-glass با دلیل، زمان انقضا، MFA و audit است.
- پیش‌فرض دسترسی deny است. توکن LiveKit فقط سمت سرور، کوتاه‌عمر و محدود به همان اتاق صادر می‌شود. roomAdmin به مرورگر ندهید.
- میزبان می‌تواند انتشار صدا/تصویر را قطع کند؛ روشن‌کردن دستگاه فرد دیگر نیازمند اقدام و رضایت همان فرد است.
- رسانه از SFU عبور می‌کند، نه سرور Next.js. عملیات ضبط و تختهٔ مشترک فرایندهای مستقل هستند.
- از بسته‌های جدید فقط با دلیل استفاده کنید؛ تا نیاز عملی ثابت نشده، microservice و Kubernetes اضافه نکنید.
- هیچ secret، `.env.local`، فایل ضبط، اطلاعات واقعی دانش‌آموز یا خروجی تست را commit نکنید.
- برای منطق حساس امنیتی و وضعیت اتصال آزمون رفتاری بنویسید. `npm run check` و `npm run build` باید قبل از تحویل پاس شوند.
- اگر قابلیت کامل نیست، صریحاً در UI و مستندات بگویید. موفقیت ضبط را پیش از webhook تأییدشده نمایش ندهید.
- اهداف performance در سند، هدف قابل اندازه‌گیری هستند؛ ادعای ظرفیت یا نفوذناپذیری بدون آزمایش ممنوع است.
- پیش‌نمایش محلی دوربین/میکروفون واقعی است ولی publication ندارد. permission فقط با اقدام کاربر؛ stop track هنگام خاموش‌کردن، خروج، قطع سخت‌افزار و نتیجهٔ دیرهنگام پس از لغو الزامی است.
- گلس و موشن باید کم‌دامنه و قابل خاموش‌کردن باشند. reduced motion سیستم مقدم است؛ هیچ نمونهٔ صدا ذخیره/ارسال نشود و React در هر frame دوباره render نشود.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
