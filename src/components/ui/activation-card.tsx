"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivationCardProps {
  title: string;
  subtitleOn: string;
  subtitleOff: string;
  enabled: boolean;
  onToggle: (checked: boolean) => Promise<void> | void;
  icon?: React.ReactNode;
  badgeOnText?: string;
  badgeOffText?: string;
  disabledNotice?: string;
  loading?: boolean;
  className?: string;
}

export function ActivationCard({
  title,
  subtitleOn,
  subtitleOff,
  enabled,
  onToggle,
  icon,
  badgeOnText = "روشن",
  badgeOffText = "خاموش",
  disabledNotice = "این قابلیت در حال حاضر خاموش است. برای فعال‌سازی و پاسخگویی به کاربران، کلید بالا را روشن کنید.",
  loading = false,
  className,
}: ActivationCardProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setInternalLoading(true);
    try {
      await onToggle(checked);
    } finally {
      setInternalLoading(false);
    }
  };

  const isSpinning = loading || internalLoading;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "rounded-2xl border p-4 sm:p-5 transition-all duration-200 shadow-2xs",
          enabled
            ? "border-emerald-200/80 bg-emerald-50/20"
            : "border-border bg-card"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
            {icon && (
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors shadow-2xs",
                  enabled
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-secondary text-muted-foreground border-border"
                )}
              >
                {icon}
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-foreground">
                  {title}
                </span>
                <Badge
                  variant={enabled ? "default" : "outline"}
                  className={cn(
                    "text-[10px] sm:text-xs font-medium px-2 py-0.5",
                    enabled
                      ? "bg-emerald-600 text-white hover:bg-emerald-600 border-transparent shadow-2xs"
                      : "text-muted-foreground border-border"
                  )}
                >
                  {enabled ? badgeOnText : badgeOffText}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {enabled ? subtitleOn : subtitleOff}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSpinning && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={isSpinning}
              aria-label={title}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Alert Banner when disabled */}
      {!enabled && disabledNotice && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{disabledNotice}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Helper container to mute child configuration forms when feature is deactivated
 */
export function ProgressiveDisclosureContainer({
  enabled,
  children,
  className,
}: {
  enabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-200",
        enabled
          ? "opacity-100 pointer-events-auto"
          : "opacity-50 pointer-events-none select-none",
        className
      )}
    >
      {children}
    </div>
  );
}
