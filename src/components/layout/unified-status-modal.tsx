"use client";

import React from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Power,
  MessageSquare,
  Send,
  RefreshCw,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                وضعیت و ماژول‌های اتوماسیون پیج
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                کنترل متمرکز نشست، کلید اصلی و تفکیک اتوماسیون کامنت و دایرکت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          {/* 1. Instagram Account & Session Status Card */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={account}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-sm shadow-sm">
                    {account.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {profile?.display_name || account}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">@{account}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isSessionHealthy ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        {getSessionStatusLabel(effectiveSessionStatus)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                        {getSessionStatusLabel(effectiveSessionStatus)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isSessionHealthy && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenLoginModal();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  ورود مجدد
                </button>
              )}
            </div>
          </div>

          {/* 2. Master Automation Switch */}
          <div
            className={`rounded-xl border p-4 transition-all duration-200 ${
              isMasterActive
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                : "border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Power
                    className={`h-4 w-4 ${
                      isMasterActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    کلید اصلی اتوماسیون پیج (Master Switch)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isMasterActive
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200"
                    }`}
                  >
                    {isMasterActive ? "کلاً فعال" : "کلاً متوقف"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* 3. Granular Modules Control */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              تفکیک ماژول‌ها و هوشمندی (Granular Modules)
            </h3>

            {/* Module 1: Comment Triggers & Follow Gate */}
            <div
              className={`rounded-xl border p-4 transition-colors ${
                isMasterActive
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80"
                  : "border-zinc-200/60 bg-zinc-50/50 opacity-70 dark:border-zinc-800/60 dark:bg-zinc-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        ماژول ۱: تریگر کامنت‌ها و احراز فالو
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {isMasterActive ? "فعال (تنظیمات پست)" : "متوقف با کلید اصلی"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      پاسخ به کامنت‌ها، ارسال دایرکت اولیه هدیه یا لینک، و بررسی شرط فالو برای تحویل پاداش به کامنت‌گذار.
                    </p>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Module 2: Direct Messages Automation */}
            <div
              className={`rounded-xl border p-4 transition-colors ${
                !isMasterActive
                  ? "border-zinc-200/60 bg-zinc-50/50 opacity-70 dark:border-zinc-800/60 dark:bg-zinc-900/40"
                  : dmAutomationEnabled
                  ? "border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-950/20"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Send className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        ماژول ۲: پاسخگوی خودکار دایرکت و استوری
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          !isMasterActive
                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : dmAutomationEnabled
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {dmAutomationEnabled && isMasterActive ? "فعال" : "متوقف"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      پاسخ هوشمند به کسانی که مستقیماً در دایرکت یا ریپلای استوری پیام می‌دهند.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <Switch
                    checked={dmAutomationEnabled}
                    disabled={!isMasterActive || loadingDm}
                    onCheckedChange={(checked) => onToggleDmAutomation(checked)}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
              </div>

              {/* Note on isolation */}
              <div className="mt-3 rounded-lg bg-amber-50/80 p-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong>ایزوله‌سازی هوشمند:</strong> وقتی این ماژول متوقف باشد، ربات به پیام‌های عمومی یا سوالات جدید در دایرکت پاسخی نمی‌دهد؛ اما اگر کاربری روی پستی کامنت بگذارد و عبارت «فالو کردم» بفرستد، شرط فالو بررسی شده و لینک/هدیه کامنت فوراً برایش ارسال می‌شود.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-100 px-6 py-3.5 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
}
