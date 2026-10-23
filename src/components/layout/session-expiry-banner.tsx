"use client";

import React from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
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
      className="bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-between text-xs shadow-md animate-in slide-in-from-top duration-300 select-none"
    >
      <div className="flex items-center gap-2.5">
        <MaterialSymbol name="warning" size={20} fill={true} className="shrink-0 text-white" />
        <span className="font-bold">
          نشست اکانت <bdi className="font-mono">@{account}</bdi> منقضی شده است و پاسخ‌های خودکار متوقف شده‌اند.
        </span>
        <span className="hidden sm:inline text-white/90">
          برای برقراری مجدد اتوماسیون، لطفاً دوباره وارد شوید.
        </span>
      </div>
      <Button
        onClick={onReLogin}
        size="sm"
        variant="elevated"
        className="bg-white text-destructive hover:bg-white/95 font-bold text-xs h-8 px-4 shrink-0 rounded-full cursor-pointer gap-1.5"
      >
        <MaterialSymbol name="key" size={16} />
        <span>ورود مجدد به اکانت</span>
      </Button>
    </div>
  );
}
