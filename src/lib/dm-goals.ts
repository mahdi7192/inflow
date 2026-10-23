// Spec 023: shared tone & goal catalog (used by the agent prompt and the settings UI)

export type DmTone = "friendly" | "formal" | "sales" | "consultant" | "playful";
export type DmGoal = "sales" | "followers" | "lead_capture" | "booking" | "support" | "traffic";

export const DM_TONES: Array<{ id: DmTone; label: string; prompt: string }> = [
  { id: "friendly", label: "صمیمی", prompt: "لحن صمیمی، گرم و خودمانی ولی محترمانه." },
  { id: "formal", label: "رسمی", prompt: "لحن رسمی، مودبانه و حرفه‌ای (شما، بدون شوخی و اصطلاح عامیانه)." },
  { id: "sales", label: "فروشنده", prompt: "لحن فروشنده حرفه‌ای: مشتاق، قانع‌کننده و جهت‌دار به سمت خرید، بدون فشار بیش از حد." },
  { id: "consultant", label: "مشاور", prompt: "لحن مشاور باتجربه: سؤال بپرس، نیاز را بشناس و راهنمایی دقیق بده." },
  { id: "playful", label: "شوخ", prompt: "لحن شوخ‌طبع و پرانرژی با ایموجی مناسب، ولی همچنان مفید و محترمانه." },
];

export const DM_GOALS: Array<{
  id: DmGoal;
  label: string;
  description: string;
  success: string; // success condition injected in the agent prompt
}> = [
  {
    id: "sales",
    label: "فروش",
    description: "هدایت مشتری به انتخاب محصول و ثبت سفارش",
    success:
      "موفقیت = مشتری محصول را انتخاب کرده، لینک محصول برایش ارسال شده (send_link) و آدرس + شماره تماسش ثبت شده (save_customer_info).",
  },
  {
    id: "lead_capture",
    label: "جمع‌آوری سرنخ",
    description: "گرفتن نام، شماره تماس و آدرس مشتری",
    success: "موفقیت = آدرس و شماره تماس مشتری با save_customer_info ثبت شده باشد.",
  },
  {
    id: "booking",
    label: "رزرو / مشاوره",
    description: "گرفتن وقت مشاوره یا رزرو خدمات",
    success: "موفقیت = خدمت مورد نظر مشخص شده و نام + شماره تماس + زمان دلخواه مشتری ثبت شده باشد.",
  },
  {
    id: "followers",
    label: "جذب فالوور",
    description: "تعامل دوستانه و تشویق به دنبال کردن پیج",
    success: "موفقیت = کاربر به پاسخ‌ها واکنش مثبت داده و پیج را دنبال می‌کند.",
  },
  {
    id: "support",
    label: "پشتیبانی",
    description: "پاسخ به سؤال‌ها و حل مشکل مشتری",
    success: "موفقیت = سؤال مشتری با اطلاعات سایت پاسخ داده شده یا در صورت ناتوانی به انسان ارجاع شده باشد.",
  },
  {
    id: "traffic",
    label: "ترافیک سایت",
    description: "هدایت کاربر به صفحات مناسب سایت",
    success: "موفقیت = لینک صفحه مرتبط سایت با send_link برای کاربر ارسال شده باشد.",
  },
];

export const PERSONA_GOAL_RECOMMENDATIONS: Record<string, DmGoal[]> = {
  ecommerce: ["sales", "lead_capture", "support"],
  business: ["lead_capture", "traffic", "support"],
  service_b2b: ["booking", "lead_capture", "support"],
  creator: ["followers", "traffic", "lead_capture"],
};

export function getRecommendedGoals(persona?: string | null): DmGoal[] {
  return PERSONA_GOAL_RECOMMENDATIONS[persona || ""] || PERSONA_GOAL_RECOMMENDATIONS.business;
}

export function getDefaultGoal(persona?: string | null): DmGoal {
  return getRecommendedGoals(persona)[0];
}

export function normalizeTone(v: unknown): DmTone {
  return DM_TONES.some((t) => t.id === v) ? (v as DmTone) : "friendly";
}

export function normalizeGoal(v: unknown, persona?: string | null): DmGoal {
  return DM_GOALS.some((g) => g.id === v) ? (v as DmGoal) : getDefaultGoal(persona);
}

export function parseSecondaryGoals(raw: unknown, primary?: string): DmGoal[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) arr = p;
    } catch {
      /* ignore */
    }
  }
  return Array.from(new Set(arr.filter((g): g is DmGoal => DM_GOALS.some((x) => x.id === g) && g !== primary)));
}
