"use client";

import React from "react";
import { Sparkles, Key, MessageSquare, Plus, X } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

interface DmTriggerSelectorProps {
  triggerType: "all" | "keywords" | "ai_context";
  triggerKeywords: string;
  triggerContext: string;
  onChangeType: (type: "all" | "keywords" | "ai_context") => void;
  onChangeKeywords: (keywords: string) => void;
  onChangeContext: (context: string) => void;
  lang?: Lang;
}

const POPULAR_KEYWORDS = ["قیمت", "سفارش", "موجودی", "سایزبندی", "تخفیف", "هزینه ارسال"];

export function DmTriggerSelector({
  triggerType,
  triggerKeywords,
  triggerContext,
  onChangeType,
  onChangeKeywords,
  onChangeContext,
  lang = "fa",
}: DmTriggerSelectorProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const currentKeywordList = triggerKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const addKeyword = (kw: string) => {
    if (!currentKeywordList.includes(kw)) {
      const updated = [...currentKeywordList, kw].join(", ");
      onChangeKeywords(updated);
    }
  };

  const removeKeyword = (kw: string) => {
    const updated = currentKeywordList.filter((k) => k !== kw).join(", ");
    onChangeKeywords(updated);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
      <div>
        <h4 className="text-sm font-bold text-foreground">
          {t("dmTriggerTabTitle")}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          مشخص کنید ربات دایرکت با چه پیام‌هایی تریگر شود.
        </p>
      </div>

      {/* Trigger Mode Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Mode: ALL */}
        <button
          type="button"
          onClick={() => onChangeType("all")}
          className={`flex items-start gap-3 p-3 rounded-lg border text-start transition-all cursor-pointer ${
            triggerType === "all"
              ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
              : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
              triggerType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold block text-foreground">
              {t("dmTriggerAll")}
            </span>
            <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
              {t("dmTriggerAllDesc")}
            </span>
          </div>
        </button>

        {/* Mode: KEYWORDS */}
        <button
          type="button"
          onClick={() => onChangeType("keywords")}
          className={`flex items-start gap-3 p-3 rounded-lg border text-start transition-all cursor-pointer ${
            triggerType === "keywords"
              ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
              : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
              triggerType === "keywords" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Key className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold block text-foreground">
              {t("dmTriggerKeywords")}
            </span>
            <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
              {t("dmTriggerKeywordsDesc")}
            </span>
          </div>
        </button>

        {/* Mode: AI CONTEXT */}
        <button
          type="button"
          onClick={() => onChangeType("ai_context")}
          className={`flex items-start gap-3 p-3 rounded-lg border text-start transition-all cursor-pointer ${
            triggerType === "ai_context"
              ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
              : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
              triggerType === "ai_context" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold block text-foreground">
              {t("dmTriggerAi")}
            </span>
            <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
              {t("dmTriggerAiDesc")}
            </span>
          </div>
        </button>
      </div>

      {/* Sub-config: Keywords */}
      {triggerType === "keywords" && (
        <div className="space-y-3 pt-2 border-t border-border animate-in fade-in">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">
              {t("triggerKeywordsLabel")}
            </label>
            <input
              type="text"
              value={triggerKeywords}
              onChange={(e) => onChangeKeywords(e.target.value)}
              placeholder={t("dmTriggerKeywordsPlaceholder")}
              className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Quick Keyword Add Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground">کلمات کلیدی پرتکرار:</span>
            {POPULAR_KEYWORDS.map((kw) => {
              const exists = currentKeywordList.includes(kw);
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => (exists ? removeKeyword(kw) : addKeyword(kw))}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors cursor-pointer ${
                    exists
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/70 text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {exists ? <X className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                  <span>{kw}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-config: AI Intent Condition */}
      {triggerType === "ai_context" && (
        <div className="space-y-2 pt-2 border-t border-border animate-in fade-in">
          <label className="text-xs font-medium text-foreground block">
            {t("dmTriggerContextLabel")}
          </label>
          <textarea
            rows={3}
            value={triggerContext}
            onChange={(e) => onChangeContext(e.target.value)}
            placeholder={t("dmTriggerContextPlaceholder")}
            className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed resize-y font-vazir"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            💡 اگر پیام کاربر با این شرط مفهومی مطابقت نداشته باشد، پیام به عنوان ردشده (Skipped) ثبت شده و هیچ پاسخی ارسال نمی‌شود تا در هزینه‌ها صرفه‌جویی شود.
          </p>
        </div>
      )}
    </div>
  );
}
