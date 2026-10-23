"use client";

import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { useWorkspace } from "@/components/layout/workspace-context";
import { LinkButtonField, SnippetChips, appendSnippet } from "@/components/playbook-fields";

export interface DrawerStoryData {
  id: string;
  account_username: string;
  media_type: string;
  thumbnail_url: string;
  media_url: string;
  caption: string;
  created_at: string | null;
  expires_at: string | null;
  is_active?: boolean;
  auto_reply: number;
  trigger_type: "all" | "keywords" | "ai_context";
  trigger_keywords: string;
  reply_mode: "direct" | "ai";
  reply_text: string;
  target_url: string;
  target_button_text?: string;
  cheat_sheet: string;
  require_follow: number;
  emoji_reaction_action: "ignore" | "like" | "quick_reply";
}

interface Props {
  story: DrawerStoryData | null;
  accountUsername: string;
  onClose: () => void;
  onSaved: (story: DrawerStoryData) => void;
}

function proxied(url: string) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const TRIGGERS: { id: DrawerStoryData["trigger_type"]; label: string }[] = [
  { id: "all", label: "همه پاسخ‌ها" },
  { id: "keywords", label: "کلمات کلیدی" },
  { id: "ai_context", label: "تشخیص هوشمند" },
];
const EMOJI: { id: DrawerStoryData["emoji_reaction_action"]; label: string }[] = [
  { id: "ignore", label: "نادیده بگیر" },
  { id: "like", label: "فقط ثبت کن" },
  { id: "quick_reply", label: "پاسخ کوتاه تشکر" },
];

