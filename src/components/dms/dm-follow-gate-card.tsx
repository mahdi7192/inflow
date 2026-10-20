"use client";

import React from "react";
import { UserCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { I18N, Lang } from "@/lib/i18n";

interface DmFollowGateCardProps {
  requireFollow: boolean;
  followPromptText: string;
  onToggleRequireFollow: (required: boolean) => void;
  onChangePromptText: (text: string) => void;
  lang?: Lang;
}

export function DmFollowGateCard({
  requireFollow,
  followPromptText,
  onToggleRequireFollow,
  onChangePromptText,
  lang = "fa",
}: DmFollowGateCardProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-secondary text-foreground flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {t("dmFollowGateTitle")}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("dmFollowGateSubtitle")}
            </p>
          </div>
        </div>

        <Switch
          checked={requireFollow}
          onCheckedChange={onToggleRequireFollow}
          className="cursor-pointer"
        />
      </div>

      {requireFollow && (
        <div className="space-y-2 pt-2 border-t border-border animate-in fade-in">
          <label className="text-xs font-medium text-foreground block">
            {t("dmFollowPromptLabel")}
          </label>
          <textarea
            rows={2}
            value={followPromptText}
            onChange={(e) => onChangePromptText(e.target.value)}
            placeholder={t("dmFollowPromptPlaceholder")}
            className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed resize-y font-vazir"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            ℹ️ اگر کاربری هنوز پیج را فالو نکرده باشد، ربات این پیام را ارسال کرده و وضعیت کاربر را به صورت در انتظار فالو (pending_follow) ثبت می‌کند تا پس از فالو و ارسال پیام بعدی پاسخ داده شود.
          </p>
        </div>
      )}
    </div>
  );
}
