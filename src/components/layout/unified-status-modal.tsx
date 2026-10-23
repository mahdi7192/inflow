"use client";

import React from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface UnifiedStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  profile?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
    session_status?: string;
    status?: "active" | "paused";
  };
  sessionStatus?: string;
  masterStatus: "active" | "paused";
  dmAutomationEnabled: boolean;
  onToggleMasterStatus: () => Promise<void> | void;
  onToggleDmAutomation: (enabled: boolean) => Promise<void> | void;
  onOpenLoginModal: () => void;
  loadingMaster?: boolean;
  loadingDm?: boolean;
}

export function UnifiedStatusModal({
  isOpen,
  onClose,
  account,
  profile,
  sessionStatus,
  masterStatus,
  dmAutomationEnabled,
  onToggleMasterStatus,
  onToggleDmAutomation,
  onOpenLoginModal,
  loadingMaster = false,
  loadingDm = false,
}: UnifiedStatusModalProps) {
  if (!isOpen) return null;

  const effectiveSessionStatus = sessionStatus || profile?.session_status || "active";
  const isSessionHealthy = effectiveSessionStatus === "active";
  const isMasterActive = masterStatus === "active";

  const getSessionStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "نشست معتبر و متصل به اینستاگرام";
      case "challenge_required":
        return "نیاز به حل چالش امنیتی (کد تایید)";
      case "checkpoint_required":
        return "چک‌پوینت اینستاگرام فعال شده است";
      case "expired":
        return "نشست منقضی شده است";
      case "reauth_required":
        return "نیاز به ورود مجدد به حساب";
      case "unauthenticated":
        return "وارد حساب نشده‌اید";
      default:
        return "وضعیت نشست نامشخص";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/60 px-6 py-4 bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container shadow-2xs">
              <MaterialSymbol name="tune" size={22} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                وضعیت و ماژول‌های اتوماسیون پیج
              </h2>
              <p className="text-[11px] text-muted-foreground">
                کنترل متمرکز نشست، کلید اصلی و تفکیک اتوماسیون کامنت و دایرکت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-container-high hover:text-foreground transition-colors cursor-pointer"
          >
            <MaterialSymbol name="close" size={20} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* 1. Instagram Account & Session Status Card */}
          <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={account}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-outline-variant"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-xs shadow-xs">
                    {account.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-foreground">
                      {profile?.display_name || account}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono"><bdi>@{account}</bdi></span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isSessionHealthy ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <MaterialSymbol name="verified" size={16} fill={true} className="text-emerald-600" />
                        {getSessionStatusLabel(effectiveSessionStatus)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                        <MaterialSymbol name="error" size={16} fill={true} className="text-rose-600" />
                        {getSessionStatusLabel(effectiveSessionStatus)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isSessionHealthy && (
                <Button
                  variant="filled"
                  size="sm"
                  onClick={() => {
                    onOpenLoginModal();
                    onClose();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 cursor-pointer rounded-full"
                >
                  <MaterialSymbol name="refresh" size={16} />
                  <span>ورود مجدد</span>
                </Button>
              )}
            </div>
          </div>

          {/* 2. Master Automation Switch */}
          <div
            className={`rounded-3xl border p-4 transition-all duration-200 ${
              isMasterActive
                ? "border-emerald-300 bg-emerald-50/70"
                : "border-amber-300 bg-amber-50/70"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MaterialSymbol
                    name="power_settings_new"
                    size={20}
                    className={isMasterActive ? "text-emerald-700" : "text-amber-700"}
                  />
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    کلید اصلی اتوماسیون پیج (Master Switch)
                  </span>
                  <Badge
                    variant={isMasterActive ? "emerald" : "amber"}
                    className="font-bold"
                  >
                    {isMasterActive ? "کلاً فعال" : "کلاً متوقف"}
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                  {isMasterActive
                    ? "اتوماسیون سراسری فعال است. ماژول‌های فعال زیر مجاز به ارسال پیام و پاسخگویی هستند."
                    : "تمام فعالیت‌های خودکار ربات، ارسال دایرکت و پاسخ به کامنت‌ها به طور کامل متوقف شده است."}
                </p>
              </div>

              <div className="pt-1">
                <Switch
                  checked={isMasterActive}
                  disabled={loadingMaster}
                  onCheckedChange={onToggleMasterStatus}
                />
              </div>
            </div>
          </div>

          {/* 3. Granular Modules Control */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              تفکیک ماژول‌ها و هوشمندی (Granular Modules)
            </h3>

            {/* Module 1: Comment Triggers & Follow Gate */}
            <div
              className={`rounded-3xl border p-4 transition-colors ${
                isMasterActive
                  ? "border-outline-variant/80 bg-surface-container-lowest"
                  : "border-outline-variant/40 bg-surface-container/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                    <MaterialSymbol name="forum" size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        ماژول ۱: تریگر کامنت‌ها و احراز فالو
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {isMasterActive ? "فعال (تنظیمات پست)" : "متوقف با کلید اصلی"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      پاسخ به کامنت‌ها، ارسال دایرکت اولیه هدیه یا لینک، و بررسی شرط فالو برای تحویل پاداش به کامنت‌گذار.
                    </p>
                  </div>
                </div>
                <div className="pt-1">
                  <MaterialSymbol name="check_circle" size={20} fill={true} className="text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Module 2: Direct Messages Automation */}
            <div
              className={`rounded-3xl border p-4 transition-colors ${
                !isMasterActive
                  ? "border-outline-variant/40 bg-surface-container/40 opacity-70"
                  : dmAutomationEnabled
                  ? "border-primary/40 bg-primary-container/20"
                  : "border-outline-variant/80 bg-surface-container-lowest"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                    <MaterialSymbol name="chat_bubble" size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        ماژول ۲: پاسخگوی خودکار دایرکت و استوری
                      </span>
                      <Badge
                        variant={!isMasterActive ? "muted" : dmAutomationEnabled ? "sky" : "muted"}
                        className="text-[10px]"
                      >
                        {dmAutomationEnabled && isMasterActive ? "فعال" : "متوقف"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      پاسخ هوشمند به کسانی که مستقیماً در دایرکت یا ریپلای استوری پیام می‌دهند.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <Switch
                    checked={dmAutomationEnabled}
                    disabled={!isMasterActive || loadingDm}
                    onCheckedChange={(checked) => onToggleDmAutomation(checked)}
                  />
                </div>
              </div>

              {/* Note on isolation */}
              <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] text-amber-900 border border-amber-200/80 flex items-start gap-2.5">
                <MaterialSymbol name="info" size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>ایزوله‌سازی هوشمند:</strong> وقتی این ماژول متوقف باشد، ربات به پیام‌های عمومی یا سوالات جدید در دایرکت پاسخی نمی‌دهد؛ اما اگر کاربری روی پستی کامنت بگذارد و عبارت «فالو کردم» بفرستد، شرط فالو بررسی شده و لینک/هدیه کامنت فوراً برایش ارسال می‌شود.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-outline-variant/60 px-6 py-3.5 bg-surface-container">
          <Button
            variant="filled"
            size="default"
            onClick={onClose}
            className="rounded-full cursor-pointer"
          >
            تایید و بستن
          </Button>
        </div>
      </div>
    </div>
  );
}
