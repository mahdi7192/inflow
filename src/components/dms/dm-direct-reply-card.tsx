"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";

interface DmDirectReplyCardProps {
  directReplyText: string;
  onChangeText: (text: string) => void;
  lang?: Lang;
}

const TEMPLATES = [
  "سلام {username} عزیز! پیام شما دریافت شد. در اسرع وقت پاسخگوی شما خواهیم بود 🙏",
  "سلام! برای اطلاع از قیمت‌ها و ثبت سفارش، لطفاً به سایت مراجعه کنید: myshop.com 🛍️",
  "درود! ساعت کاری فروشگاه هر روز از ۱۰ صبح الی ۲۲ می‌باشد. برای مشاوره تلفنی تماس بگیرید: ۰۲۱۰۰۰۰۰۰۰۰",
];

export function DmDirectReplyCard({
  directReplyText,
  onChangeText,
  lang = "fa",
}: DmDirectReplyCardProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-secondary text-foreground flex items-center justify-center">
          <MessageSquareText className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">
            {t("dmDirectReplyLabel")}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            این متن دقیقاً به عنوان پاسخ دایرکت برای پیام‌های تریگرشده ارسال خواهد شد.
          </p>
        </div>
      </div>

      <textarea
        rows={4}
        value={directReplyText}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={t("dmDirectReplyPlaceholder")}
        className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed resize-y font-vazir"
      />

      {/* Suggested Fast Templates */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-medium text-muted-foreground">قالب‌های آماده:</span>
        <div className="grid grid-cols-1 gap-1.5">
          {TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChangeText(tmpl)}
              className="text-[11px] text-start p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer truncate"
              title="کلیک برای استفاده از این قالب"
            >
              {tmpl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
