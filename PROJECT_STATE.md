# وضعیت پروژه: inFlow Studio (`PROJECT_STATE.md`)

- **مسیر اصلی:** `/opt/inflow`
- **مسیر Workspace:** `/workspace/projects/inflow`
- **وضعیت اجرایی:** `LIVE` (`inflow.service` روی پورت `3005` + `inflow-poller.timer` هر ۱ دقیقه)
- **دامنه عمومی:** `https://inflow.ketabdar.dev`

## ۱. استک فنی (Tech Stack)
- **فریم‌ورک:** Next.js 16.4.2 (App Router, Turbopack, TypeScript 5)
- **پکیج منیجر:** `pnpm`
- **رابط کاربری:** React 19, Tailwind CSS v4, `shadcn/ui`, Lucide Icons, فونت `Vazirmatn` + `Geist`
- **اتصال اینستاگرام:** `SocialAPI.ai` (`https://api.social-api.ai/v1`) — OAuth + HMAC-SHA256 Webhooks + 1m Poller Fallback
- **هوش مصنوعی:** متصل به درگاه محلی `9Router` (`http://127.0.0.1:20128/v1`)

## ۲. وضعیت فعلی Spec-Kit
- **وضعیت:** فعال و کامل در `/opt/inflow/.specify/` (شامل `constitution.md` و ۲۰ اسپک از `001-inflow-core` تا `020-unified-status-modal-and-dm-pause-isolation`).
- **آخرین Spec مستقرشده:** `020-unified-status-modal-and-dm-pause-isolation` (تجمیع نشانگرهای هدر در یک کامپوننت یکپارچه وضعیت پیج و باز شدن پنجره مودال تنظیمات، تفکیک کلید اصلی سراسری از پاسخگوی دایرکت، و ایزولاسیون کامل دایرکت به طوری که در صورت غیرفعال بودن پاسخگویی مستقیم دایرکت، احراز شرط فالو و تحویل هدیه/لینک کامنت‌ها فعال بماند).

## ۳. ساختار دیتابیس (`SQLite WAL` — `/opt/inflow/data/inflow.db`)
- **جداول اصلی (۱۸ جدول):**
  - `users`, `user_sessions`, `user_accounts`: احراز هویت، نقش‌ها (`admin`/`user`) و تخصیص چندحسابی.
  - `accounts`: حساب‌های اینستاگرام، شناسه اکانت و برند SocialAPI (`social_account_id`, `social_brand_id`)، پرسونا (`ecommerce`/`service_b2b`/`creator`)، لحن برند و بایو.
  - `posts`: کاتالوگ پست‌ها و ریلزها، `shortcode`، کپشن، قوانین اختصاصی پاسخ کامنت/دایرکت و متادیتای محصول (`structured_metadata`).
  - `comment_logs`, `dm_logs`: لاگ‌های پاسخ‌دهی با قفل یکتای `comment_id` و `message_id` (Idempotency).
  - `dm_automations`: قوانین اتوماسیون دایرکت.
  - `dm_thread_states`: مدیریت وضعیت مکالمات دایرکت، خلاصه کانتکست، مرحله قیف فروش و توقف خودکار هنگام مداخله انسان (`paused_until`, `manual_override`).
  - `captured_leads`: سرنخ‌های استخراج‌شده از دایرکت/کامنت (شماره تماس، نام، محصول مورد نظر، وضعیت پیگیری).
  - `incoming_events`, `action_queue`: صف رویدادهای ورودی و صف اجرای عملیات خروجی با تاخیر طبیعی (Jitter).
  - `app_settings`: تنظیمات سراسری سیستم.

## ۴. آخرین وضعیت و گام بعدی
- **ارتقای موتور ارسال دایرکت با رویکرد پایداری داده (Data-Resilient Rich Direct Messages):**
  - افزودن دکمه‌های شیشه‌ای لینک محصول (`web_url`) به همراه دکمه‌های پاسخ سریع (`quick_replies`) نظیر «ارتباط با ادمین 💬».
  - سنیتایز خودکار عناوین دکمه‌ها و محدودسازی به سقف سخت‌گیرانه ۲۰ کاراکتر اینستاگرام جهت جلوگیری از خطای ۴۰۰.
  - فالبک ۳ مرحله‌ای لایه‌بندی‌شده (Graceful Multi-tier Fallback): در صورت نبود یا نامعتبر بودن لینک/متادیتا، ارسال دکمه حذف شده و پیام به صورت متن تمیز ارسال می‌شود؛ در صورت عدم پشتیبانی دکمه شیشه‌ای در قالب پیام، سیستم ابتدا به Quick Reply و سپس به FallbackText متنی شیفت می‌کند بدون آنکه اکشن با خطا مواجه شود.
  - پردازش خودکار قصد «ارتباط با ادمین» (`TALK_TO_ADMIN`): توقف خودکار ربات برای کاربر در `dm_thread_states`، ثبت لید در `captured_leads` با وضعیت پیگیری، و ارسال پیام تاییدیه به کاربر.
