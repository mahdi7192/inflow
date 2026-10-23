"use client";

import React, { useEffect, useState } from "react";
import { X, Save, Check, UserPlus, Smile, Film, Image as ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === o.id
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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

  const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
      <div className="flex-1" onClick={onClose} />
      <div
        dir={dir}
        className="relative w-full max-w-xl bg-white h-[100dvh] shadow-2xl border-s border-slate-200 flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
              {story.media_type?.toUpperCase() === "VIDEO" ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
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
              <div className="text-sm font-bold text-slate-900">تنظیمات پاسخ این استوری</div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{story.caption || "استوری بدون کپشن"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">پاسخ خودکار به ریپلای‌های این استوری</div>
              <p className="text-xs text-slate-500 mt-0.5">
                فقط ریپلای همین استوری با تنظیمات پایین بررسی می‌شود؛ قوانین دایرکت عمومی دخالتی ندارند.
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>

          <div className={autoReply ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
            <section className="space-y-2">
              <div className="text-xs font-bold text-slate-700">چه ریپلای‌هایی پاسخ داده شود؟</div>
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

            <section className="space-y-2">
              <div className="text-xs font-bold text-slate-700">نوع پاسخ</div>
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

            <LinkButtonField
              buttonText={targetButtonText}
              url={targetUrl}
              onButtonTextChange={setTargetButtonText}
              onUrlChange={setTargetUrl}
              fallbackTitle={lang === "en" ? "Open link 🔗" : "مشاهده لینک 🔗"}
            />

            <section className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> قفل فالو
                </div>
                <p className="text-xs text-slate-500 mt-0.5">پاسخ فقط بعد از فالو کردن پیج ارسال می‌شود.</p>
              </div>
              <Switch checked={requireFollow} onCheckedChange={setRequireFollow} />
            </section>

            <section className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5" /> واکنش ایموجی (بدون متن)
              </div>
              <Seg value={emoji} options={EMOJI} onChange={setEmoji} />
              <p className="text-xs text-slate-500">ریپلای‌های فقط ایموجی هرگز به هوش مصنوعی ارسال نمی‌شوند.</p>
            </section>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <span className="text-xs text-rose-600">{error}</span>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "ذخیره شد" : saving ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </div>
    </div>
  );
}
