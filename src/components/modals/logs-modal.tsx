"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  X,
  CheckCircle2,
  Filter,
  MessageSquare,
  Send,
  UserCheck,
  Lock,
  Sparkles,
  ExternalLink,
  Plus,
  Loader2,
} from "lucide-react";
import { Button, Badge, Input } from "@/components/ui/primitives";
import { I18N, Lang } from "@/lib/i18n";
import type { PostRow, CommentLogRow } from "@/lib/db";

interface LogsSummary {
  total_comments: number;
  trigger_matches: number;
  comments_replied: number;
  dms_sent: number;
  pending_count: number;
}

export function LogsModal({
  post,
  lang,
  onClose,
  onLogsUpdated,
}: {
  post: PostRow | null;
  lang: Lang;
  onClose: () => void;
  onLogsUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<CommentLogRow[]>([]);
  const [summary, setSummary] = useState<LogsSummary>({
    total_comments: 0,
    trigger_matches: 0,
    comments_replied: 0,
    dms_sent: 0,
    pending_count: 0,
  });

  // Simulator state
  const [simOpen, setSimOpen] = useState(false);
  const [simUsername, setSimUsername] = useState("mohammad_k99");
  const [simComment, setSimComment] = useState("سلام وقت بخیر، قیمت و لینک رو میفرستید؟");
  const [simFollows, setSimFollows] = useState(true);
  const [simSubmitting, setSimSubmitting] = useState(false);

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const fetchLogs = useCallback(async (shortcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${shortcode}/logs`);
      const data = await res.json();
      setLogs(data.logs || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (post?.shortcode) {
      fetchLogs(post.shortcode);
    }
  }, [post?.shortcode, fetchLogs]);

  if (!post) return null;

  const handleSimulateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simComment.trim()) return;
    setSimSubmitting(true);

    try {
      // Evaluate trigger locally to mimic what Hermes Agent does
      let matched = true;
      if (post.trigger_type === "keywords" && post.trigger_keywords) {
        const kwList = post.trigger_keywords
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean);
        if (kwList.length > 0) {
          matched = kwList.some((k) =>
            simComment.toLowerCase().includes(k)
          );
        }
      }

      let commentReplyStatus: "none" | "sent" = "none";
      let commentReplyText = "";
      if (matched && post.comment_action_type !== "none") {
        commentReplyStatus = "sent";
        commentReplyText =
          post.comment_action_type === "direct"
            ? post.comment_action_text || "پاسخ در دایرکت ارسال شد 📩"
            : `[پاسخ هوشمند AI]: ممنون از نظر شما @${simUsername} عزیز! جزئیات کامل در دایرکت خدمتتان ارسال شد ✨`;
      }

      let dmStatus: "none" | "sent" | "pending_follow" = "none";
      let dmText = "";
      if (matched && post.dm_action_type !== "none") {
        if (post.dm_require_follow === 1 && !simFollows) {
          dmStatus = "pending_follow";
          dmText =
            "کاربر هنوز پیج را فالو نکرده است؛ پیام درخواست فالو ارسال شد و در صف انتظار قرار گرفت.";
        } else {
          dmStatus = "sent";
          dmText =
            post.dm_action_type === "direct"
              ? post.dm_action_text || "سلام! اطلاعات محصول خدمت شما ارسال شد."
              : `[دایرکت هوشمند AI بر اساس کپشن و دستورالعمل]:\nسلام @${simUsername} عزیز 🌹\n${post.dm_action_text || "اطلاعات کامل محصول و شرایط سفارش خدمت شماست."}`;
        }
      }

      await fetch(`/api/posts/${post.shortcode}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: `ig_${Date.now()}`,
          username: simUsername.replace(/^@/, ""),
          comment_text: simComment,
          trigger_matched: matched ? 1 : 0,
          comment_reply_status: commentReplyStatus,
          comment_reply_text: commentReplyText,
          dm_status: dmStatus,
          dm_text: dmText,
        }),
      });

      await fetchLogs(post.shortcode);
      onLogsUpdated();
      setSimOpen(false);
    } finally {
      setSimSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-secondary/30">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-sky-600 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground truncate">
              {t("modalLogsTitle")}
            </h3>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border truncate max-w-[100px] sm:max-w-none shrink-0">
              {post.shortcode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSimOpen(!simOpen)}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t("simulateCommentBtn")}</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Simulator Collapsible Box */}
        {simOpen && (
          <form
            onSubmit={handleSimulateComment}
            className="border-b border-emerald-200 bg-emerald-50/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                شبیه‌ساز ثبت لاگ و قفل کامنت توسط ایجنت هرمس
              </span>
              <span className="text-[11px] text-muted-foreground">
                تست مستقیم قوانین فعلی پست
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  یوزرنیم کامنت‌گذار
                </label>
                <Input
                  type="text"
                  value={simUsername}
                  onChange={(e) => setSimUsername(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="username"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-muted-foreground mb-1">
                  متن کامنت تستی
                </label>
                <Input
                  type="text"
                  value={simComment}
                  onChange={(e) => setSimComment(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="متن کامنت..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={simFollows}
                  onChange={(e) => setSimFollows(e.target.checked)}
                  className="rounded border-border text-emerald-600"
                />
                <span>کاربر پیج را فالو دارد (تست شرط فالو)</span>
              </label>
              <Button type="submit" variant="emerald" size="sm" disabled={simSubmitting}>
                {simSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>اجرای شبیه‌سازی و ثبت لاگ</span>
              </Button>
            </div>
          </form>
        )}

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-border bg-secondary/20">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-lg font-bold font-mono text-foreground">
              {summary.total_comments}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statTotalComments")}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-lg font-bold font-mono text-emerald-700">
              {summary.trigger_matches}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statMatched")}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-lg font-bold font-mono text-sky-700">
              {summary.comments_replied}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statReplies")}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-lg font-bold font-mono text-purple-700">
              {summary.dms_sent}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statDms")}
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-xs">{t("syncing")}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Clock className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">{t("noLogsYet")}</p>
            </div>
          ) : (
            logs.map((log) => {
              const isMatched = log.trigger_matched === 1;
              return (
                <div
                  key={log.comment_id}
                  className="rounded-lg border border-border bg-card p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`https://www.instagram.com/${log.username}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium text-foreground bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-md border border-border transition-colors"
                      >
                        <span>@{log.username}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>

                      <Badge variant={isMatched ? "emerald" : "muted"}>
                        {isMatched ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Filter className="w-3 h-3" />
                        )}
                        <span>
                          {isMatched
                            ? t("logTriggerMatched")
                            : t("logTriggerFiltered")}
                        </span>
                      </Badge>

                      <span
                        title="شناسه قفل یکتا برای جلوگیری از اجرای تکراری (Idempotency Lock)"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border"
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-600" />
                        lock:{log.comment_id}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {log.processed_at || log.created_at}
                    </span>
                  </div>

                  {/* User Comment */}
                  <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2 text-xs text-foreground">
                    <span className="text-muted-foreground font-medium me-1.5">
                      {t("logCommentLabel")}:
                    </span>
                    «{log.comment_text}»
                  </div>

                  {/* Executed Actions */}
                  {(log.comment_reply_status === "sent" ||
                    log.comment_reply_status === "queued" ||
                    log.dm_status === "sent" ||
                    log.dm_status === "queued" ||
                    log.dm_status === "pending_follow") && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {(log.comment_reply_status === "sent" ||
                        log.comment_reply_status === "queued") &&
                        log.comment_reply_text && (
                          <div className="rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{t("logCommentReply")}</span>
                            </div>
                            <p className="text-foreground leading-relaxed whitespace-pre-line">
                              «{log.comment_reply_text}»
                            </p>
                          </div>
                        )}

                      {(log.dm_status === "sent" || log.dm_status === "queued") &&
                        log.dm_text && (
                        <div className="rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700">
                            <Send className="w-3.5 h-3.5" />
                            <span>{t("logDmSent")}</span>
                          </div>
                          <p className="text-foreground leading-relaxed whitespace-pre-line">
                            {log.dm_text}
                          </p>
                        </div>
                      )}

                      {log.dm_status === "pending_follow" && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t("logPendingFollow")}</span>
                          </div>
                          <p className="text-foreground leading-relaxed">
                            {log.dm_text}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
