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
- **وضعیت:** فعال و کامل در `/opt/inflow/.specify/` (شامل `constitution.md` و ۱۹ اسپک از `001-inflow-core` تا `019-b2b-services-persona-playbooks`).
- **آخرین Spec مستقرشده:** `019-b2b-services-persona-playbooks` (فاز میانی ۲.۵: تفکیک سه‌گانه پرسونا به `ecommerce`، `service_b2b` و `creator`، سناریوهای اختصاصی خدمات و مشاوره B2B، چیپ‌های تخصصی تقلب‌نامه و پرامپت مهندسی‌شده مشاوره‌ای).

## ۳. ساختار دیتابیس (`SQLite WAL` — `/opt/inflow/data/inflow.db`)
- **جداول اصلی (۱۸ جدول):**
  - `users`, `user_sessions`, `user_accounts`: احراز هویت، نقش‌ها (`admin`/`user`) و تخصیص چندحسابی.
  - `accounts`: حساب‌های اینستاگرام، توکن‌های SocialAPI، پرسونا (`ecommerce`/`service_b2b`/`creator`)، لحن برند و بایو.
  - `posts`: کاتالوگ پست‌ها و ریلزها، `shortcode`، کپشن، قوانین اختصاصی پاسخ کامنت/دایرکت و متادیتای محصول (`structured_metadata`).
  - `comment_logs`, `dm_logs`: لاگ‌های پاسخ‌دهی با قفل یکتای `comment_id` و `message_id` (Idempotency).
  - `dm_automations`: قوانین اتوماسیون دایرکت.
  - `dm_thread_states`: مدیریت وضعیت مکالمات دایرکت، خلاصه کانتکست، مرحله قیف فروش و توقف خودکار هنگام مداخله انسان (`paused_until`, `manual_override`).
  - `captured_leads`: سرنخ‌های استخراج‌شده از دایرکت/کامنت (شماره تماس، نام، محصول مورد نظر، وضعیت پیگیری).
  - `incoming_events`, `action_queue`: صف رویدادهای ورودی و صف اجرای عملیات خروجی با تاخیر طبیعی (Jitter).
  - `app_settings`: تنظیمات سراسری سیستم.

## ۴. آخرین وضعیت و گام بعدی
- بیلد پروداکشن با فاز میانی Spec 019 پایدار و در حال سرویس‌دهی است.
- نقشه راه در `ROADMAP.md` به‌روزرسانی شده و آماده ورود به گام ۳ (کارت‌های تعاملی و استوری‌های زنده) است.