- **قابلیت توقف اضطراری سراسری (Kill Switch / Master Pause):**
  - فیلد `status` اکانت در جدول `accounts` دارای مقادیر `'active' | 'paused' | 'error'`.
  - لایه‌های دفاعی چندگانه (Defense-in-Depth): پولرهای کامنت و دایرکت اکانت‌های `paused` را نادیده می‌گیرند؛ رویدادهای ورودی در بدو ورود با استیت `skipped` و `reason: 'account_paused'` بایگانی می‌شوند؛ موتورهای اتوماسیون کامنت و دایرکت هرگونه پردازش یا پاسخ خودکار را متوقف می‌کنند؛ مجری صف اکشن‌ها (`action_executor`) از ارسال پیام به اکانت‌های متوقف‌شده جلوگیری می‌کند.
  - رابط کاربری فرانت‌اند: تاگل تک‌کلیکه در هدر با استیت بصری لحظه‌ای، بنر اخطار شناور زرد در بالای صفحات در زمان پاز بودن، نشانگر وضعیت در سایدبار و در هاب انتخاب اکانت‌ها با هماهنگی کامل سه زبانه (`fa`, `en`, `ar`).
- منطق اتصال اینستاگرام در SocialAPI بازنویسی شد: تطابق سخت‌گیرانه بر اساس نام کاربری، جستجو و ساخت خودکار برند اختصاصی (`getOrCreateBrand`)، اتصال OAuth مستقیم با `brand_id`، و حذف فالبک اشتباه تک‌اکانتی.
- رابط کاربری دیالوگ ورود ساده‌سازی شد و کلیه گزینه‌های فنی/اکانت‌های دیگر حذف شدند.
- بیلد پروداکشن پایدار و سرویس `inflow.service` روی پورت `3005` فعال است.

## Spec 021 — Per-story automation (2026-10-23)
- Added `stories` table, `src/lib/stories.ts`, story API routes, `StoriesSection` + `StoryPlaybookDrawer`, engine branch isolating story replies from DM rules, DM settings tab renamed «تنظیمات دایرکت مستقیم» with source badges.
- Unverified: real story-reply webhook payload (none exist in incoming_events); story_id matching against SocialAPI story ids; not deployed.

## اصلاح ساختار سینک و نمایش کامل ریلزها و پست‌ها (2026-10-23)
- **علت باگ قبلی:** عدم استخراج `thumbnail_url` از آرایه `platform_media` در SocialAPI و ذخیره شدن URL فایل ویدیویی `.mp4` داخل تگ `<img>` فرانت‌اند، به همراه تک‌صفحه‌ای بودن متد `listPosts` که تنها ۲۵ پست اول را واکشی می‌کرد.
- **اصلاح دائمی:**
  - پشتیبانی از صفحه‌بندی مبتنی بر نشانگر (`cursor-based pagination`) با متد `listAllPosts` در `src/lib/social-api.ts`.
  - استخراج اولویت‌دار کاور تصویر (`thumbnail_url` فرمت JPG) برای تمامی ویدیوها و ریلزها در اندپوینت سینک و سرویس پرووایدر.
  - به‌روزرسانی و سینک کامل ۵۲۲ پست و ریلز پیج مغزوک در پایگاه داده SQLite و پاکسازی هرگونه لینک ویدیو از کاورها.
  - تصحیح فیلد `posted_at` با تاریخ واقعی انتشار از Instagram (`published_at` و دکود مستقیم Snowflake از روی `shortcode`)؛ ترتیب نمایش از جدید به قدیم تثبیت شد.
  - پیاده‌سازی Pagination استاندارد (۲۴ پست در هر صفحه) به همراه نویگیشن RTL فارسی در کامپوننت `InflowDashboard` برای جلوگیری از بار سنگین رندر DOM مرورگر.
  - افزودن دکمه «همگام‌سازی دستی ریلزها» در نوار ابزار بالای داشبورد برای فراخوانی بلادرنگ SocialAPI.
  - اصلاح چیدمان کارت‌ها به صورت عمودی (نسبت تصویر ۴:۵ مطابق با استاندارد ریلز اینستاگرام) و ۴ تایی در هر سطر دسکتاپ (`xl:grid-cols-4`).
  - رفع خطای `RangeError: Invalid time value` در همگام‌سازی: محدودسازی ورودی `extractTimestampFromShortcode` به شورت‌کدهای استاندارد اینستاگرام (۹ الی ۱۳ کاراکتر) و قرار دادن اعتبارسنجی بازه زمانی و بلوک `try / catch` در `src/lib/db.ts` و `src/app/api/sync/route.ts`.
  - غنی‌سازی اطلاعات ریلزها و رفع باگ کارت‌های خالی (`SocialAPI Post Enrichment & Video Frame Transcoding`):
    - رفع ریشه ثبت کارت‌های خام با شناسه عددی با ادغام واکشی همزمان `/v1/inbox/comments` و استخراج پرمالینک، شورت‌کد اصلی (`De1gaG7Rd8Q`) و متن کپشن.
    - ارتقای پروکسی رسانه (`/api/media/proxy`): استخراج خودکار فریم بندانگشتی JPEG از ویدیوهای MP4 اینستاگرام با `ffmpeg` و کش محلی دیسک جهت نمایش صحیح و بدون نقص تصویر در مرورگر.
  - سرویس `inflow.service` مجدداً بیلد و ریلود شد.
