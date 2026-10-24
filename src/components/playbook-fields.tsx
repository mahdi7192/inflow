"use client";

import React from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { M3AssistChip, M3FilterChip, M3TextField } from "@/components/material/m3";
import { M3SectionHeader } from "@/components/material/m3-layout";
import { cn } from "@/lib/utils";

/** Instagram caps link button titles at 20 characters. */
export const BUTTON_TEXT_MAX = 20;

const BUTTON_PRESETS = [
  "مشاهده و خرید 🛍️",
  "دریافت کاتالوگ 📘",
  "ثبت سفارش ✅",
  "مشاهده لینک 🔗",
];

/** Appends a snippet to free-text on a new line (shared by instruction & cheat sheet chips). */
export function appendSnippet(prev: string, snippet: string): string {
  return prev.trim() ? `${prev.trim()}\n${snippet}` : snippet;
}

export function SnippetChips({
  chips,
  onPick,
}: {
  chips: { label: string; snippet: string }[];
  onPick: (snippet: string) => void;
}) {
  return (
    <md-chip-set>
      {chips.map((chip) => (
        <M3AssistChip
          key={chip.label}
          label={chip.label.replace(/^\+\s*/, "")}
          onClick={() => onPick(chip.snippet)}
          icon={<MaterialSymbol name="add" size={18} />}
        />
      ))}
    </md-chip-set>
  );
}

/**
 * Which engine powers a surface:
 * - `rules`: deterministic, non-agentic triggers (keywords → fixed reply / link / follow gate).
 * - `agentic`: the multi-turn RAG DM assistant (knowledge base, website crawl, lead capture).
 */
export type AutomationEngine = "rules" | "agentic";

export function EngineBadge({ engine, className }: { engine: AutomationEngine; className?: string }) {
  const isAgentic = engine === "agentic";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-6 px-2.5 rounded-lg label-small shrink-0",
        isAgentic
          ? "bg-tertiary-container text-on-tertiary-container"
          : "bg-secondary-container text-on-secondary-container",
        className
      )}
    >
      <MaterialSymbol name={isAgentic ? "neurology" : "rule_settings"} size={14} fill={isAgentic} />
      {isAgentic ? "دستیار ایجنتیک AI" : "قوانین قطعی (بدون AI)"}
    </span>
  );
}

/**
 * M3 Link button field: outlined text fields, preset filter chips, and a
 * preview of the Instagram DM button as the user will see it.
 */
export function LinkButtonField({
  buttonText,
  url,
  onButtonTextChange,
  onUrlChange,
  fallbackTitle,
  hint,
}: {
  buttonText: string;
  url: string;
  onButtonTextChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  fallbackTitle: string;
  hint?: string;
}) {
  const cleanUrl = url.trim().replace(/[,;\s]+$/, "");
  const hasUrl = /^https?:\/\/[^\s,;]+\.[^\s,;]+/i.test(cleanUrl);
  const previewTitle = buttonText.trim() || fallbackTitle;

  return (
    <div className="space-y-4">
      <M3SectionHeader
        icon="link"
        title="دکمه لینک در دایرکت (CTA)"
        supporting="یک دکمه ثابت همراه پیام دایرکت ارسال می‌شود."
      />

      <md-chip-set aria-label="عنوان‌های آماده دکمه">
        {BUTTON_PRESETS.map((preset) => (
          <M3FilterChip
            key={preset}
            label={preset}
            selected={buttonText === preset}
            onClick={() => onButtonTextChange(buttonText === preset ? "" : preset)}
          />
        ))}
      </md-chip-set>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <M3TextField
          label="عنوان دکمه"
          value={buttonText}
          placeholder={fallbackTitle}
          maxLength={BUTTON_TEXT_MAX}
          supportingText={`حداکثر ${BUTTON_TEXT_MAX.toLocaleString("fa-IR")} کاراکتر`}
          onValueChange={onButtonTextChange}
        />
        <M3TextField
          label="آدرس مقصد (URL)"
          type="url"
          value={url}
          placeholder="https://..."
          dir="ltr"
          onValueChange={onUrlChange}
        />
      </div>

      {/* Preview */}
      <div className="rounded-xl bg-surface-container-highest/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 label-medium text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <MaterialSymbol name="preview" size={16} />
            پیش‌نمایش در دایرکت اینستاگرام
          </span>
          {hasUrl ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <MaterialSymbol name="check_circle" size={16} fill />
              لینک معتبر
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-destructive">
              <MaterialSymbol name="error" size={16} />
              نیاز به لینک معتبر
            </span>
          )}
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-xs h-10 rounded-full bg-surface-container-lowest elevation-1 flex items-center justify-center gap-2 label-large text-primary">
            <span className="truncate">{previewTitle}</span>
            <MaterialSymbol name="open_in_new" size={16} />
          </div>
        </div>
        {!hasUrl && (
          <p className="body-small text-on-surface-variant text-center">
            بدون لینک معتبر (http/https)، دکمه در دایرکت ارسال نمی‌شود.
          </p>
        )}
      </div>

      {hint && <p className="body-small text-on-surface-variant">{hint}</p>}
    </div>
  );
}
