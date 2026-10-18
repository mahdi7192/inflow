"use client";

import React from "react";
import { Bot } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { BotStatus } from "@/lib/db";
import { cn } from "@/lib/utils";

interface BotToolbarButtonProps {
  account: string;
  botStatus: BotStatus;
  lang: Lang;
  onClick: () => void;
  statusMessage?: string | null;
}

export function BotToolbarButton({
  account,
  botStatus,
  lang,
  onClick,
  statusMessage,
}: BotToolbarButtonProps) {
  const t = I18N[lang];

  const getStatusDisplay = () => {
    switch (botStatus) {
      case "live":
        return {
          label: t.botStatusLive,
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60",
          dotClass: "bg-emerald-500 animate-pulse",
        };
      case "login_required":
        return {
          label: statusMessage || t.botStatusLoginRequired,
          badgeClass: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/60",
          dotClass: "bg-amber-500",
        };
      case "provisioning":
        return {
          label: t.botStatusProvisioning,
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/60",
          dotClass: "bg-blue-500 animate-pulse",
        };
      case "checkpoint_required":
        return {
          label: statusMessage || t.botStatusCheckpointRequired,
          badgeClass: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/60",
          dotClass: "bg-rose-500 animate-ping",
        };
      case "error":
        return {
          label: statusMessage || t.botStatusError,
          badgeClass: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/60",
          dotClass: "bg-rose-500",
        };
      case "paused":
        return {
          label: t.botStatusPaused,
          badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200/60",
          dotClass: "bg-zinc-400",
        };
      default:
        return {
          label: t.botStatusUnprovisioned,
          badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200/60",
          dotClass: "bg-zinc-300",
        };
    }
  };

  const statusInfo = getStatusDisplay();
  const tooltipText = `${t.botToolbarTitle}: ${statusInfo.label} (@${account})`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltipText}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring shrink-0",
        statusInfo.badgeClass
      )}
    >
      <Bot className="w-3.5 h-3.5 shrink-0 opacity-85" />
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusInfo.dotClass)} />
      <span className="whitespace-nowrap">{t.botToolbarTitle}: {statusInfo.label}</span>
    </button>
  );
}
