"use client";

import React from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
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
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
          "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition-all cursor-pointer shadow-2xs",
          className
        )}
        title={`نشست @${account} غیرفعال است. کلیک برای ورود به حساب`}
      >
        <MaterialSymbol name="error" size={16} fill className="animate-bounce" />
        <span>نیاز به ورود مجدد</span>
        <MaterialSymbol name="refresh" size={14} className="ms-0.5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
        className
      )}
      title={`نشست @${account} فعال است`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>نشست: فعال</span>
      <MaterialSymbol name="verified_user" size={16} fill className="ms-0.5" />
    </div>
  );
}