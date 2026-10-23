import { Lang } from "./i18n";
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


export const PLAYBOOK_LOCALIZED: Partial<
  Record<
    PlaybookId,
    Partial<
      Record<
        Lang,
        {
          title: string;
          subtitle: string;
          badge: string;
          cheatSheetPlaceholder: string;
          cheatSheetChips: { label: string; snippet: string }[];
          targetUrlPlaceholder: string;
        }
      >
    >
  >
> = {
  auto_seller: {
    en: {
      title: "Auto Seller & Price Closer",
      subtitle: "Smart comment reply + automated DM with price, stock & checkout link",
      badge: "Best Seller",
      cheatSheetPlaceholder: "Example: Price $49 | Sizes S to XL in stock (Black sold out) | Fast express shipping...",
      cheatSheetChips: [
        { label: "+ Price & Discount", snippet: "Price: $... (Special follower discount: $...)\n" },
        { label: "+ Sizing & Stock", snippet: "Stock & Sizes: Sizes ... available (Color ... sold out)\n" },
        { label: "+ Shipping Terms", snippet: "Shipping: Worldwide delivery in 2-3 business days\n" },
        { label: "+ How to Order", snippet: "Ordering: Order via website link or DM confirmation\n" },
      ],
      targetUrlPlaceholder: "https://shop.com/product/... (Direct product checkout link)",
    },
    ar: {
      title: "البائع الآلي ومجيب الأسعار",
      subtitle: "رد ذكي على التعليقات + إرسال السعر والمخزون ورابط الشراء في الخاص",
      badge: "الأكثر مبيعاً",
      cheatSheetPlaceholder: "مثال: السعر ٤٩ دولار | المقاسات متوفرة من S إلى XL | شحن سريع خلال ٢-٣ أيام...",
      cheatSheetChips: [
        { label: "+ السعر والخصم", snippet: "السعر: ... (خصم خاص للمتابعين: ...)\n" },
        { label: "+ المقاس والمخزون", snippet: "المقاسات المتوفرة: ... (اللون ... نفد)\n" },
        { label: "+ تفاصيل الشحن", snippet: "الشحن: توصيل سريع لجميع المناطق\n" },
        { label: "+ طريقة الطلب", snippet: "طريقة الطلب: عبر رابط المتجر أو عبر الخاص\n" },
      ],
      targetUrlPlaceholder: "https://shop.com/product/... (رابط شراء المنتج مباشرة)",
    },
  },
  viral_gate: {
    en: {
      title: "Follower Gate & Catalog Delivery",
      subtitle: "Turn Explore views into genuine followers; send catalog or discount link only after follow",
      badge: "Follower Growth",
      cheatSheetPlaceholder: "Example: New follower coupon: WELCOME15 | Complete catalog pricing...",
      cheatSheetChips: [
        { label: "+ Follower Coupon", snippet: "Follower Discount Code: ...\n" },
        { label: "+ Price List", snippet: "Catalog Prices:\n- Item 1: ...\n- Item 2: ...\n" },
        { label: "+ Warranty", snippet: "Warranty: 30-day money back guarantee\n" },
      ],
      targetUrlPlaceholder: "https://shop.com/collection/... (Catalog or product link)",
    },
    ar: {
      title: "قفل المتابعة وإرسال الكتالوج",
      subtitle: "تحويل مشاهدي الإكسبلور إلى متابعين حقيقيين؛ إرسال الكتالوج أو الرابط بعد المتابعة",
      badge: "زيادة المتابعين",
      cheatSheetPlaceholder: "مثال: كود خصم المتابعين الجدد: WELCOME15 | قائمة أسعار الموديلات...",
      cheatSheetChips: [
        { label: "+ كود خصم المتابعين", snippet: "كود خصم خاص بالمتابعين: ...\n" },
        { label: "+ قائمة الأسعار", snippet: "قائمة أسعار الموديلات:\n- الأول: ...\n- الثاني: ...\n" },
        { label: "+ الضمان والاستبدال", snippet: "الضمان: استبدال مجاني خلال ٧ أيام\n" },
      ],
      targetUrlPlaceholder: "https://shop.com/collection/... (رابط الكتالوج أو التشكيلة)",
    },
  },
  lead_closer: {
    en: {
      title: "Direct Lead & Order Closer",
      subtitle: "Ideal for pages without a website; guides customers to send their phone number and size",
      badge: "No Website Needed",
      cheatSheetPlaceholder: "Example: Orders handled in DM | Card transfer payment | Please provide phone number...",
      cheatSheetChips: [
        { label: "+ Payment Details", snippet: "Payment Method: Card transfer or direct payment\n" },
        { label: "+ Booking Steps", snippet: "To reserve: Send your desired size and phone number\n" },
        { label: "+ Delivery Estimate", snippet: "Estimated delivery: 2-4 business days\n" },
      ],
      targetUrlPlaceholder: "https://shop.com/order/... (Optional link)",
    },
    ar: {
      title: "صياد أرقام التواصل وحجز الطلبات",
      subtitle: "مناسب للحسابات بدون متجر إلكتروني؛ توجيه العميل لإرسال رقم الهاتف والمقاس",
      badge: "بدون متجر",
      cheatSheetPlaceholder: "مثال: تسجيل الطلبات في الخاص | تحويل بنكي | يرجى إرسال رقم الجوال...",
      cheatSheetChips: [
        { label: "+ تفاصيل الدفع", snippet: "طريقة الدفع: تحويل بنكي مباشر\n" },
        { label: "+ خطوات الحجز", snippet: "لتثبيت الحجز: أرسل المقاس المطلوب ورقم الجوال\n" },
        { label: "+ مدة التوصيل", snippet: "التوصيل المتوقع: خلال ٢ إلى ٤ أيام عمل\n" },
      ],
      targetUrlPlaceholder: "https://shop.com/order/... (رابط اختياري)",
    },
  },
  brief_qualifier: {
    en: {
      title: "Smart Lead Qualification & Brief Intake",
      subtitle: "Qualifies prospects in DM, gathers project budget and timeline without shopping carts",
      badge: "Lead Qualification",
      cheatSheetPlaceholder: "Example: UI/UX design and development | Budgets start at $1,500 | Timeline 3-6 weeks...",
      cheatSheetChips: [
        { label: "+ Project Requirements", snippet: "Project Requirements & Brief: ...\n" },
        { label: "+ Starting Rates", snippet: "Starting Rates: Starting from $... depending on scope\n" },
        { label: "+ Onboarding Process", snippet: "How to Start: Free discovery call followed by proposal\n" },
        { label: "+ Portfolio Link", snippet: "Portfolio: Available upon request or via link\n" },
      ],
      targetUrlPlaceholder: "https://agency.com/brief (Brief intake form link)",
    },
    ar: {
      title: "تأهيل العملاء وجمع متطلبات المشروع",
      subtitle: "تأهيل العملاء المحتملين في الخاص وجمع الميزانية ومواعيد التسليم بدون سلة شراء",
      badge: "تأهيل العملاء",
      cheatSheetPlaceholder: "مثال: وكالة تسويق رقمي | الميزانيات تبدأ من ١٥٠٠ دولار | المدة ٣ أسابيع...",
      cheatSheetChips: [
        { label: "+ متطلبات المشروع", snippet: "معلومات موجز المشروع (البريف): ...\n" },
        { label: "+ الأسعار التقديرية", snippet: "الأسعار المبدئية: تبدأ من ... حسب نطاق العمل\n" },
        { label: "+ خطوات البدء", snippet: "خطوات البدء: مكالمة استكشافية مجانية ثم عرض مالي\n" },
        { label: "+ رابط الأعمال", snippet: "معرض الأعمال: متاح عبر الرابط أو عند الطلب\n" },
      ],
      targetUrlPlaceholder: "https://agency.com/brief (رابط نموذج متطلبات المشروع)",
    },
  },
  consultation_booking: {
    en: {
      title: "Consultation Booking & Phone Capture",
      subtitle: "Invites prospective clients to book a discovery call or leave their phone number for follow-up",
      badge: "High Conversion",
      cheatSheetPlaceholder: "Example: Free 20-min strategy call | Send your phone number and preferred time...",
      cheatSheetChips: [
        { label: "+ Booking Calendar", snippet: "Booking Calendar: ...\n" },
        { label: "+ Contact Hours", snippet: "Working hours & contact: Mon-Fri 9AM-5PM\n" },
        { label: "+ Call Overview", snippet: "Session Overview: 1-on-1 strategy and project roadmap\n" },
      ],
      targetUrlPlaceholder: "https://calendly.com/... (Consultation booking link)",
    },
    ar: {
      title: "حجز جلسات الاستشارة وجمع أرقام التواصل",
      subtitle: "دعوة العملاء المحتملين لحجز مكالمة استكشافية أو إرسال رقم الهاتف",
      badge: "تحويل عالي",
      cheatSheetPlaceholder: "مثال: استشارة استراتيجية مجانية ٢٠ دقيقة | أرسل رقم الجوال والوقت المفضل...",
      cheatSheetChips: [
        { label: "+ رابط جدول المواعيد", snippet: "جدول المواعيد: ...\n" },
        { label: "+ أوقات العمل", snippet: "ساعات العمل والتواصل: من الأحد إلى الخميس ٩ إلى ٥\n" },
        { label: "+ محاور الجلسة", snippet: "محاور الجلسة: تحليل الاحتياج وخطة العمل المقترحة\n" },
      ],
      targetUrlPlaceholder: "https://calendly.com/... (رابط حجز جلسة الاستشارة)",
    },
  },
  portfolio_showcase: {
    en: {
      title: "Portfolio & Case Study Showcase",
      subtitle: "Sends your portfolio, service deck, and verified client testimonials directly to interested leads",
      badge: "Trust Builder",
      cheatSheetPlaceholder: "Example: Case study results: 240% ROI for client X | Download our full PDF deck...",
      cheatSheetChips: [
        { label: "+ Case Study Link", snippet: "Case Study & Results: ...\n" },
        { label: "+ Client Testimonial", snippet: "Client Feedback: ...\n" },
        { label: "+ Service Deck PDF", snippet: "Full Service Deck: ...\n" },
      ],
      targetUrlPlaceholder: "https://agency.com/cases (Portfolio or deck link)",
    },
    ar: {
      title: "معرض الأعمال وقصص النجاح",
      subtitle: "إرسال ملف الأعمال ونماذج المشاريع السابقة وآراء العملاء مباشرة في الخاص",
      badge: "بناء الثقة",
      cheatSheetPlaceholder: "مثال: نتائج قصة نجاح عميل: زيادة مبيعات بنسبة ٢٤٠٪ | حمل ملف الأعمال الكامل...",
      cheatSheetChips: [
        { label: "+ رابط قصة النجاح", snippet: "قصة النجاح والنتائج: ...\n" },
        { label: "+ آراء العملاء", snippet: "رأي العميل: تقييم ممتاز ونتائج قياسية\n" },
        { label: "+ الملف التعريفي", snippet: "الملف التعريفي والخدمات: ...\n" },
      ],
      targetUrlPlaceholder: "https://agency.com/cases (رابط معرض الأعمال أو الملف)",
    },
  },
  creator_magnet: {
    en: {
      title: "Resource Delivery & Engagement Magnet",
      subtitle: "Deliver free guides, prompt sheets, or presets in DM while boosting post comment rank",
      badge: "Viral Magnet",
      cheatSheetPlaceholder: "Example: Free 20-page AI guide | Download link active for 48 hours...",
      cheatSheetChips: [
        { label: "+ Download Link", snippet: "Download Link: ...\n" },
        { label: "+ Next Steps", snippet: "After downloading: Join our community discussion\n" },
        { label: "+ Bonus Resource", snippet: "Bonus Resource: Extra cheat sheet included\n" },
      ],
      targetUrlPlaceholder: "https://notion.so/... (Resource or guide link)",
    },
    ar: {
      title: "توزيع الموارد ومغناطيس التفاعل",
      subtitle: "إرسال ملف مجاني، كتاب إلكتروني أو قوالب في الخاص مع رفع تفاعل المنشور",
      badge: "انتشار سريع",
      cheatSheetPlaceholder: "مثال: دليل مجاني شامل للذكاء الاصطناعي | الرابط متاح لمدة ٤٨ ساعة...",
      cheatSheetChips: [
        { label: "+ رابط التحميل", snippet: "رابط التحميل المباشر: ...\n" },
        { label: "+ الخطوة التالية", snippet: "بعد التحميل: انضم لمجتمع المناقشة\n" },
        { label: "+ هدية إضافية", snippet: "هدية إضافية: ملخص جاهز مرفق\n" },
      ],
      targetUrlPlaceholder: "https://notion.so/... (رابط المورد أو الملف)",
    },
  },
  creator_twin: {
    en: {
      title: "Creator Digital Twin & Community Chat",
      subtitle: "Engages fans with your genuine personal tone, answering FAQs and sparking conversations",
      badge: "Authentic Vibe",
      cheatSheetPlaceholder: "Example: Gear I use: Sony A7IV + 24-70 GM | Editing: Final Cut Pro...",
      cheatSheetChips: [
        { label: "+ Creator Gear/Tools", snippet: "Gear & Tools: ...\n" },
        { label: "+ Channel Links", snippet: "YouTube / Telegram: ...\n" },
        { label: "+ FAQ Answer", snippet: "Common question answer: ...\n" },
      ],
      targetUrlPlaceholder: "https://youtube.com/@... (Channel link)",
    },
    ar: {
      title: "النسخة الرقمية لصانع المحتوى والتفاعل",
      subtitle: "تفاعل أصيل مع المتابعين بأسلوبك الشخصي والإجابة على الأسئلة الشائعة",
      badge: "تفاعل أصيل",
      cheatSheetPlaceholder: "مثال: معدات التصوير: كاميرا سوني | برامج المونتاج: فاينل كت...",
      cheatSheetChips: [
        { label: "+ المعدات والأدوات", snippet: "المعدات والبرامج: ...\n" },
        { label: "+ روابط القنوات", snippet: "قناة يوتيوب وتليجرام: ...\n" },
        { label: "+ إجابة سؤال شائع", snippet: "إجابة على السؤال المتكرر: ...\n" },
      ],
      targetUrlPlaceholder: "https://youtube.com/@... (رابط القناة أو الحساب)",
    },
  },
  sponsor_campaign: {
    en: {
      title: "Sponsor Campaign & Tracked Referral",
      subtitle: "Sends sponsor discount links or promo codes in DM with automated tracking",
      badge: "Monetization",
      cheatSheetPlaceholder: "Example: Sponsor: Brand X | Special promo code: CREATOR20 for 20% off...",
      cheatSheetChips: [
        { label: "+ Promo Code", snippet: "Sponsor Promo Code: ...\n" },
        { label: "+ Campaign Link", snippet: "Direct Campaign Link: ...\n" },
        { label: "+ Expiration Date", snippet: "Offer valid until: ...\n" },
      ],
      targetUrlPlaceholder: "https://brand.com/partner?... (Tracked sponsor link)",
    },
    ar: {
      title: "حملات الرعاة وروابط الإحالة",
      subtitle: "إرسال أكواد الخصم وروابط الرعاة المخصصة في الخاص مع تتبع النقرات",
      badge: "تحقيق الدخل",
      cheatSheetPlaceholder: "مثال: الراعي: متجر س | كود الخصم: CREATOR20 لخصم ٢٠٪...",
      cheatSheetChips: [
        { label: "+ كود الخصم", snippet: "كود الخصم الخاص: ...\n" },
        { label: "+ رابط الحملة", snippet: "رابط الشراء المباشر للراعي: ...\n" },
        { label: "+ تاريخ انتهاء العرض", snippet: "العرض سارٍ حتى: ...\n" },
      ],
      targetUrlPlaceholder: "https://brand.com/partner?... (رابط الرعاية مع التتبع)",
    },
  },
};

