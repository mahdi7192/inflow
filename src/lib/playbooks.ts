/**
 * Spec 018/019 — Triple-Persona 1-Click Playbooks & Supplemental Cheat Sheet Helpers
 * Supports E-Commerce (`ecommerce`), B2B Services & Consulting (`service_b2b`) and
 * Creator/Influencer (`creator`) personas. Legacy `business` values map to `ecommerce`.
 */

export type AccountPersona = "ecommerce" | "service_b2b" | "creator";

export type PlaybookId =
  | "custom"
  | "auto_seller"
  | "viral_gate"
  | "lead_closer"
  | "creator_magnet"
  | "creator_twin"
  | "sponsor_campaign"
  | "brief_qualifier"
  | "consultation_booking"
  | "portfolio_showcase";

/** Normalizes any stored/legacy persona value (incl. `business`) to a valid AccountPersona. */
export function normalizePersona(value?: string | null): AccountPersona {
  if (value === "creator" || value === "service_b2b") return value;
  return "ecommerce";
}

export const PERSONA_META: Record<
  AccountPersona,
  {
    emoji: string;
    tabLabel: string;
    studioLabel: string;
    defaultPlaybook: PlaybookId;
    aiLabel: string;
    targetUrlLabel: string;
    brandSheetPlaceholder: string;
  }
> = {
  ecommerce: {
    emoji: "🛍️",
    tabLabel: "فروشگاه و کالا",
    studioLabel: "استودیو فروشگاه",
    defaultPlaybook: "auto_seller",
    aiLabel: "پیج فروشگاهی / کسب‌وکار فروش کالا",
    targetUrlLabel: "لینک مستقیم خرید محصول در سایت یا کاتالوگ (اختیاری — همراه رهگیری خودکار مشتری):",
    brandSheetPlaceholder:
      "مثال: ارسال به سراسر ایران با پست پیشتاز (۶۵ هزار تومان، بالای ۲ میلیون رایگان) | تحویل تهران با پیک | امکان تعویض سایز تا ۴۸ ساعت...",
  },
  service_b2b: {
    emoji: "💼",
    tabLabel: "خدمات و مشاوره",
    studioLabel: "استودیو خدمات",
    defaultPlaybook: "brief_qualifier",
    aiLabel: "پیج خدماتی / مشاوره / آژانس / B2B (پروژه‌محور، بدون سبد خرید)",
    targetUrlLabel: "لینک فرم بریف، رزرو جلسه یا پورتفولیو (اختیاری — همراه رهگیری خودکار مشتری):",
    brandSheetPlaceholder:
      "مثال: آژانس تولید محتوا و دیجیتال مارکتینگ | لحن مشاوره‌ای و محترمانه | جلسه مشاوره اولیه رایگان ۳۰ دقیقه‌ای | ساعات پاسخگویی شنبه تا چهارشنبه ۹ تا ۱۷...",
  },
  creator: {
    emoji: "🌟",
    tabLabel: "کریتور و مدیا",
    studioLabel: "استودیو کریتور",
    defaultPlaybook: "creator_magnet",
    aiLabel: "پیج کریتور / اینفلوئنسر / تولیدکننده محتوا",
    targetUrlLabel: "لینک فایل / ویدیو / لندینگ اسپانسر (ارسال خودکار در دایرکت با رهگیری کلیک):",
    brandSheetPlaceholder:
      "مثال: من مهدی هستم، تولیدکننده محتوای تکنولوژی و هوش مصنوعی. لحن پاسخگویی باید صمیمی و پرانرژی باشد. لینک کانال تلگرام و یوتیوب در بایو هست...",
  },
};

export interface PlaybookPreset {
  id: PlaybookId;
  persona: AccountPersona;
  title: string;
  subtitle: string;
  badge: string;
  emoji: string;
  defaults: {
    trigger_type: "all" | "ai_context" | "keywords";
    trigger_context: string;
    comment_action_type: "none" | "direct" | "ai";
    comment_action_text: string;
    dm_action_type: "none" | "direct" | "ai";
    dm_action_text: string;
    dm_require_follow: number;
  };
  cheatSheetPlaceholder: string;
  cheatSheetChips: { label: string; snippet: string }[];
  targetUrlPlaceholder: string;
}

