"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Save,
  Clock,
  Sparkles,
  MessageSquare,
  Check,
  AlertCircle,
  ExternalLink,
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
import { DmHeaderToggle } from "./dm-header-toggle";
import { DmTriggerSelector } from "./dm-trigger-selector";
import { DmDirectReplyCard } from "./dm-direct-reply-card";
import { DmAiPromptEditor } from "./dm-ai-prompt-editor";
import { DmFollowGateCard } from "./dm-follow-gate-card";
import { cn } from "@/lib/utils";

export interface DmAutomationViewProps {
  currentUser?: SafeUser | null;
  account: string;
  profile: AccountRow;
  accounts: AccountRow[];
  initialAutomation: DMAutomationRow;
  initialLogs?: DMLogRow[];
}

export function DmAutomationView({
  currentUser,
  account,
  profile,
  accounts,
  initialAutomation,
}: DmAutomationViewProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fa");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Bot Drawer & VNC States
  const [botDrawerOpen, setBotDrawerOpen] = useState(false);
  const [vncModalOpen, setVncModalOpen] = useState(false);
  const [vncUrl, setVncUrl] = useState("");
  const [vncExpiresInSec, setVncExpiresInSec] = useState(600);
  const [isVncLoading, setIsVncLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus>(profile.bot_status || "unprovisioned");

  const handleOpenVnc = async () => {
    setIsVncLoading(true);
    try {
      const res = await fetch("/api/bot/vnc-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json();
      if (data.success) {
        setVncUrl(data.vnc_url);
        setVncExpiresInSec(data.timeout_seconds || 600);
        setVncModalOpen(true);
      } else {
        alert("خطا در باز کردن نشست مانیتور: " + data.error);
      }
    } catch (err) {
      console.error("VNC launch error:", err);
    } finally {
      setIsVncLoading(false);
    }
  };

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

  // Saving state
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Instant Master Toggle
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
        return false;
      }
      return true;
    } catch (err) {
      console.error("Master toggle request failed:", err);
      setEnabled(!nextState);
      return false;
    }
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
        showToast(t("dmSaveSuccess"), "success");
      } else {
        showToast(data.error || "خطا در ذخیره تنظیمات", "error");
      }
    } catch (err) {
      console.error("Save config error:", err);
      showToast("خطا در برقراری ارتباط با سرور", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAccount = (username: string) => {
    router.push(`/@${username}/dms`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div
      dir={lang === "fa" || lang === "ar" ? "rtl" : "ltr"}
      className="flex h-screen bg-zinc-50 overflow-hidden font-vazir"
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 end-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-xs shadow-xl animate-in fade-in slide-in-from-bottom-3 ${
            toastMsg.type === "success"
              ? "bg-zinc-900 text-white border border-zinc-700"
              : "bg-rose-600 text-white border border-rose-500"
          }`}
        >
          {toastMsg.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <SidebarNav
          currentAccount={account}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onOpenAddAccount={() => {}}
          onOpenAgentApi={() => {}}
          onSync={async () => {}}
          syncing={false}
          currentUser={currentUser}
          onLogout={handleLogout}
          lang={lang}
          activePlugin="dms"
        />
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-card z-10 shadow-2xl animate-in slide-in-from-start">
            <SidebarNav
              currentAccount={account}
              accounts={accounts}
              onSelectAccount={(usr) => {
                handleSelectAccount(usr);
                setMobileDrawerOpen(false);
              }}
              onOpenAddAccount={() => {}}
              onOpenAgentApi={() => {}}
              onSync={async () => {}}
              syncing={false}
              currentUser={currentUser}
              onLogout={handleLogout}
              lang={lang}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              activePlugin="dms"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-border bg-white/80 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label={t("openMenu")}
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {t("navDms")}
              </span>
              <span className="text-zinc-300">/</span>
              <span className="font-mono text-muted-foreground">
                @{account}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BotToolbarButton
              account={account}
              botStatus={botStatus}
              lang={lang}
              onClick={() => setBotDrawerOpen(true)}
            />
            <LanguageDropdown
              currentLang={lang}
              onLangChange={(l) => setLang(l)}
              size="sm"
            />
          </div>
        </header>

        {/* Workspace Body */}
        <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
          {/* Sub-header Navigation with View Logs button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {t("dmPluginTitle")}
              </span>
              <Badge variant="outline" className="text-[11px] font-mono font-medium text-muted-foreground">
                @{account}
              </Badge>
            </div>

            <Link href={`/@${account}/dms/logs`}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs gap-1.5 cursor-pointer border-border"
              >
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>{t("dmLogsTitle")}</span>
              </Button>
            </Link>
          </div>

          {/* Top Master Switch Toggle */}
          <DmHeaderToggle
            enabled={enabled}
            onToggle={handleToggleMaster}
            lang={lang}
          />

          {/* ۱. شرط فعال‌سازی (Trigger) */}
          <DmTriggerSelector
            triggerType={triggerType}
            triggerKeywords={triggerKeywords}
            triggerContext={triggerContext}
            onChangeType={(t) => {
              setTriggerType(t);
              setIsDirty(true);
            }}
            onChangeKeywords={(k) => {
              setTriggerKeywords(k);
              setIsDirty(true);
            }}
            onChangeContext={(c) => {
              setTriggerContext(c);
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

          {/* Reply Mode: Direct */}
          {replyMode === "direct" && (
            <DmDirectReplyCard
              directReplyText={directReplyText}
              onChangeText={(txt) => {
                setDirectReplyText(txt);
                setIsDirty(true);
              }}
              lang={lang}
            />
          )}

          {/* Reply Mode: AI Prompt Instructions & Context */}
          {replyMode === "ai" && (
            <DmAiPromptEditor
              promptInstructions={aiPromptInstructions}
              onChangePrompt={(ins) => {
                setAiPromptInstructions(ins);
                setIsDirty(true);
              }}
              lang={lang}
            />
          )}

          {/* ۳. شرط فالو داشتن (Follow Gate) */}
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

          {/* Non-sticky Save Configuration Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              type="button"
              variant="default"
              size="lg"
              disabled={saving}
              onClick={handleSaveConfig}
              className="w-full sm:w-auto px-8 gap-2 shadow-sm cursor-pointer"
            >
              <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "در حال ذخیره..." : t("dmSaveConfigBtn")}</span>
            </Button>

            <div className="text-xs text-muted-foreground self-start sm:self-center">
              {isDirty ? (
                <span className="text-amber-600 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  تغییرات ذخیره‌نشده وجود دارد
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  تنظیمات با سرور هماهنگ است
                </span>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Bot Telemetry & Monitoring Drawer */}
      <BotMonitorDrawer
        isOpen={botDrawerOpen}
        onClose={() => setBotDrawerOpen(false)}
        account={account}
        botStatus={botStatus}
        lang={lang}
        onOpenVnc={handleOpenVnc}
        isVncLoading={isVncLoading}
        onStatusChange={(status) => setBotStatus(status)}
      />

      {/* Ephemeral VNC Viewer Modal */}
      <VncViewerModal
        isOpen={vncModalOpen}
        onClose={() => setVncModalOpen(false)}
        account={account}
        vncUrl={vncUrl}
        initialExpiresInSeconds={vncExpiresInSec}
        lang={lang}
      />
    </div>
  );
}