export const PERSONA_LOCALIZED: Record<
  AccountPersona,
  Partial<
    Record<
      Lang,
      {
        tabLabel: string;
        studioLabel: string;
        targetUrlLabel: string;
        brandSheetPlaceholder: string;
      }
    >
  >
> = {
  ecommerce: {
    en: {
      tabLabel: "Store & Products",
      studioLabel: "Store Studio",
      targetUrlLabel: "Direct Product Purchase or Catalog Link (Optional — with auto click tracking):",
      brandSheetPlaceholder: "Example: Fast 2-3 business days delivery | 48-hour return & exchange policy | Orders over $50 ship free...",
    },
    ar: {
      tabLabel: "متجر ومنتجات",
      studioLabel: "استوديو المتجر",
      targetUrlLabel: "رابط شراء المنتج مباشرة أو الكتالوج (اختياري — مع تتبع النقرات):",
      brandSheetPlaceholder: "مثال: شحن سريع لجميع المناطق | إمكانية الاستبدال خلال ٤٨ ساعة | خدمة العملاء يومياً من ٩ إلى ٦...",
    },
  },
  service_b2b: {
    en: {
      tabLabel: "Services & B2B",
      studioLabel: "Services Studio",
      targetUrlLabel: "Brief Form, Consultation Booking, or Portfolio Link (Optional — with auto click tracking):",
      brandSheetPlaceholder: "Example: Content & digital marketing agency | Consultative & professional tone | Free 30-min discovery call | Hours Mon-Fri 9-5...",
    },
    ar: {
      tabLabel: "خدمات واستشارات",
      studioLabel: "استوديو الخدمات",
      targetUrlLabel: "رابط نموذج البريف، حجز الاستشارة أو معرض الأعمال (اختياري — مع تتبع النقرات):",
      brandSheetPlaceholder: "مثال: وكالة تسويق رقمي وإنتاج محتوى | أسلوب مهني واستشاري | جلسة استشارة مجانية ٣٠ دقيقة...",
    },
  },
  creator: {
    en: {
      tabLabel: "Creator & Media",
      studioLabel: "Creator Studio",
      targetUrlLabel: "File, Video, or Sponsor Landing Link (Automated DM delivery with click tracking):",
      brandSheetPlaceholder: "Example: Tech & AI creator | Energetic, friendly tone | Telegram channel and YouTube link in bio...",
    },
    ar: {
      tabLabel: "صانع محتوى وميديا",
      studioLabel: "استوديو صناع المحتوى",
      targetUrlLabel: "رابط الملف، الفيديو أو صفحة الراعي (إرسال تلقائي في الخاص مع تتبع النقرات):",
      brandSheetPlaceholder: "مثال: صانع محتوى في التقنية والذكاء الاصطناعي | أسلوب ودي وحيوي | رابط قناتي في البايو...",
    },
  },
};

