"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  CheckCircle2,
  Eye,
  MessageCircle,
  Send,
  UserPlus,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Link2,
  FileText,
  Zap,
  Flame,
  Film,
  Image as ImageIcon,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  type AccountPersona,
  type PlaybookId,
  getPlaybooksForPersona,
  getPlaybookById,
} from "@/lib/playbooks";

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
  smart_moderation?: number;
  metrics_json?: string | null;
  logs_count?: number;
  dms_count?: number;
  replies_count?: number;
}

interface PostPlaybookDrawerProps {
  post: DrawerPostData | null;
  persona: AccountPersona;
  accountUsername: string;
  postMetrics?: Record<string, unknown>;
  onClose: () => void;
  onSaved: (updatedPost: DrawerPostData) => void;
}

function getProxiedImageUrl(url: string) {
  if (!url) return "";
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function PostPlaybookDrawer({
  post,
  persona,
  accountUsername,
  postMetrics,
  onClose,
  onSaved,
}: PostPlaybookDrawerProps) {
  const playbooks = getPlaybooksForPersona(persona);
  const defaultPlaybookId: PlaybookId =
    persona === "creator" ? "creator_magnet" : "auto_seller";

  const [autoReply, setAutoReply] = useState(true);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookId>(defaultPlaybookId);
  const [cheatSheet, setCheatSheet] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [smartModeration, setSmartModeration] = useState(false);

  // Advanced granular fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [triggerType, setTriggerType] = useState<"all" | "ai_context" | "keywords">("all");
  const [triggerContext, setTriggerContext] = useState("");
  const [triggerKeywords, setTriggerKeywords] = useState("");
  const [commentActionType, setCommentActionType] = useState<"none" | "direct" | "ai">("ai");
  const [commentActionText, setCommentActionText] = useState("");
  const [dmActionType, setDmActionType] = useState<"none" | "direct" | "ai">("ai");
  const [dmActionText, setDmActionText] = useState("");
  const [dmRequireFollow, setDmRequireFollow] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!post) return;
    setAutoReply(post.auto_reply === 1);
    const existingPb = (post.playbook_id as PlaybookId) || "custom";
    const resolvedPb =
      existingPb !== "custom"
        ? existingPb
        : post.dm_require_follow === 1
        ? persona === "creator"
          ? "creator_magnet"
          : "viral_gate"
        : defaultPlaybookId;

    setSelectedPlaybook(resolvedPb);
    setCheatSheet(post.cheat_sheet || "");
    setTargetUrl(post.target_url || "");
    setSmartModeration(post.smart_moderation === 1);

    setTriggerType(post.trigger_type || "all");
    setTriggerContext(post.trigger_context || "");
    setTriggerKeywords(post.trigger_keywords || "");
    setCommentActionType(post.comment_action_type || "ai");
    setCommentActionText(post.comment_action_text || "");
    setDmActionType(post.dm_action_type || "ai");
    setDmActionText(post.dm_action_text || "");
    setDmRequireFollow(post.dm_require_follow === 1);
    setSaveSuccess(false);
  }, [post, persona, defaultPlaybookId]);

  if (!post) return null;

  const activePreset = getPlaybookById(selectedPlaybook) || playbooks[0];

  const handleSelectPlaybook = (pbId: PlaybookId) => {
    setSelectedPlaybook(pbId);
    setAutoReply(true);
    const preset = getPlaybookById(pbId);
    if (preset) {
      setTriggerType(preset.defaults.trigger_type);
      setTriggerContext(preset.defaults.trigger_context);
      setCommentActionType(preset.defaults.comment_action_type);
      setCommentActionText(preset.defaults.comment_action_text);
      setDmActionType(preset.defaults.dm_action_type);
      setDmActionText(preset.defaults.dm_action_text);
      setDmRequireFollow(preset.defaults.dm_require_follow === 1);
    }
  };

  const handleAppendChip = (snippet: string) => {
    setCheatSheet((prev) => {
      if (!prev.trim()) return snippet.trim();
      return `${prev.trim()}\n${snippet.trim()}`;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/posts/${post.shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply: autoReply,
          playbook_id: selectedPlaybook,
          cheat_sheet: cheatSheet,
          target_url: targetUrl,
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
        setSaveSuccess(true);
        onSaved(data.post);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  // Parse post metrics
  let metrics: Record<string, unknown> = postMetrics || {};
  if (!postMetrics && post.metrics_json) {
    try {
      metrics = JSON.parse(post.metrics_json);
    } catch {
      metrics = {};
    }
  }
  const views = Number(metrics.views || metrics.plays || 0);
  const reach = Number(metrics.reach || 0);
  const follows = Number(metrics.follows || 0);
  const saves = Number(metrics.saves || metrics.saved || 0);
  const skipRate = typeof metrics.skip_rate === "number" ? metrics.skip_rate : null;

  const isCreator = persona === "creator";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px] animate-in fade-in duration-150">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Over Panel */}
      <div
        dir="rtl"
        className="relative w-full max-w-xl bg-white h-full shadow-2xl border-s border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200"
      >
        {/* Top Sticky Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shrink-0">
              {post.thumbnail_url ? (
                <img
                  src={getProxiedImageUrl(post.thumbnail_url)}
                  alt={post.shortcode}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  {post.post_type === "reel" ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  تنظیم ۱-کلیکی خلبان خودکار پست
                </span>
                <span
                  dir="ltr"
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700"
                >
                  {post.shortcode}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {post.caption || "بدون کپشن — از کادر تقلب‌نامه پایین برای تغذیه هوش مصنوعی استفاده کنید"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${accountUsername}/comments/${post.shortcode}`}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <span>لاگ‌ها و تاریخچه</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Post Live ROI Funnel Ribbon */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                قیف عملکرد واقعی این پست (SocialAPI Live)
              </span>
              {skipRate !== null && (
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    skipRate > 55
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  نرخ رد شدن ۳ ثانیه اول (Skip Rate): %{skipRate.toFixed(1)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3 text-slate-400" />
                  <span>ویو / ریچ</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-slate-900 mt-1">
                  {views > 0 ? views.toLocaleString("fa-IR") : "—"}
                </div>
                {reach > 0 && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ریچ: {reach.toLocaleString("fa-IR")}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3 text-indigo-500" />
                  <span>کامنت و پاسخ</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-slate-900 mt-1">
                  {(post.logs_count || 0).toLocaleString("fa-IR")}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {(post.replies_count || 0).toLocaleString("fa-IR")} پاسخ عمومی
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <Send className="w-3 h-3 text-emerald-600" />
                  <span>دایرکت ارسالی</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-emerald-700 mt-1">
                  {(post.dms_count || 0).toLocaleString("fa-IR")}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  ورود به مکالمه
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <UserPlus className="w-3 h-3 text-rose-500" />
                  <span>فالوور / سیو</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-rose-600 mt-1">
                  +{follows.toLocaleString("fa-IR")}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {saves > 0 ? `${saves.toLocaleString("fa-IR")} سیو` : "جذب مستقیم"}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Master Autopilot Toggle */}
          <div
            onClick={() => setAutoReply(!autoReply)}
            className={`cursor-pointer rounded-2xl p-4 border transition-all flex items-center justify-between ${
              autoReply
                ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  autoReply
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {autoReply
                    ? "خلبان خودکار روی این پست روشن است"
                    : "خلبان خودکار روی این پست خاموش است"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {autoReply
                    ? "پاسخگویی هوشمند به کامنت‌ها و هدایت به دایرکت به صورت ۲۴/۷ فعال است"
                    : "برای فعال‌سازی پاسخگویی خودکار، یکی از سناریوهای زیر را انتخاب کنید"}
                </div>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                autoReply
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {autoReply ? "فعال ✓" : "غیرفعال"}
            </div>
          </div>

          {/* 3. 1-Click Playbook Cards (Adaptive to Business vs Creator Persona) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles
                  className={`w-4 h-4 ${
                    isCreator ? "text-rose-600" : "text-indigo-600"
                  }`}
                />
                <span>
                  ۱. هدف این پست چیست؟ (انتخاب ۱-کلیکی سناریو —{" "}
                  {isCreator ? "حالت کریتور و بلاگر" : "حالت فروشگاه و بیزینس"})
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {playbooks.map((pb) => {
                const isSelected = selectedPlaybook === pb.id;
                const activeBorderClass = isCreator
                  ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/20"
                  : "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/20";
                const badgeClass = isCreator
                  ? "bg-rose-100 text-rose-700"
                  : "bg-indigo-100 text-indigo-700";

                return (
                  <button
                    key={pb.id}
                    type="button"
                    onClick={() => handleSelectPlaybook(pb.id)}
                    className={`w-full text-start p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? activeBorderClass
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="text-2xl leading-none pt-0.5 shrink-0">
                      {pb.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {pb.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}
                        >
                          {pb.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {pb.subtitle}
                      </p>
                    </div>
                    <div className="pt-1 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? isCreator
                              ? "border-rose-600 bg-rose-600 text-white"
                              : "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Supplemental Context Cheat Sheet («تقلب‌نامه پست — اطلاعاتی که در کپشن نیست») */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>۲. تقلب‌نامه دستیار (اطلاعاتی که در کپشن پست نیست)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  مثل وقتی به ادمین انسانی پیام می‌دهید، قیمت، سایز، موجودی، کد تخفیف یا نکات مکمل را اینجا بنویسید تا هوش مصنوعی هم در کامنت و هم در ادامه چت دایرکت از آن استفاده کند.
                </p>
              </div>
            </div>

            {/* Quick-Insert Chips */}
            <div className="flex flex-wrap gap-1.5">
              {activePreset.cheatSheetChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleAppendChip(chip.snippet)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={cheatSheet}
              onChange={(e) => setCheatSheet(e.target.value)}
              placeholder={activePreset.cheatSheetPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
            />

            {/* Direct Target Link Input (with automatic UTM & user attribution) */}
            <div className="pt-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {isCreator
                    ? "لینک فایل / ویدیو / لندینگ اسپانسر (ارسال خودکار در دایرکت با رهگیری کلیک):"
                    : "لینک مستقیم خرید محصول در سایت یا کاتالوگ (اختیاری — همراه رهگیری خودکار مشتری):"}
                </span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={activePreset.targetUrlPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Follow Gate + Smart Competitor Shield Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                <div className="text-[11px]">
                  <div className="font-bold text-slate-800">🧲 قفل فالوورگیر دایرکت</div>
                  <div className="text-[10px] text-slate-500">
                    ارسال لینک/اطلاعات فقط پس از فالو کردن پیج
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={dmRequireFollow}
                  onChange={(e) => setDmRequireFollow(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                <div className="text-[11px]">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>سپر ضد-اسپم و رقبا</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    مخفی‌سازی خودکار کامنت‌های تبلیغاتی (رایگان)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smartModeration}
                  onChange={(e) => setSmartModeration(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* 5. Collapsible Advanced Manual Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-between transition-colors"
            >
              <span>⚙️ تنظیمات دستی پیشرفته (شرط کلمه کلیدی، متن ثابت یا پرامپت سفارشی)</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/40">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    شرط فعال‌سازی روی کامنت‌ها:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "all", label: "همه کامنت‌ها" },
                      { id: "keywords", label: "کلمات کلیدی خاص" },
                      { id: "ai_context", label: "تشخیص هوشمند موضوع" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setTriggerType(opt.id as "all" | "ai_context" | "keywords")
                        }
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border ${
                          triggerType === opt.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {triggerType === "keywords" && (
                    <input
                      type="text"
                      value={triggerKeywords}
                      onChange={(e) => setTriggerKeywords(e.target.value)}
                      placeholder="کلمات را با ویرگول جدا کنید: قیمت، لینک، خرید، چند"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  )}
                  {triggerType === "ai_context" && (
                    <input
                      type="text"
                      value={triggerContext}
                      onChange={(e) => setTriggerContext(e.target.value)}
                      placeholder="مثال: فقط کامنت‌هایی که سوال درباره قیمت یا خرید دارند"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    نحوه پاسخ زیر کامنت عمومی:
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { id: "ai", label: "هوش مصنوعی" },
                      { id: "direct", label: "متن ثابت" },
                      { id: "none", label: "بدون پاسخ عمومی" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setCommentActionType(opt.id as "none" | "direct" | "ai")
                        }
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border ${
                          commentActionType === opt.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {commentActionType !== "none" && (
                    <textarea
                      rows={2}
                      value={commentActionText}
                      onChange={(e) => setCommentActionText(e.target.value)}
                      placeholder="دستورالعمل هوش مصنوعی یا متن ثابت پاسخ کامنت..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    نحوه ارسال پیام در دایرکت پست:
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { id: "ai", label: "مشاور هوش مصنوعی" },
                      { id: "direct", label: "متن ثابت" },
                      { id: "none", label: "بدون ارسال دایرکت" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDmActionType(opt.id as "none" | "direct" | "ai")
                        }
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border ${
                          dmActionType === opt.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {dmActionType !== "none" && (
                    <textarea
                      rows={2}
                      value={dmActionText}
                      onChange={(e) => setDmActionText(e.target.value)}
                      placeholder="دستورالعمل هوش مصنوعی یا متن ثابت دایرکت..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="text-xs">
            {saveSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                تقلب‌نامه و سناریوی پست با موفقیت ذخیره شد!
              </span>
            ) : (
              <span className="text-slate-500">
                تغییرات بلافاصله روی کامنت‌ها و دایرکت‌های جدید اعمال می‌شود.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              بستن
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm inline-flex items-center gap-1.5 transition-all ${
                isCreator
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال ذخیره...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره سناریو و تقلب‌نامه</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
