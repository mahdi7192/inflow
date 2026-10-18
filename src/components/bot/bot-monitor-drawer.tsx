"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  X,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { I18N, Lang, isRTL } from "@/lib/i18n";
import { BotStatus } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BotLogItem {
  id: string | number;
  category?: string;
  title?: string;
  description?: string;
  badge?: {
    text: string;
    variant: "default" | "success" | "warning" | "destructive" | "secondary";
  };
  metadata?: Record<string, any>;
  from_status?: string | null;
  to_status?: string;
  message?: string;
  actor?: string;
  created_at: string;
}

function formatLogTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    let normalized = dateStr.trim();
    if (!normalized.includes("T")) {
      normalized = normalized.replace(" ", "T");
    }
    if (!normalized.endsWith("Z") && !normalized.includes("+") && !normalized.includes("-", 10)) {
      normalized = `${normalized}Z`;
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

interface BotMonitorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  botStatus: BotStatus;
  lang: Lang;
  onOpenVnc: () => void;
  isVncLoading?: boolean;
  onStatusChange: (status: BotStatus) => void;
  agentStatus?: {
    is_online: boolean;
    sse_connected: boolean;
  } | null;
}

export function BotMonitorDrawer({
  isOpen,
  onClose,
  account,
  botStatus,
  lang,
  onOpenVnc,
  isVncLoading = false,
  onStatusChange,
  agentStatus,
}: BotMonitorDrawerProps) {
  const [profileName, setProfileName] = useState<string>(`inflow_${account}`);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [logs, setLogs] = useState<BotLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const rtl = isRTL(lang);
  const t = I18N[lang];

  const fetchBotDetails = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bot/status?account=${encodeURIComponent(account)}`);
      const data = await res.json();
      if (data.success) {
        if (data.bot_profile_name) setProfileName(data.bot_profile_name);
        setLastHeartbeat(data.last_heartbeat_at);
        if (data.logs) setLogs(data.logs);
        if (data.bot_status && data.bot_status !== botStatus) {
          onStatusChange(data.bot_status);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [account, botStatus, onStatusChange]);

  useEffect(() => {
    if (isOpen) {
      fetchBotDetails();
    }
  }, [isOpen, fetchBotDetails]);

  const handleStateAction = async (action: "pause" | "resume" | "retry") => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, action }),
      });
      const data = await res.json();
      if (data.success && data.status) {
        onStatusChange(data.status);
        fetchBotDetails();
      }
    } catch (err: unknown) {
      alert("خطا در تغییر وضعیت: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = () => {
    switch (botStatus) {
      case "live":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{t.botStatusLive}</Badge>;
      case "login_required":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">{t.botStatusLoginRequired}</Badge>;
      case "provisioning":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{t.botStatusProvisioning}</Badge>;
      case "checkpoint_required":
        return <Badge className="bg-red-100 text-red-800 border-red-200">{t.botStatusCheckpointRequired}</Badge>;
      case "paused":
        return <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200">{t.botStatusPaused}</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-200">{t.botStatusError}</Badge>;
      default:
        return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">{t.botStatusUnprovisioned}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-md bg-card border-s border-border h-full shadow-2xl flex flex-col transition-all overflow-hidden"
        dir={rtl ? "rtl" : "ltr"}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{t.botDrawerTitle}</h3>
              <p className="text-xs text-muted-foreground font-mono">@{account}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Status & Telemetry Card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t.botDrawerStatusLabel}</span>
              {getStatusBadge()}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2.5">
              <span className="text-xs text-muted-foreground">{t.botDrawerProfileLabel}</span>
              <span className="text-xs font-mono font-medium text-foreground">{profileName}</span>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2.5">
              <span className="text-xs text-muted-foreground">{t.botDrawerHeartbeatLabel}</span>
              <span className="text-xs text-foreground font-mono">
                {lastHeartbeat || "هنوز ثبت نشده"}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2.5 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>محیط ابری ایزوله (Bot Screen)</span>
              </div>
              <span className="text-[11px] font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Display :20
              </span>
            </div>

            {agentStatus && (
              <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2.5">
                <span className="text-xs text-muted-foreground">اتصال هوش مصنوعی (MCP)</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                  agentStatus.is_online
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    agentStatus.is_online ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                  )} />
                  <span>{agentStatus.is_online ? (agentStatus.sse_connected ? "آنلاین (SSE فعال)" : "متصل") : "آفلاین"}</span>
                </span>
              </div>
            )}
          </div>

          {/* Login Required Notice */}
          {botStatus === "login_required" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>نیاز به ورود مجدد به حساب</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                نشست اینستاگرام شما منقضی شده است. دکمه «مشاهده دسکتاپ مجازی» زیر را بزنید و در صفحه بازشده وارد اکانت شوید.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">عملیات ربات</h4>

            <Button
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white justify-center h-10 text-xs font-medium"
              onClick={onOpenVnc}
              disabled={isVncLoading}
            >
              {isVncLoading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Monitor className="w-4 h-4 me-2" />
              )}
              {isVncLoading ? "در حال اتصال به دسکتاپ..." : t.botDrawerOpenVncBtn}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {botStatus === "live" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleStateAction("pause")}
                  disabled={loading}
                >
                  <Pause className="w-3.5 h-3.5 me-1.5" />
                  {t.botDrawerPauseBtn}
                </Button>
              ) : botStatus === "paused" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-emerald-700 border-emerald-200 bg-emerald-50"
                  onClick={() => handleStateAction("resume")}
                  disabled={loading}
                >
                  <Play className="w-3.5 h-3.5 me-1.5" />
                  {t.botDrawerResumeBtn}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleStateAction("retry")}
                  disabled={loading}
                >
                  <RefreshCw className="w-3.5 h-3.5 me-1.5" />
                  راه‌اندازی مجدد
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={fetchBotDetails}
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${loading ? "animate-spin" : ""}`} />
                {t.botDrawerRefreshBtn}
              </Button>
            </div>
          </div>

          {/* Lifecycle Event History */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t.botDrawerLogsTitle}
              </h4>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {logs.length} رویداد
              </Badge>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                {t.botDrawerNoLogs}
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const title = log.title || log.to_status || "رویداد سیستم";
                  const desc = log.description || log.message || "";
                  const badgeText = log.badge?.text || log.to_status || "سیستم";
                  const badgeVariant = (log.badge?.variant as any) || "secondary";

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs space-y-1.5 transition-all hover:bg-zinc-100/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="font-semibold text-foreground truncate">{title}</span>
                          <Badge variant={badgeVariant} className="text-[9px] py-0 px-1.5 shrink-0">
                            {badgeText}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0" dir="ltr">
                          {formatLogTime(log.created_at)}
                        </span>
                      </div>
                      {desc && (
                        <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-line">
                          {desc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-zinc-50 text-center">
          <p className="text-[11px] text-muted-foreground">
            اتصال خودکار مانیتورینگ از طریق گارد امنیتی VNC کنترل می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
}