export function getPersonaMeta(persona?: AccountPersona | string | null, lang: Lang = "fa") {
  const normalized = normalizePersona(persona);
  const base = PERSONA_META[normalized];
  const override = PERSONA_LOCALIZED[normalized]?.[lang];
  if (!override) return base;
  return {
    ...base,
    tabLabel: override.tabLabel || base.tabLabel,
    studioLabel: override.studioLabel || base.studioLabel,
    targetUrlLabel: override.targetUrlLabel || base.targetUrlLabel,
    brandSheetPlaceholder: override.brandSheetPlaceholder || base.brandSheetPlaceholder,
  };
}

export function getPlaybooksForPersona(
  persona?: AccountPersona | string | null,
  lang: Lang = "fa"
): PlaybookPreset[] {
  const normalized = normalizePersona(persona);
  const rawList = PLAYBOOK_PRESETS.filter((p) => p.persona === normalized);
  if (lang === "fa") return rawList;

  return rawList.map((p) => {
    const loc = PLAYBOOK_LOCALIZED[p.id]?.[lang];
    if (!loc) return p;
    return {
      ...p,
      title: loc.title || p.title,
      subtitle: loc.subtitle || p.subtitle,
      badge: loc.badge || p.badge,
      cheatSheetPlaceholder: loc.cheatSheetPlaceholder || p.cheatSheetPlaceholder,
      cheatSheetChips: loc.cheatSheetChips || p.cheatSheetChips,
      targetUrlPlaceholder: loc.targetUrlPlaceholder || p.targetUrlPlaceholder,
    };
  });
}

