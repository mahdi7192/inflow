# inFlow Control Plane

پلتفرم مدیریت هوشمند و مرکز کنترل (`Control Plane`) برای اتوماسیون کامنت‌ها و ارسال دایرکت در پیج‌های اینستاگرام.

طراحی‌شده با **Next.js (App Router)**، **TypeScript**، **Tailwind CSS**، **shadcn/ui** و دیتابیس لوکال پرسرعت **SQLite** (`better-sqlite3`).

---

## ۱. توسعه مبتنی بر مشخصات (Spec-Driven Development - SDD)

توسعه و تکامل فیچرهای این پروژه بر پایه استاندارد رسمی **[GitHub Spec-Kit](https://github.com/github/spec-kit)** انجام می‌شود. هیچ کدی بدون تعریف مشخصات (`Specification`)، طرح معماری (`Plan`) و تسک‌های قابل آزمون (`Tasks`) اضافه یا تغییر داده نمی‌شود.

### چرخه SDD در این پروژه:
1. **قانون اساسی پروژه (`Constitution`)**: مستند قوانین غیرقابل مذاکره معماری و اصول فنی در مسیر `.specify/memory/constitution.md`.
2. **مشخصه‌سازی (`Specify`)**: تعریف دقیق هدف کاربر (What & Why)، سناریوهای کاربری و معیارهای پذیرش مستقل.
3. **طراحی معماری (`Plan`)**: انتخاب ساختار داده، مسیرهای API و تغییرات دیتابیس.
4. **تسک‌بندی (`Tasks`)**: خرد کردن تغییرات به اقدامات اتمیک و ترتیبی.
5. **پیاده‌سازی (`Implement`)**: اجرای گام‌به‌گام تسک‌ها.
6. **همگرایی و تطبیق (`Converge`)**: ارزیابی تطابق صددرصدی کد نوشته‌شده با مشخصات.

### دستورات اسلش ابزارهای AI (Hermes Agent / Cursor / Claude):
```text
/speckit-constitution  # مشاهده یا تدوین اصول حاکم بر پروژه
/speckit-specify       # تدوین فیچر جدید و سناریوهای کاربری (مثال: افزودن وب‌هوک تلگرام)
/speckit-plan          # تهیه پلن فنی و معماری برای فیچر
/speckit-tasks         # ایجاد چک‌لیست تسک‌های اجرایی
/speckit-implement     # پیاده‌سازی گام‌به‌گام تسک‌ها
/speckit-converge      # بررسی انطباق و نهایی‌سازی پیاده‌سازی
```

ابزار خط فرمان `specify-cli` نیز در این محیط نصب و پیکربندی شده است:
```bash
specify check         # بررسی ابزارها و ایجنت‌های متصل
specify status        # وضعیت فیچرهای در دست تدوین در .specify/
```

---

## ۲. ویژگی‌ها و معماری سیستم

1. **جداسازی Control Plane از Execution Plane:**
   - پنل شما مستقل و پایدار روی سرور اجرا می‌شود.
   - ایجنت هرمس (`Hermes Agent`) یا هر سرویس دیگر به عنوان Worker هر ۲ دقیقه از طریق REST API وضعیت پست‌ها و قوانین را استعلام می‌کند.
2. **پشتیبانی چند پیجی (Multi-Account Platform):**
   - امکان تعریف و سوئیچ بین پیج‌های مختلف اینستاگرام در یک پنل واحد.
3. **تناظر ۱ به ۱ پست‌ها و ریلزها:**
   - مشاهده لیست کامل پست‌ها و ریلزهای پیج همراه با کاور و کپشن.
   - تنظیم پاسخ خودکار برای هر پست به صورت مستقل.
4. **شروط فعال‌سازی (Triggers):**
   - **همه کامنت‌ها (`all`)**
   - **کلمات کلیدی مشخص (`keywords`)**
   - **تشخیص هوشمند با کانتکس AI (`ai_context`)**
5. **اکشن‌های دوگانه (Dual Actions):**
   - **پاسخ عمومی زیر کامنت (`Comment Reply`):** غیرفعال | متن مستقیم | تولید داینامیک با هوش مصنوعی.
   - **ارسال دایرکت (`Direct Message`):** غیرفعال | متن مستقیم | تولید داینامیک با هوش مصنوعی + شرط فالو داشتن پیج (`Follow Requirement`).
6. **جلوگیری از اجرای تکراری (Idempotency Locks):**
   - قفل شناسه یکتای هر کامنت (`comment_id`) در دیتابیس برای جلوگیری از ارسال ریپلای یا دایرکت تکراری.
7. **شبیه‌ساز زنده داخل پنل:**
   - امکان تست مستقیم عملکرد قوانین روی هر پست بدون نیاز به کامنت واقعی در اینستاگرام.

---

## ۳. ساختار API برای ایجنت هرمس

### استعلام پست‌های فعال و قوانین (هر ۲ دقیقه)
```bash
curl -s "http://localhost:3005/api/agent/poll?account=r9spoort1"
```

### ثبت قفل کامنت و لاگ اقدام ایجنت
```bash
curl -X POST "http://localhost:3005/api/posts/DehQhnjoEcr/logs" \
  -H "Content-Type: application/json" \
  -d '{
    "comment_id": "1820011223344",
    "username": "customer_username",
    "comment_text": "قیمت و سایز لطفا",
    "trigger_matched": 1,
    "comment_reply_status": "sent",
    "comment_reply_text": "پاسخ در دایرکت خدمتتان ارسال شد 🌹",
    "dm_status": "sent",
    "dm_text": "سلام دوست عزیز! قیمت محصول ۲۵ هزار دینار است..."
  }'
```

### سینک پست‌های جدید توسط ایجنت
```bash
curl -X POST "http://localhost:3005/api/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "account_username": "r9spoort1",
    "posts": [
      {
        "shortcode": "NEW_POST_CODE",
        "post_type": "reel",
        "caption": "کپشن پست جدید...",
        "thumbnail_url": "/media/thumbnails/..."
      }
    ]
  }'
```

---

## ۴. راه‌اندازی و اجرا با `pnpm`

```bash
# نصب پکیج‌ها با pnpm
pnpm install

# اجرای محیط توسعه
pnpm dev

# بیلد و اجرای نسخه پروداکشن
pnpm build
pnpm start -p 3005
```

دیتابیس در مسیر `data/inflow.db` به صورت خودکار ایجاد و مدیریت می‌شود.
آموزش کامل پروتکل تعاملی ایجنت هرمس در [docs/agent-protocol.md](docs/agent-protocol.md) در دسترس است.
