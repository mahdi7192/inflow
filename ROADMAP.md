# نقشه راه محصول inFlow Studio (Autonomous Social Revenue OS)

این سند نقشه راه کامل معماری، تجربه کاربری و فیچرهای تجاری **inFlow Studio** را مشخص می‌کند تا توسعه در محیط‌های لوکال و سرور کاملاً یکپارچه پیش برود.

**مستندات مرجع طراحی و معماری:**
- `DESIGN.md` — توکن‌های رنگی، تایپوگرافی (`Vazirmatn` + `Geist Mono`)، قوانین RTL/BiDi و تم روشن `inFlow Studio`
- `docs/design-system.md` — الگوهای کامپوننتی (کشوی ۱-کلیکی کنار صفحه، کارت‌های سناریو، تقلب‌نامه پست و پیج)
- `.specify/specs/018-autonomous-social-revenue-os/` — مشخصات فنی Spec 018

---

## ✅ گام ۱ (انجام‌شده — Spec 018): هسته استودیو، سناریوهای ۱-کلیکی و تقلب‌نامه
- **معماری دوگانه پرسونا (`accounts.account_persona`)**:
  - `business` (فروشگاه و بیزینس): سناریوهای `auto_seller`، `viral_gate`، `lead_closer`
  - `creator` (کریتور و بلاگر): سناریوهای `creator_magnet`، `creator_twin`، `sponsor_campaign`
- **کشوی ۱-کلیکی کنار صفحه (`src/components/post-playbook-drawer.tsx`)**: تنظیم سریع سناریو و تقلب‌نامه بدون خارج شدن از گرید پست‌ها.
- **تقلب‌نامه پست (`posts.cheat_sheet` + `posts.target_url`) و تقلب‌نامه کلی پیج (`accounts.brand_cheat_sheet` + `accounts.website_url`)**:
  - تزریق اطلاعات خارج از کپشن (قیمت، سایز، موجودی، کد تخفیف، پرامپت) به موتور پاسخگوی کامنت و دایرکت.
  - افزودن خودکار پارامترهای رهگیری هویت مخاطب (`?utm_source=instagram_inflow&utm_content={shortcode}&ig_user={username}`) به لینک‌های ارسالی.
  - **پل ارتباطی کامنت به دایرکت (`Cross-Channel Context Bridge`)** در `src/lib/instagram/automation-engine.ts`.
- **نوار قیف بازدهی زنده (`GET /api/accounts/[username]/insights`) و سپر ضد-اسپم رایگان (`posts.smart_moderation`)**.

---

## 🔜 گام ۲: یکپارچه‌سازی ناوبری، اصلاح تایپوگرافی و حذف دوگانگی کامنت/دایرکت
1. **قفل کردن فونت `Vazirmatn` در کل سیستم**:
   - افزودن `var(--font-vazirmatn)` به عنوان Fallback در `--font-mono` داخل `src/app/globals.css` و اعمال مستقیم `vazirmatn.className` روی `body` در `src/app/layout.tsx`.
   - جایگزینی کلاس `font-mono` با `font-sans tabular-nums` روی تمام بج‌ها، متریک‌ها و اعداد فارسی در `post-playbook-drawer.tsx` و `inflow-dashboard.tsx` (نگه داشتن `font-mono` صرفاً برای آیدی‌های لاتین مثل `@username` و `shortcode`).
2. **تغییر ساختار منوی ناوبری (`WorkspaceShell` در `src/components/workspace-shell.tsx`)**:
   - تغییر «اتوماسیون کامنت» به **«🎬 استودیو پست‌ها و ریلزها»** (چون هر پست کل قیف کامنت + دایرکت + تقلب‌نامه خود را یکجا مدیریت می‌کند).
   - تغییر «اتوماسیون دایرکت» به **«💬 صندوق دایرکت، استوری و لیدها»**.
3. **بازطراحی صفحه دایرکت (`src/components/dm-automation-view.tsx`)**:
   - حذف فرم‌های تکراری و اتصال پاسخگوی عمومی دایرکت و ریپلای استوری‌ها (`story_reply` / `story_mention`) به همان `brand_cheat_sheet` پیج.
   - افزودن قابلیت **«⏸️ توقف ربات برای این کاربر (Human Takeover)»** روی هر مکالمه دایرکت تا هنگام ورود ادمین انسانی، هوش مصنوعی متوقف شود.

---

## 🎯 گام ۳: ویترین لیدهای شکارشده (Captured Leads CRM) + کارت‌های تعاملی دایرکت
1. **استخراج خودکار شماره‌های تماس و مشتریان آماده خرید (`lead_captures`)**:
   - تشخیص خودکار شماره موبایل (`09xxxxxxxxx` / اعداد فارسی و انگلیسی) و نیت خرید در پیام‌های دایرکت و نمایش آن‌ها در باکس **«🔥 مشتریان داغ و شماره‌های شکارشده»** بالای صندوق دایرکت همراه با آیدی کاربر، پست مبدا و دکمه خروجی CSV / وب‌هوک CRM.
2. **کارت‌های ویترینی و دکمه‌های پاسخ سریع در دایرکت (`Rich Cards & Quick Replies`)**:
   - استفاده از پیلود `cards` (عکس پست + عنوان + دکمه لینک مقصد) و `quick_replies` در اندپوینت `/ig/dm/send` برای افزایش نرخ کلیک.
3. **اتوماسیون اختصاصی استوری‌های زنده ۲۴ ساعت اخیر (`Active Story Playbooks`)**:
   - امکان کلیک روی هر استوری فعال در نوار بالای داشبورد و تعریف پاسخ خودکار اختصاصی برای ریپلای‌های همان استوری.

---

## 🔗 گام ۴: بستن حلقه فروش — پیگیری خودکار (`Smart Follow-Up`) و پیکسل رهگیری خرید
1. **پیگیری هوشمند پیام‌های سین‌شده بدون پاسخ (`Ghosted Lead Recovery`)**:
   - استفاده از ستون `dm_logs.read_at` (وب‌هوک `dm.status.read`) برای ارسال یک پیام پیگیری محترمانه پس از ۶ ساعت در صورتی که کاربر لینک خرید را دیده اما پاسخی نداده است (در بازه مجاز ۲۴ ساعته / ۷ روزه `HUMAN_AGENT`).
2. **وب‌هوک و پیکسل رهگیری خرید سایت (`POST /api/webhooks/order-conversion`)**:
   - دریافت رویداد خرید از سایت فروشگاهی (بر اساس `ig_user` و `utm_content={shortcode}`) و نمایش **تعداد فروش و مبلغ درآمد واقعی هر پست/ریلز** روی کارت همان پست در پنل.

---

## 🚀 گام ۵: مقیاس‌پذیری محصول و قابلیت‌های SaaS
1. **گزارش روزانه عملکرد در تلگرام (`Daily Revenue & Funnel Digest`)** برای صاحب پیج.
2. **درک ویس در دایرکت (`Voice Note Transcription & Reply`)** از طریق پردازش `attachments.audio`.
3. **مدیریت چندکاربره، تیم ادمین‌ها و سقف مصرف اعتبار (`Multi-Tenant Workspaces & Credit Metering`)**.
