"use client";

import React from "react";
import { ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/lib/db";

interface SessionHealthBadgeProps {
  account: string;
  status?: SessionStatus | string;
  onReLogin?: () => void;
  className?: string;
}

export function SessionHealthBadge({
  account,
  status = "unauthenticated",
  onReLogin,
  className,
}: SessionHealthBadgeProps) {
  const isHealthy = status === "active";

  if (!isHealthy) {
    return (
      <button
        type="button"
        onClick={onReLogin}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold",
          "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer",
          className
        )}
        title={`نشست @${account} غیرفعال است. کلیک برای ورود به حساب`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
        <span>نیاز به ورود به حساب</span>
        <RefreshCw className="w-3 h-3 text-rose-500 ms-0.5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium",
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
        className
      )}
      title={`نشست @${account} فعال است`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>نشست: فعال</span>
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 ms-0.5" />
    </div>
  );
}
