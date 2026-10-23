"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Eye,
  MessageCircle,
  Send,
  UserPlus,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { type AccountPersona } from "@/lib/playbooks";
import { formatNumber as formatNumberI18n } from "@/lib/i18n";
import { useWorkspace } from "@/components/layout/workspace-context";
import { LinkButtonField, SnippetChips, appendSnippet } from "@/components/playbook-fields";

export interface DrawerPostData {
  id: number;
  account_username: string;
  shortcode: string;
  media_id: string;
  url: string;
  post_type: "reel" | "post";
  thumbnail_url: string;
  caption: string;
  auto_reply: number;
  trigger_type: "all" | "ai_context" | "keywords";
  trigger_context: string;
  trigger_keywords: string;
  comment_action_type: "none" | "direct" | "ai";
  comment_action_text: string;
  dm_action_type: "none" | "direct" | "ai";
  dm_action_text: string;
  dm_require_follow: number;
  playbook_id?: string;
  cheat_sheet?: string;
  target_url?: string;
  target_button_text?: string;
  smart_moderation?: number;
  metrics_json?: string | null;
  logs_count?: number;
  dms_count?: number;
  replies_count?: number;
}

interface PostPlaybookDrawerProps {
  post: DrawerPostData | null;
  persona?: AccountPersona;
  accountUsername?: string;
  postMetrics?: Record<string, unknown>;
  onClose: () => void;
  onSaved: (updatedPost: DrawerPostData) => void;
}

function getProxiedImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const TRIGGERS: { id: DrawerPostData["trigger_type"]; label: string }[] = [
  { id: "all", label: "همه کامنت‌ها" },
  { id: "keywords", label: "کلمات کلیدی" },
  { id: "ai_context", label: "تشخیص هوشمند" },
];

const COMMENT_ACTIONS: { id: DrawerPostData["comment_action_type"]; label: string }[] = [
  { id: "ai", label: "هوش مصنوعی" },
  { id: "direct", label: "متن ثابت" },
  { id: "none", label: "بدون پاسخ به کامنت" },
];

const DM_ACTIONS: { id: DrawerPostData["dm_action_type"]; label: string }[] = [
  { id: "ai", label: "مشاور هوش مصنوعی" },
  { id: "direct", label: "متن ثابت" },
  { id: "none", label: "بدون ارسال دایرکت" },
];

const COMMENT_AI_CHIPS = [
  { label: "+ تشکر و اعلام دایرکت", snippet: "از کاربر تشکر کن و بگو جزئیات را در دایرکت برایش فرستادیم." },
  { label: "+ فقط ایموجی تشویقی", snippet: "فقط با یک یا دو ایموجی تشویقی و صمیمی جواب بده، بدون متن." },
  { label: "+ دعوت به استوری", snippet: "کاربر را دعوت کن استوری‌های پیج را هم دنبال کند." },
];