export const PLAYBOOK_PRESETS: PlaybookPreset[] = [
  // ==========================================
  // 🛍️ E-COMMERCE & STORE PLAYBOOKS (`ecommerce`)
  // ==========================================
  {
    id: "auto_seller",
    persona: "ecommerce",
    title: "فروشنده خودکار و پاسخگوی قیمت",
    subtitle: "پاسخ هوشمند به کامنت + ارسال قیمت، موجودی و لینک خرید در دایرکت",
    badge: "پرفروش‌ترین",
    emoji: "🛒",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی که درباره قیمت، خرید، سایز، موجودی یا جزئیات محصول می‌پرسد یا ابراز علاقه می‌کند",
      comment_action_type: "ai",
      comment_action_text:
        "یک پاسخ کوتاه، صمیمی و متنوع بده و بگو قیمت و جزئیات کامل رو همین الان براتون دایرکت فرستادم (هرگز قیمت رو داخل کامنت عمومی نگو تا به دایرکت بیان).",
      dm_action_type: "ai",
      dm_action_text:
        "به عنوان مشاور فروش حرفه‌ای، بر اساس کپشن و تقلب‌نامه پست، قیمت، سایزها/موجودی و شرایط ارسال رو شفاف و محترمانه بگو و اگر لینک خرید وجود دارد همراه پیام بفرست.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: قیمت ۹۸۰ هزار تومن | سایزبندی ۳۸ تا ۴۴ موجوده (مشکی تموم شده) | ارسال فوری با تیپاکس رایگان...",
    cheatSheetChips: [
      { label: "+ قیمت و تخفیف", snippet: "قیمت: ... تومان (با تخفیف ویژه فالوورها: ... تومان)\n" },
      { label: "+ سایز و موجودی", snippet: "موجودی و سایزبندی: سایزهای ... موجود است (رنگ ... تمام شده)\n" },
      { label: "+ شرایط ارسال", snippet: "نحوه ارسال: ارسال به سراسر کشور در ۲ الی ۳ روز کاری\n" },
      { label: "+ نحوه سفارش", snippet: "نحوه ثبت سفارش: از طریق لینک سایت یا ارسال عکس فیش در دایرکت\n" },
    ],
    targetUrlPlaceholder: "https://shop.ir/product/... (لینک مستقیم صفحه خرید محصول)",
  },
  {
    id: "viral_gate",
    persona: "ecommerce",
    title: "قفل فالوورگیر و ارسال کاتالوگ/لینک",
    subtitle: "تبدیل ویوی اکسپلور به فالوور واقعی؛ ارسال لینک یا قیمت پس از تایید فالو",
    badge: "رشد فالوور",
    emoji: "🧲",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی زیر پست",
      comment_action_type: "ai",
      comment_action_text:
        "کوتاه و پرانرژی تشکر کن و بگو دایرکتت رو چک کن، کاتالوگ و جزئیات رو برات فرستادم 🌱",
      dm_action_type: "ai",
      dm_action_text:
        "به کاربر بابت فالو کردن تبریک بگو و بلافاصله اطلاعات کامل، قیمت، کد تخفیف یا لینک کاتالوگ موجود در تقلب‌نامه پست را به صورت منظم ارسال کن.",
      dm_require_follow: 1,
    },
    cheatSheetPlaceholder:
      "مثال: کد تخفیف مخصوص فالوورهای جدید: WELCOME15 | لیست قیمت کامل مدل‌ها...",
    cheatSheetChips: [
      { label: "+ کد تخفیف فالوورها", snippet: "کد تخفیف ویژه فالوورها: ...\n" },
      { label: "+ لیست قیمت", snippet: "لیست قیمت مدل‌های این پست:\n- مدل اول: ...\n- مدل دوم: ...\n" },
      { label: "+ گارانتی و ضمانت", snippet: "ضمانت: ۷ روز ضمانت تعویض سایز و اصالت کالا\n" },
    ],
    targetUrlPlaceholder: "https://shop.ir/collection/... (لینک کاتالوگ یا محصول)",
  },
  {
    id: "lead_closer",
    persona: "ecommerce",
    title: "شکارچی شماره تماس و ثبت سفارش دایرکت",
    subtitle: "مناسب پیج‌های بدون سایت یا خدمات؛ هدایت مشتری به ارسال شماره موبایل و سایز",
    badge: "بدون نیاز به سایت",
    emoji: "🔥",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی زیر پست",
      comment_action_type: "ai",
      comment_action_text:
        "بگو عزیزم دایرکت پیام دادم تا سایز و مدلت رو برات رزرو کنم ✨",
      dm_action_type: "ai",
      dm_action_text:
        "بر اساس تقلب‌نامه پست، قیمت و مشخصات رو بگو و در پایان پیام با لحن صمیمی از مشتری بخواه سایز/رنگ مدنظرش و شماره تماسش رو بفرسته تا سفارش براش ثبت و رزرو بشه.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: قیمت ۱.۴۵۰ میلیون | تحویل حضوری در تهران و ارسال پستی به شهرستان | برای رزرو حتما شماره موبایل و سایز گرفته شود...",
    cheatSheetChips: [
      { label: "+ قیمت و بیعانه", snippet: "قیمت کل: ... تومان (امکان پرداخت دو مرحله‌ای)\n" },
      { label: "+ اطلاعات لازم ثبت سفارش", snippet: "برای ثبت سفارش از مشتری بخواهید: نام، شماره موبایل و سایز/رنگ را ارسال کند.\n" },
      { label: "+ آدرس حضوری", snippet: "آدرس مراجعه حضوری: ...\n" },
    ],
    targetUrlPlaceholder: "لینک پرداخت یا واتساپ/تلگرام پشتیبانی (اختیاری)",
  },

  // ==========================================
  // 💼 B2B SERVICES & CONSULTING PLAYBOOKS (`service_b2b`)
  // ==========================================
  {
    id: "brief_qualifier",
    persona: "service_b2b",
    title: "نیازسنجی و دریافت بریف",
    subtitle: "هدایت کامنت به دایرکت + پرسش‌های کشف نیاز و ثبت محدوده پروژه در لیدها",
    badge: "کیفیت‌سنجی لید",
    emoji: "📝",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی که درباره خدمات، همکاری، هزینه پروژه یا نحوه شروع کار می‌پرسد",
      comment_action_type: "ai",
      comment_action_text:
        "با لحن مشاورانه و محترمانه بگو برای بررسی دقیق نیاز شما، در دایرکت پیام دادم و چند سوال کوتاه پرسیدم 🙏",
      dm_action_type: "ai",
      dm_action_text:
        "به عنوان مدیر حساب ارشد، با لحن مشاوره‌ای و محترمانه چند سوال کشف نیاز بپرس (نوع کسب‌وکار، هدف پروژه، بازه زمانی و بودجه تقریبی)، پاسخ‌ها را جمع‌بندی کن و در پایان شماره تماس یا راه ارتباطی مشتری را برای ثبت بریف بگیر.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: خدمات: تولید محتوا و مدیریت شبکه اجتماعی | حداقل بازه پروژه ۳ ماه | سوالات بریف: نوع کسب‌وکار، هدف، بودجه...",
    cheatSheetChips: [
      { label: "+ فرآیند شروع همکاری", snippet: "فرآیند شروع همکاری: ۱) جلسه کشف نیاز ۲) ارسال پیشنهاد ۳) تایید و عقد قرارداد ۴) شروع پروژه\n" },
      { label: "+ شرایط و تعرفه پایه", snippet: "تعرفه پایه: شروع از ... تومان (قیمت نهایی پس از بررسی بریف و ارسال پیشنهاد اختصاصی اعلام می‌شود)\n" },
      { label: "+ لینک پورتفولیو و رزومه", snippet: "پورتفولیو و نمونه‌کارها: ...\n" },
      { label: "+ اطلاعات مورد نیاز بریف", snippet: "اطلاعات مورد نیاز بریف: نوع کسب‌وکار، هدف پروژه، مخاطب هدف، بازه زمانی، بودجه تقریبی، نمونه‌های مورد علاقه\n" },
    ],
    targetUrlPlaceholder: "https://agency.ir/brief (لینک فرم بریف — اختیاری)",
  },
  {
    id: "consultation_booking",
    persona: "service_b2b",
    title: "رزرو جلسه مشاوره و تماس",
    subtitle: "دریافت شماره تماس یا ارسال لینک رزرو جلسه (Calendly / جلسه) بدون دست‌انداز",
    badge: "رزرو جلسه",
    emoji: "📅",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی که درخواست مشاوره، تماس، جلسه یا زمان‌بندی دارد",
      comment_action_type: "ai",
      comment_action_text:
        "کوتاه و محترمانه بگو برای هماهنگی جلسه مشاوره، جزئیات و لینک رزرو را در دایرکت فرستادم 📅",
      dm_action_type: "ai",
      dm_action_text:
        "با لحن حرفه‌ای و صمیمی، لینک رزرو جلسه موجود در تقلب‌نامه را بفرست؛ اگر لینکی نیست از مشتری نام، شماره تماس و بهترین زمان تماس را بگیر. بدون فشار و ربات‌وار رفتار کن.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: جلسه مشاوره اولیه ۳۰ دقیقه‌ای رایگان | ساعات پاسخگویی شنبه تا چهارشنبه ۹ تا ۱۷ | لینک رزرو: ...",
    cheatSheetChips: [
      { label: "+ لینک رزرو جلسه", snippet: "لینک رزرو جلسه مشاوره: ...\n" },
      { label: "+ ساعات پاسخگویی", snippet: "ساعات پاسخگویی و جلسات: ...\n" },
      { label: "+ فرآیند شروع همکاری", snippet: "فرآیند شروع همکاری: ۱) جلسه کشف نیاز ۲) ارسال پیشنهاد ۳) تایید و عقد قرارداد ۴) شروع پروژه\n" },
    ],
    targetUrlPlaceholder: "https://calendly.com/... (لینک رزرو جلسه)",
  },
  {
    id: "portfolio_showcase",
    persona: "service_b2b",
    title: "ارسال نمونه‌کار و کاتالوگ خدمات",
    subtitle: "ارسال لینک پورتفولیو و معرفی کوتاه سطوح همکاری و فرآیند کار",
    badge: "اعتمادسازی",
    emoji: "🗂️",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی که نمونه‌کار، رزومه، سوابق یا کاتالوگ خدمات می‌خواهد",
      comment_action_type: "ai",
      comment_action_text:
        "با احترام بگو نمونه‌کارها و معرفی خدمات را در دایرکت برایتان ارسال کردم 🗂️",
      dm_action_type: "ai",
      dm_action_text:
        "لینک پورتفولیو/کاتالوگ موجود در تقلب‌نامه را بفرست، سطوح همکاری و فرآیند کار را در چند جمله کوتاه توضیح بده و در پایان بپرس برای چه پروژه‌ای به دنبال همکاری هستند.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: پورتفولیو: ... | سه سطح همکاری: پایه، حرفه‌ای، سازمانی | مدت متوسط پروژه ۴ هفته...",
    cheatSheetChips: [
      { label: "+ لینک پورتفولیو و رزومه", snippet: "پورتفولیو و نمونه‌کارها: ...\n" },
      { label: "+ شرایط و تعرفه پایه", snippet: "تعرفه پایه: شروع از ... تومان (قیمت نهایی پس از بررسی بریف اعلام می‌شود)\n" },
      { label: "+ فرآیند شروع همکاری", snippet: "فرآیند شروع همکاری: ۱) جلسه کشف نیاز ۲) ارسال پیشنهاد ۳) تایید و عقد قرارداد ۴) شروع پروژه\n" },
    ],
    targetUrlPlaceholder: "https://agency.ir/portfolio.pdf (لینک پورتفولیو یا کاتالوگ خدمات)",
  },

  // ==========================================
  // 🎥 CREATOR & INFLUENCER PLAYBOOKS (`creator`)
  // ==========================================
  {
    id: "creator_magnet",
    persona: "creator",
    title: "بمب فالوور ریلز و ارسال لینک/فایل",
    subtitle: "مخصوص ریلزهای وایرال («کلمه رو کامنت کن تا لینک/فایل بیاد دایرکتت» با شرط فالو)",
    badge: "وایرال و اکسپلور",
    emoji: "🧲",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی که لینک، فایل، پرامپت، آموزش یا کلمه کلیدی ریلز را می‌خواهد",
      comment_action_type: "ai",
      comment_action_text:
        "کوتاه، باانرژی و با لحن یک بلاگر/کریتور جواب بده که لینک/فایل رو فرستادم دایرکتت، حتماً اینباکست رو چک کن 🚀",
      dm_action_type: "ai",
      dm_action_text:
        "با لحن صمیمی کریتور، بابت همراهی تشکر کن و لینک دانلود، پرامپت یا محتوای قول داده‌شده در تقلب‌نامه پست را کامل و مرتب تحویل بده.",
      dm_require_follow: 1,
    },
    cheatSheetPlaceholder:
      "مثال: متن پرامپت یا نکات تکمیلی ویدیو که قول دادی در دایرکت بفرستی + اسم ابزار معرفی‌شده...",
    cheatSheetChips: [
      { label: "+ متن پرامپت / کد", snippet: "متن کامل پرامپت/کد معرفی‌شده در ریلز:\n...\n" },
      { label: "+ اسم اپ / ابزار", snippet: "ابزار و اپلیکیشن استفاده شده در این ویدیو: ...\n" },
      { label: "+ نکته طلایی مکمل", snippet: "نکته مهمی که تو ویدیو جا نشد بگم: ...\n" },
    ],
    targetUrlPlaceholder: "https://youtube.com/... یا لینک دانلود فایل / کانال تلگرام",
  },
  {
    id: "creator_twin",
    persona: "creator",
    title: "همزاد پاسخگو با لحن من (Engagement Twin)",
    subtitle: "پاسخ صمیمی به سوالات مخاطب‌ها در کامنت و دایرکت برای انفجار نرخ تعامل پست",
    badge: "رشد تعامل",
    emoji: "💬",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی زیر پست",
      comment_action_type: "ai",
      comment_action_text:
        "دقیقاً با لحن خودمانی و صمیمی صاحب پیج به کامنت مخاطب جواب بده و اگر سوالی پرسیده که در تقلب‌نامه پست جوابش هست، راهنماییش کن.",
      dm_action_type: "ai",
      dm_action_text:
        "اگر مخاطب سوالی پرسیده یا دنبال جزئیات بیشتر محتوای پست است، در دایرکت مثل یک دوست صمیمی بر اساس تقلب‌نامه پست راهنماییش کن.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: جواب سوالات پرتکرار این پست: ۱) اسم آهنگ: ... ۲) لوکیشن ویدیو: شیراز، کافه ... ۳) دوربینم: iPhone 16 Pro...",
    cheatSheetChips: [
      { label: "+ لوکیشن / مکان", snippet: "لوکیشن این پست/ویدیو: ...\n" },
      { label: "+ تجهیزات / ادیت", snippet: "دوربین و اپ ادیت این ویدیو: ...\n" },
      { label: "+ اسم موزیک / منبع", snippet: "اسم آهنگ یا منبع معرفی‌شده: ...\n" },
    ],
    targetUrlPlaceholder: "لینک یوتیوب / پلی‌لیست / مقاله مرتبط (اختیاری)",
  },
  {
    id: "sponsor_campaign",
    persona: "creator",
    title: "کمپین اسپانسر و رهگیری بازدهی تبلیغ",
    subtitle: "ارسال کد تخفیف و لینک اختصاصی اسپانسر + ثبت آمار دقیق برای گزارش به کارفرما",
    badge: "درآمد تبلیغات",
    emoji: "🎯",
    defaults: {
      trigger_type: "all",
      trigger_context: "هر کامنتی درباره برند اسپانسر، کد تخفیف یا لینک خرید",
      comment_action_type: "ai",
      comment_action_text:
        "بگو کد تخفیف اختصاصی بچه‌های پیج و لینک مستقیم رو برات دایرکت فرستادم 🎁",
      dm_action_type: "ai",
      dm_action_text:
        "معرفی کوتاه و جذاب از برند اسپانسر (طبق تقلب‌نامه) به همراه کد تخفیف اختصاصی و لینک ترکینگ‌دار اسپانسر را ارسال کن.",
      dm_require_follow: 0,
    },
    cheatSheetPlaceholder:
      "مثال: اسپانسر این پست: برند X | کد تخفیف ۲۰ درصدی مخصوص فالوورهای من: MAHDI20 | اعتبار تا آخر هفته...",
    cheatSheetChips: [
      { label: "+ نام برند اسپانسر", snippet: "برند اسپانسر این محتوا: ...\n" },
      { label: "+ کد تخفیف اختصاصی", snippet: "کد تخفیف اختصاصی فالوورهای پیج: ... (میزان تخفیف: ...٪)\n" },
      { label: "+ مزیت پیشنهادی", snippet: "چرا این محصول/سرویس رو پیشنهاد می‌کنم: ...\n" },
    ],
    targetUrlPlaceholder: "https://sponsor-site.ir/... (لینک لندینگ اسپانسر برای رهگیری کلیک)",
  },
];

