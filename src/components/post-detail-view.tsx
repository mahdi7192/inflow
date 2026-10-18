"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Bolt,
  PowerOff,
  Sparkles,
  MessageSquare,
  Send,
  UserCheck,
  Check,
  Save,
  Loader2,
  Info,
  Hash,
  MessageCircle,
} from "lucide-react";
import { Button, Badge, Switch, Input, Textarea } from "@/components/ui/primitives";
import { I18N, Lang } from "@/lib/i18n";
import type { PostRow } from "@/lib/db";

export function PostDetailView({
  post,
  lang,
  onBack,
  onSaveSuccess,
  onOpenLogs,
}: {
  post: PostRow;
  lang: Lang;
  onBack: () => void;
  onSaveSuccess: (updated: PostRow) => void;
  onOpenLogs: (shortcode: string) => void;
}) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  // Master switch state
  const [autoReply, setAutoReply] = useState(post.auto_reply === 1);
  const [triggerType, setTriggerType] = useState<"all" | "ai_context" | "keywords">(
    post.trigger_type || "all"
  );
  const [triggerContext, setTriggerContext] = useState(post.trigger_context || "");
  const [triggerKeywords, setTriggerKeywords] = useState(post.trigger_keywords || "");

  // Comment action state
  const [commentActionType, setCommentActionType] = useState<"none" | "direct" | "ai">(
    post.comment_action_type || "none"
  );
  const [commentActionText, setCommentActionText] = useState(post.comment_action_text || "");

  // DM action state
  const [dmActionType, setDmActionType] = useState<"none" | "direct" | "ai">(
    post.dm_action_type || "none"
  );
  const [dmActionText, setDmActionText] = useState(post.dm_action_text || "");
  const [dmRequireFollow, setDmRequireFollow] = useState(post.dm_require_follow === 1);

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync state if prop changes
  useEffect(() => {
    setAutoReply(post.auto_reply === 1);
    setTriggerType(post.trigger_type || "all");
    setTriggerContext(post.trigger_context || "");
    setTriggerKeywords(post.trigger_keywords || "");
    setCommentActionType(post.comment_action_type || "none");
    setCommentActionText(post.comment_action_text || "");
    setDmActionType(post.dm_action_type || "none");
    setDmActionText(post.dm_action_text || "");
    setDmRequireFollow(post.dm_require_follow === 1);
  }, [post]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Immediate toggle of master switch
  const handleToggleMaster = async (checked: boolean) => {
    setAutoReply(checked);
    try {
      const res = await fetch(`/api/posts/${post.shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_reply: checked }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        onSaveSuccess(data.post);
        showToast(checked ? t("toastTurnedOn") : t("toastTurnedOff"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply: autoReply,
          trigger_type: triggerType,
          trigger_context: triggerContext.trim(),
          trigger_keywords: triggerKeywords.trim(),
          comment_action_type: commentActionType,
          comment_action_text: commentActionText.trim(),
          dm_action_type: dmActionType,
          dm_action_text: dmActionText.trim(),
          dm_require_follow: dmRequireFollow,
        }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        onSaveSuccess(data.post);
        showToast(t("toastSaved"));
        setTimeout(() => {
          onBack();
        }, 500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 end-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-black font-medium text-xs shadow-xl animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Nav Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t("backToPosts")}</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenLogs(post.shortcode)}
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>{t("viewLogs")}</span>
          </Button>
          <a
            href={post.url || `https://www.instagram.com/p/${post.shortcode}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] rounded-md border border-border text-foreground hover:bg-secondary transition-colors"
          >
            <span>{t("openInInstagram")}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Media Thumbnail & Info */}
        <div className="md:col-span-4 space-y-4">
          <div className="relative aspect-4/5 rounded-xl overflow-hidden border border-border bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg"}
              alt="Post thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80";
              }}
            />
            <span className="absolute top-3 end-3 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-white uppercase">
              {post.post_type}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">کد یکتای پست:</span>
              <span className="font-mono text-foreground font-semibold truncate max-w-[150px] sm:max-w-none">{post.shortcode}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">پیج مرتبط:</span>
              <span className="font-mono text-foreground font-medium">@{post.account_username}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration Form */}
        <div className="md:col-span-8 space-y-5">
          {/* Caption Box */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t("originalCaptionTitle")}</span>
              </div>
              <Badge variant="muted">{t("readOnlyBadge")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line bg-secondary/30 p-3 rounded-lg border border-border">
              {post.caption || t("noCaption")}
            </p>
            <div className="flex items-start gap-2 text-[11px] text-sky-800 bg-sky-50 border border-sky-200 p-2.5 rounded-lg">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>{t("aiNoticeBody")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Master Switch Card */}
            <div
              className={`rounded-xl border p-4 transition-all flex items-center justify-between shadow-2xs ${
                autoReply
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-card border-border"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bolt
                    className={`w-4 h-4 ${
                      autoReply ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {t("masterSwitchTitle")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {autoReply
                    ? t("masterSwitchSubtitleOn")
                    : t("masterSwitchSubtitleOff")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold ${
                    autoReply ? "text-emerald-700" : "text-muted-foreground"
                  }`}
                >
                  {autoReply ? t("statusOn") : t("statusOff")}
                </span>
                <Switch
                  checked={autoReply}
                  onCheckedChange={handleToggleMaster}
                />
              </div>
            </div>

            {/* If master switch is OFF */}
            {!autoReply && (
              <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center space-y-2 text-muted-foreground">
                <PowerOff className="w-6 h-6 mx-auto opacity-50" />
                <p className="text-xs">{t("offBannerText")}</p>
              </div>
            )}

            {/* If master switch is ON: Show all configuration sections */}
            {autoReply && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* SECTION 1: TRIGGER */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                  <div>
                    <h3 className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t("triggerSectionTitle")}</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("triggerSectionSubtitle")}
                    </p>
                  </div>

                  {/* 3 Trigger Choices: All, Keywords, AI */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTriggerType("all")}
                      className={`p-3 rounded-lg border text-start transition-all cursor-pointer ${
                        triggerType === "all"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="text-xs font-semibold">{t("triggerAllTitle")}</div>
                      <div className="text-[10px] opacity-80 mt-1 leading-snug">
                        {t("triggerAllDesc")}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTriggerType("keywords")}
                      className={`p-3 rounded-lg border text-start transition-all cursor-pointer ${
                        triggerType === "keywords"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        <span>{t("triggerKeywordsTitle")}</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-1 leading-snug">
                        {t("triggerKeywordsDesc")}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTriggerType("ai_context")}
                      className={`p-3 rounded-lg border text-start transition-all cursor-pointer ${
                        triggerType === "ai_context"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{t("triggerAiTitle")}</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-1 leading-snug">
                        {t("triggerAiDesc")}
                      </div>
                    </button>
                  </div>

                  {/* If Keywords */}
                  {triggerType === "keywords" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] text-muted-foreground font-medium">
                        {t("triggerKeywordsLabel")}
                      </label>
                      <Input
                        type="text"
                        value={triggerKeywords}
                        onChange={(e) => setTriggerKeywords(e.target.value)}
                        placeholder={t("triggerKeywordsPlaceholder")}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}

                  {/* If AI Context */}
                  {triggerType === "ai_context" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] text-muted-foreground font-medium">
                        {t("triggerContextLabel")}
                      </label>
                      <Textarea
                        rows={2}
                        value={triggerContext}
                        onChange={(e) => setTriggerContext(e.target.value)}
                        placeholder={t("triggerContextPlaceholder")}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* SECTION 2: COMMENT ACTION */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                  <div>
                    <h3 className="text-xs font-semibold text-sky-800 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
                      <span>{t("commentActionTitle")}</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("commentActionSubtitle")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {(["none", "direct", "ai"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCommentActionType(type)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          commentActionType === type
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {type === "none" && t("actionNone")}
                        {type === "direct" && t("actionDirect")}
                        {type === "ai" && t("actionAi")}
                      </button>
                    ))}
                  </div>

                  {commentActionType === "none" && (
                    <div className="text-[11px] text-muted-foreground py-1">
                      {t("commentNoneNote")}
                    </div>
                  )}

                  {commentActionType === "direct" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] text-muted-foreground font-medium">
                        {t("commentDirectLabel")}
                      </label>
                      <Textarea
                        rows={2}
                        value={commentActionText}
                        onChange={(e) => setCommentActionText(e.target.value)}
                        placeholder={t("commentDirectPlaceholder")}
                        className="text-xs"
                      />
                    </div>
                  )}

                  {commentActionType === "ai" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] text-muted-foreground font-medium">
                        {t("commentAiLabel")}
                      </label>
                      <Textarea
                        rows={2}
                        value={commentActionText}
                        onChange={(e) => setCommentActionText(e.target.value)}
                        placeholder={t("commentAiPlaceholder")}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* SECTION 3: DIRECT MESSAGE ACTION */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-foreground" />
                      <span>{t("dmActionTitle")}</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("dmActionSubtitle")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {(["none", "direct", "ai"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDmActionType(type)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          dmActionType === type
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {type === "none" && t("actionNone")}
                        {type === "direct" && t("actionDirect")}
                        {type === "ai" && t("actionAi")}
                      </button>
                    ))}
                  </div>

                  {dmActionType === "none" && (
                    <div className="text-[11px] text-muted-foreground py-1">
                      {t("dmNoneNote")}
                    </div>
                  )}

                  {dmActionType === "direct" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] text-muted-foreground font-medium">
                        {t("dmDirectLabel")}
                      </label>
                      <Textarea
                        rows={3}
                        value={dmActionText}
                        onChange={(e) => setDmActionText(e.target.value)}
                        placeholder={t("dmDirectPlaceholder")}
                        className="text-xs leading-relaxed"
                      />
                    </div>
                  )}

                  {dmActionType === "ai" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] text-muted-foreground font-medium">
                        {t("dmAiLabel")}
                      </label>
                      <Textarea
                        rows={3}
                        value={dmActionText}
                        onChange={(e) => setDmActionText(e.target.value)}
                        placeholder={t("dmAiPlaceholder")}
                        className="text-xs leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Follow Requirement Option (only when DM is enabled) */}
                  {dmActionType !== "none" && (
                    <div className="rounded-lg border border-border bg-secondary/40 p-3 flex items-center justify-between mt-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t("followReqTitle")}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t("followReqSubtitle")}
                        </p>
                      </div>
                      <Switch
                        checked={dmRequireFollow}
                        onCheckedChange={setDmRequireFollow}
                      />
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={saving}
                  className="w-full shadow-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{t("saveConfig")}</span>
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
