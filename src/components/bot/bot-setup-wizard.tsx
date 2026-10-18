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
  onStatusChange: (newStatus: BotStatus) => void;
}

export function BotSetupWizard({
  account,
  botStatus,
  lang,
  onOpenVnc,
  onStatusChange,
}: BotSetupWizardProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const rtl = isRTL(lang);
  const t = I18N[lang];

  // Determine current active step index (0, 1, 2)
  let currentStep = 0;
  if (botStatus === "provisioning") currentStep = 0;
  else if (botStatus === "login_required") currentStep = 1;
  else if (botStatus === "live") currentStep = 2;

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
                botStatus === "login_required"
                  ? "bg-amber-100 text-amber-900 border-amber-200"
                  : botStatus === "provisioning"
                  ? "bg-blue-100 text-blue-900 border-blue-200"
                  : "bg-zinc-100 text-zinc-800"
              }
            >
              {botStatus === "provisioning" && <Loader2 className="w-3 h-3 animate-spin me-1" />}
              {botStatus === "login_required"
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
              <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-xs flex items-center justify-center font-bold">
                3
              </span>
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

      {botStatus === "login_required" && (
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
            >
              <Monitor className="w-4 h-4 me-2" />
              {t.botLoginNowBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