export function getPlaybooksForPersona(persona?: AccountPersona | string | null): PlaybookPreset[] {
  const normalized = normalizePersona(persona);
  return PLAYBOOK_PRESETS.filter((p) => p.persona === normalized);
}

export function getPlaybookById(id?: string | null): PlaybookPreset | undefined {
  if (!id || id === "custom") return undefined;
  return PLAYBOOK_PRESETS.find((p) => p.id === id);
}

/**
 * Builds an attributed URL with UTM & Instagram user parameters so destination websites
 * (or InFlow Pixel) can stitch the Instagram identity (`ig_user`) and post (`shortcode`).
 */
export function buildAttributedUrl(
  rawUrl?: string | null,
  params?: { username?: string; shortcode?: string; playbookId?: string }
): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!parsed.searchParams.has("utm_source")) {
      parsed.searchParams.set("utm_source", "instagram_inflow");
    }
    if (params?.shortcode && !parsed.searchParams.has("utm_content")) {
      parsed.searchParams.set("utm_content", params.shortcode);
    }
    if (params?.username && params.username !== "user" && params.username !== "instagram_user") {
      parsed.searchParams.set("ig_user", params.username.replace(/^@/, ""));
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Combines Post Caption + Post Supplemental Cheat Sheet + Target URL + Brand Cheat Sheet
 * into a structured ground-truth context block for the AI engine.
 */
export function buildAugmentedPostContext(params: {
  caption?: string | null;
  cheatSheet?: string | null;
  targetUrl?: string | null;
  brandCheatSheet?: string | null;
  websiteUrl?: string | null;
  accountPersona?: string | null;
  recipientUsername?: string;
  shortcode?: string;
}): string {
  const sections: string[] = [];

  const personaLabel = PERSONA_META[normalizePersona(params.accountPersona)].aiLabel;
  sections.push(`[نوع و هویت پیج]: ${personaLabel}`);

  if (params.caption?.trim()) {
    sections.push(`[کپشن پست/محتوا]:\n${params.caption.trim()}`);
  }

  if (params.cheatSheet?.trim()) {
    sections.push(
      `[🔥 تقلب‌نامه و اطلاعات تکمیلی بسیار مهم این پست (خارج از کپشن — اولویت اول پاسخگویی)]:\n${params.cheatSheet.trim()}`
    );
  }

  if (params.targetUrl?.trim()) {
    const attributedLink = buildAttributedUrl(params.targetUrl, {
      username: params.recipientUsername,
      shortcode: params.shortcode,
    });
    sections.push(
      `[🔗 لینک مستقیم این پست (در صورت مرتبط بودن در دایرکت دقیقاً همین لینک را برای کاربر بفرست)]:\n${attributedLink}`
    );
  }

  if (params.brandCheatSheet?.trim()) {
    sections.push(
      `[اطلاعات پایه و قوانین کلی پیج (تقلب‌نامه کلی برند/کریتور)]:\n${params.brandCheatSheet.trim()}`
    );
  }

  if (params.websiteUrl?.trim()) {
    sections.push(`[وب‌سایت/لینک اصلی پیج]: ${params.websiteUrl.trim()}`);
  }

  return sections.join("\n\n");
}
