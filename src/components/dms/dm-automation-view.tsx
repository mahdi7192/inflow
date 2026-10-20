"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Clock,
  Sparkles,
  MessageSquare,
  Check,
  AlertCircle,
  ExternalLink,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { SidebarNav } from "@/components/sidebar-nav";
import { I18N, Lang } from "@/lib/i18n";
import type { AccountRow, DMAutomationRow, DMLogRow, BotStatus } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { BotToolbarButton } from "@/components/bot/bot-toolbar-button";
import { BotMonitorDrawer } from "@/components/bot/bot-monitor-drawer";
import { VncViewerModal } from "@/components/bot/vnc-viewer-modal";
import { ActivationCard, ProgressiveDisclosureContainer } from "@/components/ui/activation-card";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { PageContainer, PageHeader, PageBody } from "@/components/layout/page-layout";
import { useWorkspace } from "@/components/layout/workspace-context";
import { toast } from "@/components/ui/sonner";
import { DmTriggerSelector } from "./dm-trigger-selector";
import { DmDirectReplyCard } from "./dm-direct-reply-card";
import { DmAiPromptEditor } from "./dm-ai-prompt-editor";
import { DmFollowGateCard } from "./dm-follow-gate-card";
import { cn } from "@/lib/utils";

export interface DmAutomationViewProps {
  currentUser?: SafeUser | null;
  account: string;
  profile?: AccountRow;
  accounts?: AccountRow[];
  initialAutomation: DMAutomationRow;
  initialLogs?: DMLogRow[];
  embeddedInShell?: boolean;
}

