"use client";

import React, { useState, useEffect } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { type AccountPersona } from "@/lib/playbooks";
import { formatNumber as formatNumberI18n } from "@/lib/i18n";
import { useWorkspace } from "@/components/layout/workspace-context";
import { LinkButtonField, SnippetChips, appendSnippet } from "@/components/playbook-fields";
import { cn } from "@/lib/utils";

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

const TRIGGERS: { id: DrawerPostData["trigger_type"]; label: string; icon: string }[] = [
  { id: "all", label: "همه کامنت‌ها", icon: "select_all" },
  { id: "keywords", label: "کلمات کلیدی", icon: "match_case" },
  { id: "ai_context", label: "تشخیص هوشمند", icon: "auto_awesome" },
];

const COMMENT_ACTIONS: { id: DrawerPostData["comment_action_type"]; label: string; icon: string }[] = [
  { id: "ai", label: "هوش مصنوعی", icon: "auto_awesome" },
  { id: "direct", label: "متن ثابت", icon: "chat" },
  { id: "none", label: "بدون پاسخ", icon: "block" },
];

const DM_ACTIONS: { id: DrawerPostData["dm_action_type"]; label: string; icon: string }[] = [
  { id: "ai", label: "مشاور هوش مصنوعی", icon: "smart_toy" },
  { id: "direct", label: "متن ثابت", icon: "send" },
  { id: "none", label: "بدون ارسال دایرکت", icon: "block" },
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

function M3SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; icon?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-surface-container border border-outline-variant/60">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              selected
                ? "bg-primary text-on-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
            )}
          >
            {o.icon && <MaterialSymbol name={o.icon} size={16} fill={selected} />}
            <span>{o.label}</span>
          </button>
        );
      })}
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

  const m3Field =
    "w-full rounded-2xl border border-outline-variant/80 bg-surface-container-lowest px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* M3 Side Sheet panel */}
      <div
        dir={dir}
        className="relative w-full max-w-xl bg-surface-container-lowest h-[100dvh] max-h-[100dvh] shadow-2xl border-s border-outline-variant/70 rounded-s-3xl flex flex-col overflow-hidden animate-in slide-in-from-end duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/60 bg-surface-container flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant shrink-0 flex items-center justify-center text-muted-foreground shadow-2xs">
              <MaterialSymbol name={isReel ? "movie" : "image"} size={22} />
              {post.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
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
                <span className="text-sm sm:text-base font-bold text-foreground">
                  تنظیمات هوشمند این {contentTypeTitle}
                </span>
                <span
                  dir="ltr"
                  className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-container-highest text-foreground"
                >
                  {post.shortcode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {post.caption || `${contentTypeTitle} بدون کپشن`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-container-high hover:text-foreground transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <MaterialSymbol name="close" size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Subtle Compact Metrics Ribbon */}
          {(views > 0 || (post.logs_count && post.logs_count > 0) || (post.dms_count && post.dms_count > 0) || follows > 0) && (
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-surface-container border border-outline-variant/60 text-xs text-muted-foreground overflow-x-auto">
              {views > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/60 shrink-0">
                  <MaterialSymbol name="visibility" size={16} className="text-muted-foreground" />
                  <span>بازدید:</span>
                  <span className="font-bold text-foreground tabular-nums">{formatNumber(views)}</span>
                </div>
              )}
              {Boolean(post.logs_count && post.logs_count > 0) && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/60 shrink-0">
                  <MaterialSymbol name="chat_bubble" size={16} className="text-primary" />
                  <span>کامنت:</span>
                  <span className="font-bold text-foreground tabular-nums">{formatNumber(post.logs_count)}</span>
                </div>
              )}
              {Boolean(post.dms_count && post.dms_count > 0) && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/60 shrink-0">
                  <MaterialSymbol name="send" size={16} className="text-emerald-600" />
                  <span>دایرکت:</span>
                  <span className="font-bold text-emerald-700 tabular-nums">{formatNumber(post.dms_count)}</span>
                </div>
              )}
              {follows > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/60 shrink-0">
                  <MaterialSymbol name="person_add" size={16} className="text-rose-600" />
                  <span>فالوور:</span>
                  <span className="font-bold text-rose-600 tabular-nums">+{formatNumber(follows)}</span>
                </div>
              )}
            </div>
          )}

          {/* Master Toggle Card */}
          <div className="rounded-3xl border border-outline-variant/80 bg-surface-container-low p-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                <MaterialSymbol name="bolt" size={18} className="text-amber-500" fill={true} />
                <span>پاسخ خودکار به تعاملات این {contentTypeTitle}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                فقط تعاملات همین {contentTypeTitle} با تنظیمات پایین بررسی می‌شود؛ قوانین عمومی پیج دخالتی ندارند.
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>

          {/* Form Content Controlled by Master Toggle */}
          <div className={autoReply ? "space-y-6" : "space-y-6 opacity-45 pointer-events-none"}>
            {/* 1. Trigger Filtering */}
            <section className="space-y-2.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MaterialSymbol name="filter_alt" size={16} />
                <span>چه کامنت‌هایی پاسخ داده شود؟</span>
              </label>
              <M3SegmentedControl value={triggerType} options={TRIGGERS} onChange={setTriggerType} />
              {triggerType === "keywords" && (
                <input
                  className={m3Field}
                  value={triggerKeywords}
                  onChange={(e) => setTriggerKeywords(e.target.value)}
                  placeholder="قیمت، خرید، لینک (با ویرگول جدا کنید)"
                />
              )}
              {triggerType === "ai_context" && (
                <input
                  className={m3Field}
                  value={triggerContext}
                  onChange={(e) => setTriggerContext(e.target.value)}
                  placeholder="مثال: فقط سوالات درباره قیمت، سفارش یا شرایط ارسال"
                />
              )}
            </section>

            {/* 2. Public Comment Reply */}
            <section className="space-y-2.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MaterialSymbol name="forum" size={16} />
                <span>پاسخ عمومی به کامنت</span>
              </label>
              <M3SegmentedControl value={commentActionType} options={COMMENT_ACTIONS} onChange={setCommentActionType} />
              {commentActionType === "direct" && (
                <textarea
                  className={m3Field}
                  rows={2}
                  value={commentActionText}
                  onChange={(e) => setCommentActionText(e.target.value)}
                  placeholder="متن پاسخی که زیر کامنت کاربر درج می‌شود…"
                />
              )}
              {commentActionType === "ai" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    هوش مصنوعی متناسب با کامنت و لحن برند، پاسخ عمومی مناسبی زیر کامنت ارسال می‌کند.
                  </p>
                  <textarea
                    className={m3Field}
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
            <section className="space-y-2.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MaterialSymbol name="send" size={16} />
                <span>ارسال پیام در دایرکت</span>
              </label>
              <M3SegmentedControl value={dmActionType} options={DM_ACTIONS} onChange={setDmActionType} />
              {dmActionType === "direct" && (
                <textarea
                  className={m3Field}
                  rows={3}
                  value={dmActionText}
                  onChange={(e) => setDmActionText(e.target.value)}
                  placeholder="متن پیامی که بلافاصله به دایرکت کاربر فرستاده می‌شود…"
                />
              )}
              {dmActionType === "ai" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    هوش مصنوعی گفتگوی دایرکت را برای مشاوره، معرفی محصول یا ارسال لینک هدایت می‌کند.
                  </p>
                  <textarea
                    className={m3Field}
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
            <section className="rounded-3xl border border-outline-variant/70 bg-surface-container-lowest p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MaterialSymbol name="lock" size={16} className="text-primary" />
                  <span>قفل فالو (Follow Gate)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ارسال پیام در دایرکت یا لینک فقط پس از فالو کردن پیج انجام می‌شود.
                </p>
              </div>
              <Switch checked={dmRequireFollow} onCheckedChange={setDmRequireFollow} />
            </section>

            {/* 6. Spam & Competitor Shield */}
            <section className="rounded-3xl border border-outline-variant/70 bg-surface-container-lowest p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MaterialSymbol name="security" size={16} className="text-teal-600" />
                  <span>محافظت در برابر اسپم و رقبا</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  شناسایی و مخفی‌سازی خودکار کامنت‌های تبلیغاتی، توهین‌آمیز و تخریبی رقبا.
                </p>
              </div>
              <Switch checked={smartModeration} onCheckedChange={setSmartModeration} />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/60 bg-surface-container flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-destructive">{error}</span>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="filled"
            size="default"
            className="rounded-full px-6 gap-2 cursor-pointer"
          >
            <MaterialSymbol name={saved ? "check" : "save"} size={18} />
            <span>{saved ? "ذخیره شد" : saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
