"use client";

import React from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";

interface DmAiPromptEditorProps {
  promptInstructions: string;
  onChangePrompt: (instructions: string) => void;
  lang?: Lang;
}

const HELPER_SNIPPETS = [
  {
    title: "قالب فروشگاهی استاندارد",
    content: `شما کارشناس فروش و پشتیبانی مهربان و حرفه‌ای فروشگاه هستید.
- همیشه با نام مشتری (در صورت مشخص بودن) سلام کنید و لحن صمیمی و محترمانه داشته باشید.
- برای پاسخ به سوالات قیمت، موجودی، جدول سایزبندی و مشخصات فنی، دقیقاً طبق اطلاعات و قیمت‌های ارائه‌شده در همین کانتکست پاسخ دهید.
- در صورت اتمام موجودی، با خوش‌رویی عذرخواهی کرده و مدل‌ها یا رنگ‌های مشابه موجود را پیشنهاد دهید.
- پاسخ‌های دایرکت را مختصر، گیرا و حداکثر در ۳ الی ۴ جمله بنویسید تا خواندن آن در موبایل راحت باشد.`,
  },
  {
    title: "پشتیبانی خدمات و مشاوره",
    content: `شما مشاور ارشد و پاسخگوی رسمی هستید.
- ابتدا به سوال مشتری با دقت گوش دهید و به شکل مستقیم و مستدل پاسخ دهید.
- برای شرایط اخذ ویزا و مدارک به لینک‌های وب‌سایت استناد کنید.
- در پایان پیام، کاربر را دعوت به اقدام (ثبت‌نام، پیام در واتساپ یا تماس) کنید.`,
  },
];

const PROMPT_CHIPS = [
  "پاسخ حداکثر در ۳ جمله کوتاه",
  "استفاده از ایموجی‌های مناسب 🛍️",
  "دعوت به ثبت سفارش در سایت",
  "پیشنهاد محصول مشابه در صورت اتمام موجودی",
  "لحن صمیمی و دوستانه",
];

export function DmAiPromptEditor({
  promptInstructions,
  onChangePrompt,
  lang = "fa",
}: DmAiPromptEditorProps) {
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const handleApplySnippet = (snippet: string, idx: number) => {
    onChangePrompt(snippet);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleAddChip = (chipText: string) => {
    const next = promptInstructions
      ? `${promptInstructions.trim()}\n- ${chipText}`
      : `- ${chipText}`;
    onChangePrompt(next);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {t("dmAiPromptLabel")}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              دستورالعمل جامع رفتار، لحن و شرایط تصمیم‌گیری هوش مصنوعی در پاسخ به دایرکت‌ها.
            </p>
          </div>
        </div>
      </div>

      {/* Main Textarea */}
      <textarea
        rows={8}
        value={promptInstructions}
        onChange={(e) => onChangePrompt(e.target.value)}
        placeholder={t("dmAiPromptPlaceholder")}
        className="w-full text-xs p-3.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed resize-y font-vazir font-sans text-foreground"
      />

      {/* Quick Guideline Chips */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          دستورات آماده برای افزودن به پرامپت:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddChip(chip)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-secondary/70 hover:bg-secondary border border-border text-foreground transition-colors cursor-pointer"
            >
              + {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Strategy Snippets */}
      <div className="pt-2 border-t border-border space-y-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          الگوهای پرامپت آماده:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {HELPER_SNIPPETS.map((snip, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-border/70 bg-secondary/30 flex flex-col justify-between gap-2"
            >
              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">
                  {snip.title}
                </span>
                <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                  {snip.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleApplySnippet(snip.content, idx)}
                className="self-start text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                {copiedIdx === idx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>اعمال شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>استفاده از این الگو</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
