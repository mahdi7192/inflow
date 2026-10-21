"use client";

import React from "react";
import { MessageSquare, RotateCw, Sparkles, User, Video, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { DMLogRow } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { I18N, Lang } from "@/lib/i18n";

interface DmLogsTableProps {
  logs: DMLogRow[];
  onRefresh: () => void;
  loading?: boolean;
  lang?: Lang;
}

export function DmLogsTable({
  logs,
  onRefresh,
  loading = false,
  lang = "fa",
}: DmLogsTableProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>ارسال شد</span>
          </Badge>
        );
      case "queued":
        return (
          <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>در صف ارسال</span>
          </Badge>
        );
      case "pending_follow":
        return (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>در انتظار فالو</span>
          </Badge>
        );
      case "skipped":
        return (
          <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-600 border-zinc-200">
            رد شده (Skipped)
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 gap-1">
            <ShieldAlert className="w-2.5 h-2.5" />
            <span>خطا</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-600">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">
            {t("dmLogsTitle")}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            آخرین پیام‌های دریافتی از مشتریان و وضعیت پاسخ‌دهی خودکار ربات.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={onRefresh}
          className="text-xs gap-1.5 cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>بروزرسانی لاگ‌ها</span>
        </Button>
      </div>

      {logs.length > 0 ? (
        <div className="border border-border/80 rounded-lg overflow-hidden divide-y divide-border/60">
          {logs.map((log) => (
            <div key={log.id} className="p-3.5 space-y-2 hover:bg-secondary/20 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    @{log.sender_username || "کاربر"}
                  </span>

                  {log.is_story_reply === 1 && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-1">
                      <Video className="w-2.5 h-2.5" />
                      <span>{t("dmStoryReplyBadge")}</span>
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {renderStatusBadge(log.reply_status)}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {log.processed_at?.slice(11, 16) || ""}
                  </span>
                </div>
              </div>

              {/* Story Content Context if applicable */}
              {log.is_story_reply === 1 && log.story_content && (
                <div className="p-2 rounded bg-purple-50/50 border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                  <span className="font-semibold block mb-0.5">محتوای استوری مربوطه:</span>
                  <span>{log.story_content}</span>
                </div>
              )}

              {/* Message & Reply Exchange */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-md bg-secondary/40 border border-border/60 space-y-0.5">
                  <span className="text-[10.5px] font-medium text-muted-foreground block">پیام کاربر:</span>
                  <p className="text-foreground leading-relaxed break-words">
                    {log.incoming_text || "---"}
                  </p>
                </div>

                <div className="p-2 rounded-md bg-secondary/70 border border-border/60 space-y-0.5">
                  <span className="text-[10.5px] font-medium text-muted-foreground block">پاسخ ارسال‌شده:</span>
                  <p className="text-foreground leading-relaxed break-words">
                    {log.reply_text || (log.reply_status === "skipped" ? "پیام با شرط تریگر تطبیق نداشت و اسکیپ شد." : "---")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg bg-secondary/10">
          {t("dmNoLogs")}
        </p>
      )}
    </div>
  );
}
