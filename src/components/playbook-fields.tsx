"use client";

import React from "react";
import { Link2, ExternalLink } from "lucide-react";

/** Instagram caps link button titles at 20 characters. */
export const BUTTON_TEXT_MAX = 20;

const BUTTON_PRESETS = ["مشاهده و خرید 🛍️", "دریافت کاتالوگ 📘", "ثبت سفارش ✅", "مشاهده لینک 🔗"];

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const chipClass =
  "text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer";

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
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((chip) => (
        <button key={chip.label} type="button" onClick={() => onPick(chip.snippet)} className={chipClass}>
          {chip.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Spec 022: Link button block — button title + destination URL, quick presets,
 * and a preview of the Instagram DM button as the user will see it.
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
  const hasUrl = /^https?:\/\//i.test(url.trim());
  const previewTitle = buttonText.trim() || fallbackTitle;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> دکمه لینک در دایرکت
        </div>
        <SnippetChips
          chips={BUTTON_PRESETS.map((p) => ({ label: p, snippet: p }))}
          onPick={onButtonTextChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] gap-2">
        <div className="relative">
          <input
            className={`${field} pe-12`}
            value={buttonText}
            maxLength={BUTTON_TEXT_MAX}
            onChange={(e) => onButtonTextChange(e.target.value)}
            placeholder={fallbackTitle}
            aria-label="متن دکمه"
          />
          <span className="absolute inset-y-0 end-2 flex items-center text-[10px] text-slate-400 tabular-nums">
            {buttonText.length}/{BUTTON_TEXT_MAX}
          </span>
        </div>
        <input
          dir="ltr"
          className={field}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://"
          aria-label="لینک مقصد"
        />
      </div>

      {/* Preview */}
      <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/70 p-3">
        <div className="max-w-[240px] rounded-2xl bg-white/70 backdrop-blur border border-white shadow-xs overflow-hidden">
          <div className="px-3 py-2 text-[11px] text-slate-500">پیش‌نمایش دکمه در دایرکت</div>
          <div
            className={`flex items-center justify-center gap-1.5 border-t border-slate-200/80 px-3 py-2 text-xs font-bold ${
              hasUrl ? "text-indigo-600" : "text-slate-400"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate">{previewTitle}</span>
          </div>
        </div>
        {!hasUrl && (
          <p className="text-[11px] text-slate-500 mt-2">
            بدون لینک معتبر (http/https) دکمه‌ای ارسال نمی‌شود.
          </p>
        )}
      </div>

      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </section>
  );
}
