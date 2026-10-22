/**
 * Spec 018 — Dual-Persona 1-Click Playbooks & Supplemental Cheat Sheet Helpers
 * Supports both E-Commerce/Business (`business`) and Creator/Influencer (`creator`) personas.
 */

export type AccountPersona = "business" | "creator";

export type PlaybookId =
  | "custom"
  | "auto_seller"
  | "viral_gate"
  | "lead_closer"
  | "creator_magnet"
  | "creator_twin"
  | "sponsor_campaign";

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
  // 🛍️ BUSINESS & STORE PLAYBOOKS (`business`)
  // ==========================================
  {
    id: "auto_seller",
    persona: "business",
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
    persona: "business",
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
    persona: "business",
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

export function getPlaybooksForPersona(persona: AccountPersona = "business"): PlaybookPreset[] {
  return PLAYBOOK_PRESETS.filter((p) => p.persona === persona);
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

  const personaLabel =
    params.accountPersona === "creator"
      ? "پیج کریتور / اینفلوئنسر / تولیدکننده محتوا"
      : "پیج فروشگاهی / کسب‌وکار";
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