export function DmAutomationView({
  account: propAccount,
  initialAutomation,
  embeddedInShell = false,
}: DmAutomationViewProps) {
  const router = useRouter();
  const workspace = useWorkspace();

  const account = workspace ? workspace.account : propAccount;
  const lang = workspace ? workspace.lang : "fa";
  const t = (key: string) => (workspace ? workspace.t(key) : I18N[lang]?.[key] || I18N.fa[key] || key);

  // Form State
  const [enabled, setEnabled] = useState(initialAutomation.enabled === 1);
  const [triggerType, setTriggerType] = useState<"all" | "keywords" | "ai_context">(
    initialAutomation.trigger_type || "all"
  );
  const [triggerKeywords, setTriggerKeywords] = useState(
    initialAutomation.trigger_keywords || ""
  );
  const [triggerContext, setTriggerContext] = useState(
    initialAutomation.trigger_context || ""
  );
  const [replyMode, setReplyMode] = useState<"direct" | "ai">(
    initialAutomation.reply_mode || "direct"
  );
  const [directReplyText, setDirectReplyText] = useState(
    initialAutomation.direct_reply_text || ""
  );
  const [aiPromptInstructions, setAiPromptInstructions] = useState(
    initialAutomation.ai_prompt_instructions || ""
  );
  const [requireFollow, setRequireFollow] = useState(
    initialAutomation.require_follow === 1
  );
  const [followPromptText, setFollowPromptText] = useState(
    initialAutomation.follow_prompt_text ||
      "سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏"
  );

  // Saving & Dirty State
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync isDirty with Workspace Context if available
  useEffect(() => {
    if (workspace) {
      workspace.setIsDirty(isDirty);
    }
  }, [isDirty, workspace]);

  // Master Toggle
  const handleToggleMaster = async (nextState: boolean) => {
    setEnabled(nextState);
    try {
      const res = await fetch(`/api/accounts/${account}/dm-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState ? 1 : 0 }),
      });
      const data = await res.json();
      if (!data.success) {
        setEnabled(!nextState);
        toast.error(data.error || "خطا در تغییر وضعیت اتوماسیون");
        return;
      }
      toast.success(
        nextState
          ? "اتوماسیون دایرکت با موفقیت فعال شد"
          : "اتوماسیون دایرکت غیرفعال شد"
      );
    } catch (err) {
      setEnabled(!nextState);
      toast.error("خطای شبکه در تغییر وضعیت");
    }
  };

  // Reset form to initial server values
  const handleResetConfig = () => {
    setEnabled(initialAutomation.enabled === 1);
    setTriggerType(initialAutomation.trigger_type || "all");
    setTriggerKeywords(initialAutomation.trigger_keywords || "");
    setTriggerContext(initialAutomation.trigger_context || "");
    setReplyMode(initialAutomation.reply_mode || "direct");
    setDirectReplyText(initialAutomation.direct_reply_text || "");
    setAiPromptInstructions(initialAutomation.ai_prompt_instructions || "");
    setRequireFollow(initialAutomation.require_follow === 1);
    setFollowPromptText(
      initialAutomation.follow_prompt_text ||
        "سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏"
    );
    setIsDirty(false);
    toast.info("تغییرات لغو و به مقادیر اولیه بازگردانده شدند.");
  };

  // Save Full Configuration
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${account}/dm-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: enabled ? 1 : 0,
          trigger_type: triggerType,
          trigger_keywords: triggerKeywords,
          trigger_context: triggerContext,
          reply_mode: replyMode,
          direct_reply_text: directReplyText,
          ai_prompt_instructions: aiPromptInstructions,
          require_follow: requireFollow ? 1 : 0,
          follow_prompt_text: followPromptText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsDirty(false);
        toast.success(t("dmSaveSuccess") || "تنظیمات دایرکت با موفقیت ذخیره شد");
      } else {
        toast.error(data.error || "خطا در ذخیره تنظیمات");
      }
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <PageContainer maxWidth="5xl">
      <PageHeader
        title={t("smartDmTitle") || "دایرکت هوشمند"}
        subtitle={
          t("dmPluginSubtitle") ||
          "مدیریت خودکار پاسخ به پیام‌های خصوصی، استعلامات کاربران و مشاوره هوشمند"
        }
        badge={
          <Badge variant="outline" className="text-xs font-mono font-normal">
            <bdi>@{account}</bdi>
          </Badge>
        }
        actions={
          <Link href={`/@${account}/dms/logs`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 cursor-pointer shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>{t("dmLogsTitle")}</span>
            </Button>
          </Link>
        }
      />

      <PageBody>
        {/* ۱. کارت سراسری فعال‌سازی (ActivationCard) */}
        <ActivationCard
          title={t("smartDmTitle") || "دایرکت هوشمند"}
          subtitleOn="پاسخگویی خودکار به پیام‌های دریافتی دایرکت اینستاگرام فعال است."
          subtitleOff="اتوماسیون دایرکت غیرفعال است. پیام‌های جدید بدون پاسخ خودکار باقی می‌مانند."
          enabled={enabled}
          onToggle={handleToggleMaster}
          icon={<Send className="w-5 h-5" />}
          disabledNotice={t("activationBannerNotice")}
        />

        {/* بخش‌های وابسته با آشکارسازی تدریجی */}
        <ProgressiveDisclosureContainer enabled={enabled} className="space-y-6">
          {/* ۲. شرط فعال‌سازی (Trigger) */}
          <DmTriggerSelector
            triggerType={triggerType}
            triggerKeywords={triggerKeywords}
            triggerContext={triggerContext}
            onChangeType={(typ) => {
              setTriggerType(typ);
              setIsDirty(true);
            }}
            onChangeKeywords={(kw) => {
              setTriggerKeywords(kw);
              setIsDirty(true);
            }}
            onChangeContext={(ctx) => {
              setTriggerContext(ctx);
              setIsDirty(true);
            }}
            lang={lang}
          />

          {/* ۲. حالت پاسخ‌دهی (Reply Mode) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {t("dmReplyModeTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                تعیین کنید پس از تریگر شدن، پاسخ به چه صورت آماده و ارسال گردد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setReplyMode("direct");
                  setIsDirty(true);
                }}
                className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer flex items-center gap-3 ${
                  replyMode === "direct"
                    ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    replyMode === "direct"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-foreground">
                    {t("dmReplyDirect")}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    ارسال متن آماده و ثابت بدون پردازش هوش مصنوعی
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReplyMode("ai");
                  setIsDirty(true);
                }}
                className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer flex items-center gap-3 ${
                  replyMode === "ai"
                    ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    replyMode === "ai"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-foreground">
                    {t("dmReplyAi")}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    پاسخ پویا و هوشمند بر اساس پرامپت و کانتکست متنی تعریف‌شده
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ۳. بخش پاسخ مستقیم یا پرامپت هوش مصنوعی */}
          {replyMode === "direct" ? (
            <DmDirectReplyCard
              directReplyText={directReplyText}
              onChangeText={(txt) => {
                setDirectReplyText(txt);
                setIsDirty(true);
              }}
              lang={lang}
            />
          ) : (
            <DmAiPromptEditor
              promptInstructions={aiPromptInstructions}
              onChangePrompt={(inst) => {
                setAiPromptInstructions(inst);
                setIsDirty(true);
              }}
              lang={lang}
            />
          )}

          {/* ۴. شرط دنبال کردن پیج (Follow Gate) */}
          <DmFollowGateCard
            requireFollow={requireFollow}
            followPromptText={followPromptText}
            onToggleRequireFollow={(rf) => {
              setRequireFollow(rf);
              setIsDirty(true);
            }}
            onChangePromptText={(pt) => {
              setFollowPromptText(pt);
              setIsDirty(true);
            }}
            lang={lang}
          />
        </ProgressiveDisclosureContainer>
      </PageBody>

      {/* داک ذخیره چسبان شناور در پایین صفحه */}
      <StickySaveBar
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSaveConfig}
        onReset={handleResetConfig}
        saveLabel={t("saveChanges")}
        resetLabel={t("cancelChanges")}
        dirtyMessage={t("unsavedChangesTitle")}
      />
    </PageContainer>
  );

  if (embeddedInShell) {
    return content;
  }

  // Fallback for standalone rendering outside shell
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-vazir" dir={lang === "en" ? "ltr" : "rtl"}>
      {content}
    </div>
  );
}
