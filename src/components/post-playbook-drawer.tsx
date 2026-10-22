"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Eye,
  MessageCircle,
  Send,
  UserPlus,
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
  normalizePersona,
  PERSONA_META,
  getPersonaMeta,
} from "@/lib/playbooks";
import { I18N, formatNumber as formatNumberI18n } from "@/lib/i18n";
import { useWorkspace } from "@/components/layout/workspace-context";

const PERSONA_ORDER: AccountPersona[] = ["ecommerce", "service_b2b", "creator"];
const PERSONA_ACCENT: Record<
  AccountPersona,
  { icon: string; tab: string; border: string; badge: string; radio: string; button: string }
> = {
  ecommerce: {
    icon: "text-indigo-600",
    tab: "bg-indigo-600 text-white shadow-xs",
    border: "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/20",
    badge: "bg-indigo-100 text-indigo-700",
    radio: "border-indigo-600 bg-indigo-600 text-white",
    button: "bg-indigo-600 hover:bg-indigo-700",
  },
  service_b2b: {
    icon: "text-teal-600",
    tab: "bg-teal-600 text-white shadow-xs",
    border: "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600/20",
    badge: "bg-teal-100 text-teal-700",
    radio: "border-teal-600 bg-teal-600 text-white",
    button: "bg-teal-600 hover:bg-teal-700",
  },
  creator: {
    icon: "text-rose-600",
    tab: "bg-rose-600 text-white shadow-xs",
    border: "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/20",
    badge: "bg-rose-100 text-rose-700",
    radio: "border-rose-600 bg-rose-600 text-white",
    button: "bg-rose-600 hover:bg-rose-700",
  },
};

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
  if (url.startsWith("/api/")) return url;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
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
  const workspace = useWorkspace();
  const lang = workspace?.lang ?? "fa";
  const dir = workspace?.dir ?? "rtl";
  const t = workspace?.t ?? ((key: string) => I18N.fa[key] || key);
  const formatNumber =
    workspace?.formatNumber ?? ((n: number | string | undefined | null) => formatNumberI18n(n, lang));
  const accountPersona = normalizePersona(persona);
  // Persona tab currently shown in the drawer (starts at the account persona)
  const [viewPersona, setViewPersona] = useState<AccountPersona>(accountPersona);
  const playbooks = getPlaybooksForPersona(viewPersona, lang);
  const defaultPlaybookId: PlaybookId = PERSONA_META[viewPersona].defaultPlaybook;

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
    const existingPreset = getPlaybookById(existingPb);
    const basePersona = existingPreset ? existingPreset.persona : accountPersona;
    const resolvedPb =
      existingPb !== "custom"
        ? existingPb
        : post.dm_require_follow === 1
        ? accountPersona === "creator"
          ? "creator_magnet"
          : accountPersona === "service_b2b"
          ? "brief_qualifier"
          : "viral_gate"
        : PERSONA_META[accountPersona].defaultPlaybook;

    setViewPersona(basePersona);
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
  }, [post, accountPersona]);

  if (!post) return null;

  const activePreset = getPlaybookById(selectedPlaybook, lang) || playbooks[0];

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

  const handleSwitchViewPersona = (next: AccountPersona) => {
    setViewPersona(next);
    handleSelectPlaybook(PERSONA_META[next].defaultPlaybook);
  };

  const handleAppendChip =(snippet: string) => {
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

  const accent = PERSONA_ACCENT[viewPersona];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px] animate-in fade-in duration-150">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Over Panel */}
      <div
        dir={dir}
        className="relative w-full max-w-xl bg-white h-full shadow-2xl border-s border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200"
      >
        {/* Top Sticky Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
              {post.post_type === "reel" ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
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
                  {t("drawerTitle")}
                </span>
                <span
                  dir="ltr"
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700"
                >
                  {post.shortcode}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {post.caption || t("noCaptionFallback")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={t("close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Post Live ROI Funnel Ribbon */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {t("drawerLiveFunnel")}
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
                  <span>{t("funnelViewsReach")}</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-slate-900 mt-1">
                  {views > 0 ? formatNumber(views) : "—"}
                </div>
                {reach > 0 && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t("funnelReachLabel")} {formatNumber(reach)}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3 text-indigo-500" />
                  <span>{t("funnelCommentsReplies")}</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-slate-900 mt-1">
                  {formatNumber(post.logs_count || 0)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {formatNumber(post.replies_count || 0)} {t("funnelPublicRepliesLabel")}
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <Send className="w-3 h-3 text-emerald-600" />
                  <span>{t("funnelDmsSent")}</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-emerald-700 mt-1">
                  {formatNumber(post.dms_count || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {t("funnelEnterConversation")}
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <UserPlus className="w-3 h-3 text-rose-500" />
                  <span>{t("funnelFollowersSaves")}</span>
                </div>
                <div className="text-sm font-bold tabular-nums text-rose-600 mt-1">
                  +{formatNumber(follows)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {saves > 0 ? `${formatNumber(saves)} ${t("funnelSavesLabel")}` : t("funnelDirectFollowLabel")}
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
                  {autoReply ? t("drawerAutopilotOn") : t("drawerAutopilotOff")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {autoReply ? t("drawerAutopilotOnHint") : t("drawerAutopilotOffHint")}
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
              {autoReply ? t("drawerStatusActive") : t("drawerStatusInactive")}
            </div>
          </div>

          {/* 3. 1-Click Playbook Cards (Adaptive to Business vs Creator Persona) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className={`w-4 h-4 ${accent.icon}`} />
                <span>
                  {t("drawerStep1")} ({getPersonaMeta(viewPersona, lang).tabLabel})
                </span>
              </label>
            </div>

            <div className="inline-flex w-full items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              {PERSONA_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSwitchViewPersona(p)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    viewPersona === p
                      ? PERSONA_ACCENT[p].tab
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {PERSONA_META[p].emoji} {getPersonaMeta(p, lang).tabLabel}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {playbooks.map((pb) => {
                const isSelected = selectedPlaybook === pb.id;
                const activeBorderClass = accent.border;
                const badgeClass = accent.badge;

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
                            ? accent.radio
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
                  <span>{t("drawerStep2")}</span>
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
                <span>{t("drawerStep3")}</span> — <span>{getPersonaMeta(viewPersona, lang).targetUrlLabel}</span>
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
                  <div className="font-bold text-slate-800">{t("followGateTitle")}</div>
                  <div className="text-[10px] text-slate-500">
                    {t("followGateDesc")}
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
                    <span>{t("spamShieldTitle")}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {t("spamShieldDesc")}
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
              className="w-full px-4 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{t("advancedSettingsTitle")}</span>
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
                    {t("triggerConditionLabel")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "all", label: t("triggerAllComments") },
                      { id: "keywords", label: t("triggerSpecificKeywords") },
                      { id: "ai_context", label: t("triggerAiContext") },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setTriggerType(opt.id as "all" | "ai_context" | "keywords")
                        }
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border cursor-pointer ${
                          triggerType === opt.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
                    {t("commentActionTypeLabel")}
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { id: "ai", label: t("actionTypeAi") },
                      { id: "direct", label: t("actionTypeDirect") },
                      { id: "none", label: t("actionTypeNone") },
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
                {t("drawerSaveSuccess")}
              </span>
            ) : (
              <span className="text-slate-500">
                {t("drawerAppliedImmediately")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t("close")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer transition-all ${
                accent.button
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("btnSavingDrawer")}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t("btnSaveDrawer")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