const DM_AI_CHIPS = [
  { label: "+ قیمت و جزئیات محصول", snippet: "قیمت و مشخصات کامل محصول این پست را بگو." },
  { label: "+ مشاوره و سوال از نیاز", snippet: "اول درباره نیاز کاربر سوال بپرس و بعد مناسب‌ترین گزینه را پیشنهاد بده." },
  { label: "+ شخصی‌سازی پیشنهاد", snippet: "پیام را با نام کاربر و بر اساس کامنتش شخصی‌سازی کن." },
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
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            value === o.id
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PostPlaybookDrawer({
  post,
  postMetrics,
  onClose,
  onSaved,
}: PostPlaybookDrawerProps) {
  const workspace = useWorkspace();
  const lang = workspace?.lang ?? "fa";
  const dir = workspace?.dir ?? "rtl";
  const formatNumber =
    workspace?.formatNumber ?? ((n: number | string | undefined | null) => formatNumberI18n(n, lang));

  const [autoReply, setAutoReply] = useState(false);
  const [triggerType, setTriggerType] = useState<DrawerPostData["trigger_type"]>("all");
  const [triggerKeywords, setTriggerKeywords] = useState("");
  const [triggerContext, setTriggerContext] = useState("");

  const [commentActionType, setCommentActionType] = useState<DrawerPostData["comment_action_type"]>("ai");
  const [commentActionText, setCommentActionText] = useState("");

  const [dmActionType, setDmActionType] = useState<DrawerPostData["dm_action_type"]>("ai");
  const [dmActionText, setDmActionText] = useState("");
  const [dmRequireFollow, setDmRequireFollow] = useState(false);

  const [cheatSheet, setCheatSheet] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetButtonText, setTargetButtonText] = useState("");
  const [smartModeration, setSmartModeration] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!post) return;
    setAutoReply(post.auto_reply === 1);
    setTriggerType(post.trigger_type || "all");
    setTriggerKeywords(post.trigger_keywords || "");
    setTriggerContext(post.trigger_context || "");
    setCommentActionType(post.comment_action_type || "ai");
    setCommentActionText(post.comment_action_text || "");
    setDmActionType(post.dm_action_type || "ai");
    setDmActionText(post.dm_action_text || "");
    setDmRequireFollow(post.dm_require_follow === 1);
    setCheatSheet(post.cheat_sheet || "");
    setTargetUrl(post.target_url || "");
    setTargetButtonText(post.target_button_text || "");
    setSmartModeration(post.smart_moderation === 1);
    setSaved(false);
    setError("");
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [post]);

  if (!post) return null;

  const isReel = post.post_type === "reel";
  const contentTypeTitle = isReel ? "ریلز" : "پست";

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${post.shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply: autoReply,
          playbook_id: post.playbook_id || "custom",
          cheat_sheet: cheatSheet,
          target_url: targetUrl,
          target_button_text: targetButtonText,
          smart_moderation: smartModeration,
          trigger_type: triggerType,
          trigger_context: triggerContext,
          trigger_keywords: triggerKeywords,
          comment_action_type: commentActionType,
          comment_action_text: commentActionText,
          dm_action_type: dmActionType,
          dm_action_text: dmActionText,
          dm_require_follow: dmRequireFollow,
        }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        onSaved(data.post);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error || "خطا در ذخیره تنظیمات");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  // Metrics extraction
  let metrics: Record<string, unknown> = postMetrics || {};
  if (!postMetrics && post.metrics_json) {
    try {
      metrics = JSON.parse(post.metrics_json);
    } catch {
      metrics = {};
    }
  }
  const views = Number(metrics.views || metrics.plays || 0);
  const follows = Number(metrics.follows || 0);

  const field =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px] animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        dir={dir}
        className="relative w-full max-w-xl bg-white h-[100dvh] max-h-[100dvh] shadow-2xl border-s border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-start duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
              {isReel ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              {post.thumbnail_url && (
                <img
                  src={getProxiedImageUrl(post.thumbnail_url)}
                  alt={post.shortcode}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  تنظیمات پاسخ این {contentTypeTitle}
                </span>
                <span
                  dir="ltr"
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700"
                >
                  {post.shortcode}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {post.caption || `${contentTypeTitle} بدون کپشن`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Subtle Compact Metrics Ribbon */}
          {(views > 0 || (post.logs_count && post.logs_count > 0) || (post.dms_count && post.dms_count > 0) || follows > 0) && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 overflow-x-auto">
              {views > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">بازدید:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatNumber(views)}</span>
                </div>
              )}
              {Boolean(post.logs_count && post.logs_count > 0) && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-slate-500">کامنت:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatNumber(post.logs_count)}</span>
                </div>
              )}
              {Boolean(post.dms_count && post.dms_count > 0) && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-500">دایرکت:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatNumber(post.dms_count)}</span>
                </div>
              )}
              {follows > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-slate-500">فالوور:</span>
                  <span className="font-bold text-slate-900 tabular-nums">+{formatNumber(follows)}</span>
                </div>
              )}
            </div>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">
                پاسخ خودکار به تعاملات این {contentTypeTitle}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                فقط تعاملات همین {contentTypeTitle} با تنظیمات پایین بررسی می‌شود؛ قوانین عمومی پیج دخالتی ندارند.
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>

          {/* Form Content Controlled by Master Toggle */}
          <div className={autoReply ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
            {/* 1. Trigger Filtering */}
            <section className="space-y-2">
              <div className="text-xs font-bold text-slate-700">چه کامنت‌هایی پاسخ داده شود؟</div>
              <Seg value={triggerType} options={TRIGGERS} onChange={setTriggerType} />
              {triggerType === "keywords" && (
                <input
                  className={field}
                  value={triggerKeywords}
                  onChange={(e) => setTriggerKeywords(e.target.value)}
                  placeholder="قیمت، خرید، لینک (با ویرگول جدا کنید)"
                />
              )}
              {triggerType === "ai_context" && (
                <input
                  className={field}
                  value={triggerContext}
                  onChange={(e) => setTriggerContext(e.target.value)}
                  placeholder="مثال: فقط سوالات درباره قیمت، سفارش یا شرایط ارسال"
                />
              )}
            </section>

            {/* 2. Public Comment Reply */}
            <section className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> پاسخ عمومی به کامنت
              </div>
              <Seg value={commentActionType} options={COMMENT_ACTIONS} onChange={setCommentActionType} />
              {commentActionType === "direct" && (
                <textarea
                  className={field}
                  rows={2}
                  value={commentActionText}
                  onChange={(e) => setCommentActionText(e.target.value)}
                  placeholder="متن پاسخی که زیر کامنت کاربر درج می‌شود…"
                />
              )}
              {commentActionType === "ai" && (
                <>
                  <p className="text-xs text-slate-500">
                    هوش مصنوعی متناسب با کامنت و لحن برند، پاسخ عمومی مناسبی زیر کامنت ارسال می‌کند.
                  </p>
                  <textarea
                    className={field}
                    rows={2}
                    value={commentActionText}
                    onChange={(e) => setCommentActionText(e.target.value)}
                    placeholder="دستورالعمل اختیاری برای هوش مصنوعی (مثلاً: تشکر کن و بگو دایرکت فرستادم)…"
                  />
                  <SnippetChips
                    chips={COMMENT_AI_CHIPS}
                    onPick={(snippet) => setCommentActionText((prev) => appendSnippet(prev, snippet))}
                  />
                </>
              )}
            </section>

            {/* 3. Direct Message Reply */}
            <section className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> ارسال پیام در دایرکت
              </div>
              <Seg value={dmActionType} options={DM_ACTIONS} onChange={setDmActionType} />
              {dmActionType === "direct" && (
                <textarea
                  className={field}
                  rows={3}
                  value={dmActionText}
                  onChange={(e) => setDmActionText(e.target.value)}
                  placeholder="متن پیامی که بلافاصله به دایرکت کاربر فرستاده می‌شود…"
                />
              )}
              {dmActionType === "ai" && (
                <>
                  <p className="text-xs text-slate-500">
                    هوش مصنوعی گفتگوی دایرکت را برای مشاوره، معرفی محصول یا ارسال لینک هدایت می‌کند.
                  </p>
                  <textarea
                    className={field}
                    rows={3}
                    value={dmActionText}
                    onChange={(e) => setDmActionText(e.target.value)}
                    placeholder={`مسیر گفتگو برای همین ${contentTypeTitle} (مثلاً: قیمت و مشخصات محصول را بگو)…`}
                  />
                  <SnippetChips
                    chips={DM_AI_CHIPS}
                    onPick={(snippet) => setDmActionText((prev) => appendSnippet(prev, snippet))}
                  />
                </>
              )}
            </section>

            {/* 4. Link Button */}
            <LinkButtonField
              buttonText={targetButtonText}
              url={targetUrl}
              onButtonTextChange={setTargetButtonText}
              onUrlChange={setTargetUrl}
              fallbackTitle={lang === "en" ? "View & Buy 🛍️" : "مشاهده و خرید 🛍️"}
              hint="لینک همراه دکمه بالا در دایرکت ارسال می‌شود و هوش مصنوعی در صورت نیاز آن را در گفتگو پیشنهاد می‌دهد."
            />

            {/* 5. Follow Gate */}
            <section className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> قفل فالو
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ارسال پیام در دایرکت یا لینک فقط پس از فالو کردن پیج انجام می‌شود.
                </p>
              </div>
              <Switch checked={dmRequireFollow} onCheckedChange={setDmRequireFollow} />
            </section>

            {/* 6. Spam & Competitor Shield */}
            <section className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> محافظت در برابر اسپم و رقبا
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  شناسایی و مخفی‌سازی خودکار کامنت‌های تبلیغاتی، توهین‌آمیز و تخریبی رقبا.
                </p>
              </div>
              <Switch checked={smartModeration} onCheckedChange={setSmartModeration} />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-rose-600">{error}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "ذخیره شد" : saving ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </div>
    </div>
  );
}