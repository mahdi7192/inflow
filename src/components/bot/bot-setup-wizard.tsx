"use client";

import React, { useState } from "react";
import { Bot, ShieldCheck, CheckCircle2, Loader2, Monitor, ArrowRight, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { I18N, Lang, isRTL } from "@/lib/i18n";
import { BotStatus } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BotSetupWizardProps {
  account: string;
  botStatus: BotStatus;
  lang: Lang;
  onOpenVnc: () => void;
  isVncLoading?: boolean;
  onStatusChange: (newStatus: BotStatus) => void;
  onComplete?: () => void;
}

export function BotSetupWizard({
  account,
  botStatus,
  lang,
  onOpenVnc,
  isVncLoading = false,
  onStatusChange,
  onComplete,
}: BotSetupWizardProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "completed" | "error">("idle");
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [syncedFollowers, setSyncedFollowers] = useState<string>("");
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>("");
  const rtl = isRTL(lang);
  const t = I18N[lang];

  // Determine current active step index (0, 1, 2)
  let currentStep = 0;
  if (botStatus === "provisioning") currentStep = 0;
  else if (botStatus === "login_required" || botStatus === "checkpoint_required") currentStep = 1;
  else if (botStatus === "live") currentStep = 2;

  const handleStartSync = async () => {
    setSyncState("syncing");
    setErrorMsg(null);
    setSyncProgressMsg(t.botSyncInProgress);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, wait: true, force_full: true }),
      });
      const data = await res.json();
      if (data.success) {
        const count = data.posts_synced ?? data.stats?.total ?? 0;
        setSyncedCount(count);
        if (data.followers_text) setSyncedFollowers(data.followers_text);
        setSyncState("completed");
      } else {
        setSyncState("error");
        setErrorMsg(data.error || "خطا در استخراج اولیه پست‌ها از اینستاگرام");
      }
    } catch (err: unknown) {
      setSyncState("error");
      setErrorMsg((err as Error).message || "خطا در شبکه هنگام سینک پست‌ها");
    }
  };

  // Trigger sync as soon as Step 3 is reached
  React.useEffect(() => {
    if (botStatus === "live" && syncState === "idle") {
      handleStartSync();
    }
  }, [botStatus, syncState]);

  const handleStartProvisioning = async () => {
    setLoading(true);
    setErrorMsg(null);
    onStatusChange("provisioning");

    try {
      const res = await fetch("/api/bot/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json();
      if (data.success) {
        onStatusChange(data.status || "login_required");
        onOpenVnc();
      } else {
        setErrorMsg(data.error || "خطا در برقراری ارتباط با سرور");
        onStatusChange("error");
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "خطا در شبکه");
      onStatusChange("error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySession = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bot/session-harvested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, verified: true }),
      });
      const data = await res.json();
      if (data.success && data.status === "live") {
        onStatusChange("live");
      } else {
        setErrorMsg("نشست اینستاگرام هنوز تایید نشده است. لطفاً ابتدا در مرورگر وارد شوید.");
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "خطا در بررسی نشست");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-6" dir={rtl ? "rtl" : "ltr"}>
      {/* Header Banner */}
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 border border-zinc-200">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{t.botSetupTitle}</h2>
                <Badge variant="outline" className="font-mono text-xs">
                  @{account}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t.botSetupSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                botStatus === "live"
                  ? syncState === "completed"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                    : "bg-blue-100 text-blue-900 border-blue-200"
                  : botStatus === "login_required"
                  ? "bg-amber-100 text-amber-900 border-amber-200"
                  : botStatus === "provisioning"
                  ? "bg-blue-100 text-blue-900 border-blue-200"
                  : "bg-zinc-100 text-zinc-800"
              }
            >
              {(botStatus === "provisioning" || (botStatus === "live" && syncState === "syncing")) && (
                <Loader2 className="w-3 h-3 animate-spin me-1" />
              )}
              {botStatus === "live"
                ? syncState === "completed"
                  ? t.botSyncSuccess
                  : syncState === "syncing"
                  ? t.botSyncInProgress
                  : t.botStatusLive
                : botStatus === "login_required"
                ? t.botStatusLoginRequired
                : botStatus === "provisioning"
                ? t.botStatusProvisioning
                : t.botStatusUnprovisioned}
            </Badge>
          </div>
        </div>

        {/* 3-Step Visual Progress Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {/* Step 1 */}
          <div
            className={`p-4 rounded-lg border transition-all ${
              currentStep === 0
                ? "bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900"
                : currentStep > 0
                ? "bg-zinc-50/50 border-zinc-200 opacity-90"
                : "bg-background border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {currentStep > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
              )}
              <h3 className="font-semibold text-sm text-foreground">{t.botStep1Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t.botStep1Desc}</p>
          </div>

          {/* Step 2 */}
          <div
            className={`p-4 rounded-lg border transition-all ${
              currentStep === 1
                ? "bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900"
                : currentStep > 1
                ? "bg-zinc-50/50 border-zinc-200 opacity-90"
                : "bg-background border-border opacity-60"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {currentStep > 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-xs flex items-center justify-center font-bold">
                  2
                </span>
              )}
              <h3 className="font-semibold text-sm text-foreground">{t.botStep2Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t.botStep2Desc}</p>
          </div>

          {/* Step 3 */}
          <div
            className={`p-4 rounded-lg border transition-all ${
              currentStep === 2
                ? "bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900"
                : "bg-background border-border opacity-60"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {syncState === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : syncState === "syncing" ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-xs flex items-center justify-center font-bold">
                  3
                </span>
              )}
              <h3 className="font-semibold text-sm text-foreground">{t.botStep3Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t.botStep3Desc}</p>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">خطا در عملیات</h4>
            <p className="text-xs mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setErrorMsg(null)}>
            بستن
          </Button>
        </div>
      )}

      {/* Main Step Interaction Cards */}
      {botStatus === "unprovisioned" && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Security Reassurance Banner */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">{t.botSecurityBannerTitle}</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">{t.botSecurityBannerBody}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              با کلیک روی دکمه مقابل، یک پروفایل اختصاصی در سرور ایجاد شده و مرورگر رسمی کروم باز می‌شود.
            </div>
            <Button
              size="lg"
              className="w-full sm:w-auto font-medium"
              onClick={handleStartProvisioning}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                  {t.botProvisioningInProgress}
                </>
              ) : (
                <>
                  {t.botStartProvisioningBtn}
                  {rtl ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {botStatus === "provisioning" && (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="font-bold text-lg text-foreground">{t.botProvisioningInProgress}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            در حال ساخت دایرکتوری ایزوله، راه‌اندازی نمایشگر مجازی TigerVNC و اجرای گوگل کروم...
          </p>
        </div>
      )}

      {(botStatus === "login_required" || botStatus === "checkpoint_required") && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Monitor className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-900">محیط ربات آماده شد؛ ورود به اینستاگرام الزامی است</h4>
              <p className="text-xs leading-relaxed text-amber-800/90">{t.botLoginHelpText}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="default"
              className="w-full sm:w-auto"
              onClick={handleVerifySession}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <RefreshCw className="w-4 h-4 me-2" />}
              بررسی مجدد ورود
            </Button>

            <Button
              size="lg"
              className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
              onClick={onOpenVnc}
              disabled={isVncLoading}
            >
              {isVncLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Monitor className="w-4 h-4 me-2" />}
              {isVncLoading ? "در حال اتصال به دسکتاپ..." : t.botLoginNowBtn}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Initial Sync & Harvester */}
      {botStatus === "live" && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                syncState === "completed"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                  : syncState === "syncing"
                  ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800"
                  : syncState === "error"
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800"
                  : "bg-zinc-100 text-zinc-900 border-zinc-200"
              }`}
            >
              {syncState === "syncing" ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : syncState === "completed" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : syncState === "error" ? (
                <AlertCircle className="w-6 h-6 text-rose-600" />
              ) : (
                <RefreshCw className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                {syncState === "completed" ? t.botSyncSuccess : t.botStep3Title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {syncState === "completed" ? t.botSyncSuccessDesc : t.botStep3Desc}
              </p>
            </div>
          </div>

          {/* Syncing State */}
          {syncState === "syncing" && (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Bot className="w-7 h-7 text-primary absolute" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm font-semibold text-foreground">
                  {syncProgressMsg || t.botSyncInProgress}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rtl
                    ? "ربات در حال استخراج آخرین پست‌ها، ریلزها، کاورها و آمار پیج از اینستاگرام است. این فرآیند چند لحظه زمان می‌برد..."
                    : "The bot is harvesting latest posts, reels, covers, and profile stats from Instagram. Please wait a moment..."}
                </p>
              </div>
            </div>
          )}

          {/* Completed State */}
          {syncState === "completed" && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-emerald-100/90 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 px-3.5 py-1.5 text-sm font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    {rtl
                      ? `تعداد پست‌های دریافت شده: ${syncedCount} پست`
                      : `${syncedCount} posts harvested`}
                  </span>
                </Badge>
                {syncedFollowers && (
                  <Badge
                    variant="outline"
                    className="bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 px-3 py-1 text-sm font-medium"
                  >
                    {syncedFollowers}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rtl
                  ? "ارتباط و همگام‌سازی اکانت اینستاگرام با موفقیت کامل انجام شد. اکنون می‌توانید وارد لیست پست‌ها شوید و پاسخ‌های هوشمند به کامنت‌ها، دایرکت‌ها و کمپین‌های اتوماسیون را مدیریت نمایید."
                  : "Instagram connection and sync completed successfully. You can now access your posts list to configure auto-replies, direct messages, and smart campaigns."}
              </p>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    if (onComplete) onComplete();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-all text-sm cursor-pointer"
                >
                  <span>{t.botViewPostsBtn}</span>
                  {rtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {syncState === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleStartSync}
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t.botRetrySyncBtn}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (onComplete) onComplete();
                  }}
                >
                  <span>{t.botViewPostsBtn}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