export function getPlaybookById(
  id?: string | null,
  lang: Lang = "fa"
): PlaybookPreset | undefined {
  if (!id || id === "custom") return undefined;
  const p = PLAYBOOK_PRESETS.find((item) => item.id === id);
  if (!p || lang === "fa") return p;
  const loc = PLAYBOOK_LOCALIZED[p.id]?.[lang];
  if (!loc) return p;
  return {
    ...p,
    title: loc.title || p.title,
    subtitle: loc.subtitle || p.subtitle,
    badge: loc.badge || p.badge,
    cheatSheetPlaceholder: loc.cheatSheetPlaceholder || p.cheatSheetPlaceholder,
    cheatSheetChips: loc.cheatSheetChips || p.cheatSheetChips,
    targetUrlPlaceholder: loc.targetUrlPlaceholder || p.targetUrlPlaceholder,
  };
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
  hasInteractiveButton?: boolean;
  targetButtonText?: string | null;
}): string {
  const sections: string[] = [];

  const personaLabel = PERSONA_META[normalizePersona(params.accountPersona)].aiLabel;
  sections.push(`[نوع و هویت پیج]: ${personaLabel}`);

  if (params.caption?.trim()) {
    sections.push(`[کپشن پست/محتوا]:\n${params.caption.trim()}`);
  }

  if (params.cheatSheet?.trim()) {
    sections.push(
      `[اطلاعات تکمیلی این پست]:\n${params.cheatSheet.trim()}`
    );
  }

  if (params.targetUrl?.trim()) {
    const attributedLink = buildAttributedUrl(params.targetUrl, {
      username: params.recipientUsername,
      shortcode: params.shortcode,
    });
    if (params.hasInteractiveButton) {
      sections.push(
        `[دکمه تعاملی پیوست به پیام]: این پیام به صورت دکمه‌دار ارسال می‌شود که دکمه‌ای با عنوان «${params.targetButtonText || "مشاهده و خرید 🛍️"}» همراه با لینک اختصاصی زیر پیام قرار می‌گیرد.\n⛔ قانون اکید: به هیچ عنوان هیچ‌گونه لینک اینترنتی، آدرس سایت یا URL (مانند http یا https) در متن پیام ننویس. لینک مستقیماً درون دکمه قرار دارد. در پایان پیامت فقط کاربر را تشویق کن که روی دکمه زیر پیام کلیک کند.`
      );
    } else {
      sections.push(
        `[🔗 لینک مستقیم این پست (در صورت مرتبط بودن در دایرکت دقیقاً همین لینک را برای کاربر بفرست)]:\n${attributedLink}`
      );
    }
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