const AI_CHIPS = [
  { label: "+ قیمت و جزئیات", snippet: "قیمت و مشخصات محصول این استوری را بگو." },
  { label: "+ دعوت به خرید", snippet: "کاربر را با لحن دوستانه به خرید یا ثبت سفارش دعوت کن." },
  { label: "+ پاسخ کوتاه و صمیمی", snippet: "کوتاه، صمیمی و با یک ایموجی جواب بده." },
];

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            value === o.id
              ? "bg-primary text-on-primary border-primary shadow-2xs"
              : "bg-surface-container text-foreground border-outline-variant/60 hover:bg-surface-container-high"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StoryPlaybookDrawer({ story, accountUsername, onClose, onSaved }: Props) {
  const workspace = useWorkspace();
  const dir = workspace?.dir ?? "rtl";
  const lang = workspace?.lang ?? "fa";

  const [autoReply, setAutoReply] = useState(false);
  const [triggerType, setTriggerType] = useState<DrawerStoryData["trigger_type"]>("all");
  const [keywords, setKeywords] = useState("");
  const [replyMode, setReplyMode] = useState<"direct" | "ai">("ai");
  const [replyText, setReplyText] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetButtonText, setTargetButtonText] = useState("");
  const [cheatSheet, setCheatSheet] = useState("");
  const [requireFollow, setRequireFollow] = useState(false);
  const [emoji, setEmoji] = useState<DrawerStoryData["emoji_reaction_action"]>("ignore");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!story) return;
    setAutoReply(story.auto_reply === 1);
    setTriggerType(story.trigger_type || "all");
    setKeywords(story.trigger_keywords || "");
    setReplyMode(story.reply_mode || "ai");
    setReplyText(story.reply_text || "");
    setTargetUrl(story.target_url || "");
    setTargetButtonText(story.target_button_text || "");
    setCheatSheet(story.cheat_sheet || "");
    setRequireFollow(story.require_follow === 1);
    setEmoji(story.emoji_reaction_action || "ignore");
    setSaved(false);
    setError("");
  }, [story]);

  useEffect(() => {
    if (!story) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [story]);

  if (!story) return null;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/accounts/${accountUsername}/stories/${encodeURIComponent(story.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply: autoReply,
          trigger_type: triggerType,
          trigger_keywords: keywords,
          reply_mode: replyMode,
          reply_text: replyText,
          target_url: targetUrl,
          target_button_text: targetButtonText,
          cheat_sheet: cheatSheet,
          require_follow: requireFollow,
          emoji_reaction_action: emoji,
        }),
      });
      const data = await res.json();
      if (data.success && data.story) {
        onSaved({ ...story, ...data.story });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error === "Invalid target_url" ? "لینک باید با http یا https شروع شود" : "ذخیره نشد");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-outline-variant/80 bg-surface-container px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex-1" onClick={onClose} />
      <div
        dir={dir}
        className="relative w-full max-w-xl bg-surface h-[100dvh] shadow-xl border-s border-outline-variant/80 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/60 bg-surface-container-low flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant/60 shrink-0 flex items-center justify-center text-muted-foreground">
              {story.media_type?.toUpperCase() === "VIDEO" ? (
                <MaterialSymbol name="movie" size={24} />
              ) : (
                <MaterialSymbol name="image" size={24} />
              )}
              {(story.thumbnail_url || story.media_url) && (
                <img
                  src={proxied(story.thumbnail_url || story.media_url)}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">تنظیمات سناریوی این استوری</div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{story.caption || "استوری بدون کپشن"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <MaterialSymbol name="close" size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60">
            <div>
              <div className="text-sm font-bold text-foreground">پاسخ خودکار به ریپلای‌های این استوری</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                فقط ریپلای همین استوری با تنظیمات پایین بررسی می‌شود؛ قوانین دایرکت عمومی دخالتی ندارند.
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>

          <div className={autoReply ? "space-y-6" : "space-y-6 opacity-40 pointer-events-none"}>
            <section className="space-y-2 p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60">
              <div className="text-xs font-bold text-foreground">چه ریپلای‌هایی پاسخ داده شود؟</div>
              <Seg value={triggerType} options={TRIGGERS} onChange={setTriggerType} />
              {triggerType === "keywords" && (
                <input
                  className={field}
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="قیمت، خرید، لینک (با ویرگول جدا کنید)"
                />
              )}
            </section>

            <section className="space-y-2.5 p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60">
              <div className="text-xs font-bold text-foreground">نوع پاسخ</div>
              <Seg
                value={replyMode}
                options={[
                  { id: "ai", label: "هوش مصنوعی" },
                  { id: "direct", label: "متن ثابت" },
                ]}
                onChange={setReplyMode}
              />
              {replyMode === "direct" && (
                <textarea
                  className={field}
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="متن پاسخ ثابت…"
                />
              )}
              {replyMode === "ai" && (
                <>
                  <textarea
                    className={field}
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="دستورالعمل اختیاری برای هوش مصنوعی در پاسخ به این استوری (مثلاً: قیمت را بگو و به خرید دعوت کن)…"
                  />
                  <SnippetChips
                    chips={AI_CHIPS}
                    onPick={(snippet) => setReplyText((prev) => appendSnippet(prev, snippet))}
                  />
                </>
              )}
            </section>

            <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60">
              <LinkButtonField
                buttonText={targetButtonText}
                url={targetUrl}
                onButtonTextChange={setTargetButtonText}
                onUrlChange={setTargetUrl}
                fallbackTitle={lang === "en" ? "Open link 🔗" : "مشاهده لینک 🔗"}
              />
            </div>

            <section className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60">
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MaterialSymbol name="person_add" size={16} /> قفل فالو
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">پاسخ فقط بعد از فالو کردن پیج ارسال می‌شود.</p>
              </div>
              <Switch checked={requireFollow} onCheckedChange={setRequireFollow} />
            </section>

            <section className="space-y-2 p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MaterialSymbol name="sentiment_satisfied" size={16} /> واکنش ایموجی (بدون متن)
              </div>
              <Seg value={emoji} options={EMOJI} onChange={setEmoji} />
              <p className="text-xs text-muted-foreground">ریپلای‌های فقط ایموجی هرگز به هوش مصنوعی ارسال نمی‌شوند.</p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/60 bg-surface-container-low flex items-center justify-between gap-3">
          <span className="text-xs text-destructive font-medium">{error}</span>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-sm font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
          >
            <MaterialSymbol name={saved ? "check" : "save"} size={18} />
            <span>{saved ? "ذخیره شد" : saving ? "در حال ذخیره…" : "ذخیره"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}