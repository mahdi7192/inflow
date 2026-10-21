"use client";

import React from "react";
import { AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionExpiryBannerProps {
  account: string;
  onReLogin: () => void;
}

export function SessionExpiryBanner({
  account,
  onReLogin,
}: SessionExpiryBannerProps) {
  return (
    <div
      dir="rtl"
      className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-md animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
        <span className="font-semibold">
          نشست اکانت @{account} منقضی شده است و پاسخ‌های خودکار متوقف شده‌اند.
        </span>
        <span className="hidden sm:inline text-rose-100">
          برای برقراری مجدد اتوماسیون، لطفاً دوباره وارد شوید.
        </span>
      </div>
      <Button
        onClick={onReLogin}
        size="sm"
        className="bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs h-7 px-3 shrink-0"
      >
        <KeyRound className="w-3.5 h-3.5 me-1" />
        ورود مجدد به اکانت
      </Button>
    </div>
  );
}
