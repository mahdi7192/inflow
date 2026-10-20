"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Send,
  UserCheck,
  Info,
  Hash,
} from "lucide-react";
import { Button, Badge, Switch, Input, Textarea } from "@/components/ui/primitives";
import { ActivationCard, ProgressiveDisclosureContainer } from "@/components/ui/activation-card";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { useWorkspace } from "@/components/layout/workspace-context";
import { toast } from "@/components/ui/sonner";
import { I18N, Lang } from "@/lib/i18n";
import type { PostRow } from "@/lib/db";

export function PostDetailView({
  post,
  lang: propLang,
  onBack,
  onSaveSuccess,
  onOpenLogs,
}: {
  post: PostRow;
  lang?: Lang;
  onBack: () => void;
  onSaveSuccess: (updated: PostRow) => void;
  onOpenLogs: (shortcode: string) => void;
}) {
  const workspace = useWorkspace();

  const lang = workspace ? workspace.lang : propLang || "fa";
  const t = (key: string) => (workspace ? workspace.t(key) : I18N[lang]?.[key] || I18N.fa[key] || key);

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

  // Dirty state tracking
  const isDirty = useMemo(() => {
    return (
      triggerType !== (post.trigger_type || "all") ||
      triggerContext !== (post.trigger_context || "") ||
      triggerKeywords !== (post.trigger_keywords || "") ||
      commentActionType !== (post.comment_action_type || "none") ||
      commentActionText !== (post.comment_action_text || "") ||
      dmActionType !== (post.dm_action_type || "none") ||
      dmActionText !== (post.dm_action_text || "") ||
      dmRequireFollow !== (post.dm_require_follow === 1)
    );
  }, [
    post,
    triggerType,
    triggerContext,
    triggerKeywords,
    commentActionType,
    commentActionText,
    dmActionType,
    dmActionText,
    dmRequireFollow,
  ]);

  // Sync with workspace navigation guard
  useEffect(() => {
    if (workspace) {
      workspace.setIsDirty(isDirty);
    }
  }, [isDirty, workspace]);

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
        toast.success(checked ? t("toastTurnedOn") : t("toastTurnedOff"));
      } else {
        setAutoReply(!checked);
        toast.error(data.error || "خطا در تغییر وضعیت پاسخ خودکار");
      }
    } catch {
      setAutoReply(!checked);
      toast.error("خطای شبکه در اتصال به سرور");
    }
  };

  const handleReset = () => {
    setTriggerType(post.trigger_type || "all");
    setTriggerContext(post.trigger_context || "");
    setTriggerKeywords(post.trigger_keywords || "");
    setCommentActionType(post.comment_action_type || "none");
    setCommentActionText(post.comment_action_text || "");
    setDmActionType(post.dm_action_type || "none");
    setDmActionText(post.dm_action_text || "");
    setDmRequireFollow(post.dm_require_follow === 1);
    toast.info("تغییرات لغو و به مقادیر اولیه بازگردانده شدند.");
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        trigger_type: triggerType,
        trigger_context: triggerContext,
        trigger_keywords: triggerKeywords,
        comment_action_type: commentActionType,
        comment_action_text: commentActionText,
        dm_action_type: dmActionType,
        dm_action_text: dmActionText,
        dm_require_follow: dmRequireFollow ? 1 : 0,
      };

      const res = await fetch(`/api/posts/${post.shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.post) {
        onSaveSuccess(data.post);
        if (workspace) {
          workspace.setIsDirty(false);
        }
        toast.success(t("toastConfigSaved") || "تنظیمات با موفقیت ذخیره شد");
      } else {
        toast.error(data.error || "خطا در ذخیره تنظیمات");
      }
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{t("backToPosts")}</span>
          </Button>

          <span className="text-zinc-300">/</span>

          <span className="text-xs font-mono font-semibold text-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border/60">
            <bdi>@{post.account_username}</bdi> / {post.shortcode}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenLogs(post.shortcode)}
            className="text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>{t("viewLogs")}</span>
          </Button>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-secondary transition-colors"
            >
              <span>{t("openInInstagram")}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Grid: Left Column = Media & Caption, Right Column = Automation Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Post Media & Original Caption (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-4/5 rounded-2xl overflow-hidden border border-border bg-secondary shadow-xs">
            {post.thumbnail_url ? (
              <img
                src={post.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <span className="font-mono text-sm uppercase">{post.post_type}</span>
                <span className="text-xs mt-1 text-muted-foreground/70">
                  {post.shortcode}
                </span>
              </div>
            )}
            <div className="absolute top-3 start-3 flex items-center gap-1.5">
              <Badge variant="secondary" className="backdrop-blur-md text-[10px] uppercase font-mono shadow-xs">
                {post.post_type}
              </Badge>
              <Badge
                variant={autoReply ? "default" : "outline"}
                className={`text-[10px] shadow-xs ${
                  autoReply
                    ? "bg-emerald-600 text-white"
                    : "bg-card/90 text-muted-foreground"
                }`}
              >
                {autoReply ? t("statusOn") : t("statusOff")}
              </Badge>
            </div>
          </div>

          {/* Original Caption Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {t("originalCaptionTitle")}
              </span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t("readOnlyBadge")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line bg-secondary/40 p-3 rounded-lg border border-border/60">
              {post.caption || t("noCaption")}
            </p>
            <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground/80 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>{t("aiNoticeBody")}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Automation Configuration Rules (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Universal ActivationCard for this post */}
          <ActivationCard
            title={t("commentAutoReplyTitle") || "پاسخ خودکار کامنت این پست"}
            subtitleOn={t("masterSwitchSubtitleOn")}
            subtitleOff={t("masterSwitchSubtitleOff")}
            enabled={autoReply}
            onToggle={handleToggleMaster}
            icon={<MessageSquare className="w-5 h-5 text-emerald-600" />}
            disabledNotice={t("offBannerText") || t("activationBannerNotice")}
          />

          {/* Progressive Disclosure Container */}
          <ProgressiveDisclosureContainer enabled={autoReply} className="space-y-5">
            {/* SECTION 1: TRIGGER */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div>
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
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
                  <div className="text-xs font-semibold">
                    {t("triggerKeywordsTitle")}
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
                  <div className="text-xs font-semibold">{t("triggerAiTitle")}</div>
                  <div className="text-[10px] opacity-80 mt-1 leading-snug">
                    {t("triggerAiDesc")}
                  </div>
                </button>
              </div>

              {/* Conditional Sub-fields for Keywords or AI */}
              {triggerType === "keywords" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t("triggerKeywordsLabel")}</span>
                  </label>
                  <Input
                    type="text"
                    value={triggerKeywords}
                    onChange={(e) => setTriggerKeywords(e.target.value)}
                    placeholder={t("triggerKeywordsPlaceholder")}
                    className="text-xs"
                  />
                </div>
              )}

              {triggerType === "ai_context" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t("triggerContextLabel")}</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {t("triggerContextHint")}
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={triggerContext}
                    onChange={(e) => setTriggerContext(e.target.value)}
                    placeholder={t("triggerContextPlaceholder")}
                    className="text-xs leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* SECTION 2: COMMENT ACTION */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div>
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t("commentActionTitle")}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("commentActionSubtitle")}
                </p>
              </div>

              {/* 3 Modes: none, direct, ai */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCommentActionType("none")}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    commentActionType === "none"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {t("actionNone")}
                </button>
                <button
                  type="button"
                  onClick={() => setCommentActionType("direct")}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    commentActionType === "direct"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {t("actionDirect")}
                </button>
                <button
                  type="button"
                  onClick={() => setCommentActionType("ai")}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    commentActionType === "ai"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {t("actionAi")}
                </button>
              </div>

              {commentActionType === "none" && (
                <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2.5 rounded-lg">
                  {t("commentNoneNote")}
                </div>
              )}

              {commentActionType === "direct" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      {t("commentDirectLabel")}
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {t("commentDirectHint")}
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={commentActionText}
                    onChange={(e) => setCommentActionText(e.target.value)}
                    placeholder={t("commentDirectPlaceholder")}
                    className="text-xs leading-relaxed"
                  />
                </div>
              )}

              {commentActionType === "ai" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      {t("commentAiLabel")}
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {t("commentAiHint")}
                    </span>
                  </div>
                  <Textarea
                    rows={3}
                    value={commentActionText}
                    onChange={(e) => setCommentActionText(e.target.value)}
                    placeholder={t("commentAiPlaceholder")}
                    className="text-xs leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* SECTION 3: DM ACTION */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div>
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>{t("dmActionTitle")}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("dmActionSubtitle")}
                </p>
              </div>

              {/* 3 Modes: none, direct, ai */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDmActionType("none")}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    dmActionType === "none"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {t("actionNone")}
                </button>
                <button
                  type="button"
                  onClick={() => setDmActionType("direct")}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    dmActionType === "direct"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {t("actionDirect")}
                </button>
                <button
                  type="button"
                  onClick={() => setDmActionType("ai")}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    dmActionType === "ai"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {t("actionAi")}
                </button>
              </div>

              {dmActionType === "none" && (
                <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2.5 rounded-lg">
                  {t("dmNoneNote")}
                </div>
              )}

              {dmActionType === "direct" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      {t("dmDirectLabel")}
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {t("dmDirectHint")}
                    </span>
                  </div>
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
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      {t("dmAiLabel")}
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {t("dmAiHint")}
                    </span>
                  </div>
                  <Textarea
                    rows={3}
                    value={dmActionText}
                    onChange={(e) => setDmActionText(e.target.value)}
                    placeholder={t("dmAiPlaceholder")}
                    className="text-xs leading-relaxed"
                  />
                </div>
              )}

              {/* Follow Requirement Option */}
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
          </ProgressiveDisclosureContainer>
        </div>
      </div>

      {/* Standardized Floating Bottom Save Bar */}
      <StickySaveBar
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSubmit}
        onReset={handleReset}
        saveLabel={t("saveChanges")}
        resetLabel={t("cancelChanges")}
        dirtyMessage={t("unsavedChangesTitle")}
      />
    </div>
  );
}
