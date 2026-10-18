"use client";

import React from "react";
import { Bot, AlertTriangle, Loader2 } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { BotStatus } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface BotToolbarButtonProps {
  account: string;
  botStatus: BotStatus;
  lang: Lang;
  onClick: () => void;
}

export function BotToolbarButton({
  account,
  botStatus,
  lang,
  onClick,
}: BotToolbarButtonProps) {
  const t = I18N[lang];

  const getStatusDisplay = () => {
    switch (botStatus) {
      case "live":
        return {
          label: t.botStatusLive,
          badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dotClass: "bg-emerald-500 animate-pulse",
          icon: <Bot className="w-4 h-4 text-emerald-700" />,
        };
      case "login_required":
        return {
          label: t.botStatusLoginRequired,
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
          icon: <Bot className="w-4 h-4 text-amber-700" />,
        };
      case "provisioning":
        return {
          label: t.botStatusProvisioning,
          badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
          dotClass: "bg-blue-500",
          icon: <Loader2 className="w-4 h-4 animate-spin text-blue-700" />,
        };
      case "checkpoint_required":
        return {
          label: t.botStatusCheckpointRequired,
          badgeClass: "bg-red-50 text-red-800 border-red-200 animate-bounce",
          dotClass: "bg-red-500",
          icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        };
      case "paused":
        return {
          label: t.botStatusPaused,
          badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
          dotClass: "bg-zinc-400",
          icon: <Bot className="w-4 h-4 text-zinc-600" />,
        };
      case "error":
        return {
          label: t.botStatusError,
          badgeClass: "bg-red-50 text-red-700 border-red-200",
          dotClass: "bg-red-500",
          icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        };
      default:
        return {
          label: t.botStatusUnprovisioned,
          badgeClass: "bg-zinc-50 text-zinc-600 border-zinc-200",
          dotClass: "bg-zinc-300",
          icon: <Bot className="w-4 h-4 text-zinc-500" />,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <Button
      variant="outline"
      size="sm"
      className={`h-9 px-2.5 sm:px-3 text-xs font-medium border flex items-center gap-2 hover:bg-zinc-50 transition-all ${statusInfo.badgeClass}`}
      onClick={onClick}
      title={`ربات اختصاصی @${account}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${statusInfo.dotClass}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotClass}`} />
      </span>

      {statusInfo.icon}

      <span className="hidden md:inline font-medium">{t.botToolbarTitle}</span>
      <span className="text-[11px] opacity-90 hidden sm:inline">({statusInfo.label})</span>
    </Button>
  );
}
