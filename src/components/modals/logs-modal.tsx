"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans text-foreground"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-outline-variant bg-surface-container-high shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/60 px-6 py-4 bg-surface-container/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <MaterialSymbol name="history" size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground truncate">
                {t("modalLogsTitle")}
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                shortcode: {post.shortcode}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="tonal"
              size="sm"
              onClick={() => setSimOpen(!simOpen)}
              className="text-xs h-9 gap-1.5"
            >
              <MaterialSymbol name="add" size={18} className="text-emerald-600" />
              <span>{t("simulateCommentBtn")}</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <MaterialSymbol name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Simulator Collapsible Box */}
        {simOpen && (
          <form
            onSubmit={handleSimulateComment}
            className="border-b border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <MaterialSymbol name="sparkles" size={16} fill={true} />
                <span>شبیه‌ساز ثبت لاگ و قفل کامنت توسط ایجنت هرمس</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                تست مستقیم قوانین فعلی پست
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  یوزرنیم کامنت‌گذار
                </label>
                <Input
                  type="text"
                  value={simUsername}
                  onChange={(e) => setSimUsername(e.target.value)}
                  className="h-9 text-xs font-mono"
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
                  className="h-9 text-xs"
                  placeholder="متن کامنت..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={simFollows}
                  onChange={(e) => setSimFollows(e.target.checked)}
                  className="rounded border-outline-variant text-emerald-600 focus:ring-emerald-500"
                />
                <span>کاربر پیج را فالو دارد (تست شرط فالو)</span>
              </label>
              <Button type="submit" variant="filled" size="sm" disabled={simSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                {simSubmitting ? (
                  <MaterialSymbol name="progress_activity" size={16} className="animate-spin" />
                ) : (
                  <MaterialSymbol name="send" size={16} />
                )}
                <span>اجرای شبیه‌سازی و ثبت لاگ</span>
              </Button>
            </div>
          </form>
        )}

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-outline-variant/60 bg-surface-container-low">
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-3.5 text-center">
            <div className="text-xl font-bold font-mono text-foreground">
              {summary.total_comments}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statTotalComments")}
            </div>
          </div>
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-3.5 text-center">
            <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {summary.trigger_matches}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statMatched")}
            </div>
          </div>
          <div className="rounded-lg border border-outline-variant/60 bg-surface p-3.5 text-center rounded-2xl">
            <div className="text-xl font-bold font-mono text-sky-700 dark:text-sky-400">
              {summary.comments_replied}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statReplies")}
            </div>
          </div>
          <div className="rounded-lg border border-outline-variant/60 bg-surface p-3.5 text-center rounded-2xl">
            <div className="text-xl font-bold font-mono text-purple-700 dark:text-purple-400">
              {summary.dms_sent}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("statDms")}
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <MaterialSymbol name="progress_activity" size={28} className="animate-spin text-primary" />
              <span className="text-xs">{t("syncing")}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <MaterialSymbol name="history" size={36} className="mx-auto opacity-40" />
              <p className="text-xs">{t("noLogsYet")}</p>
            </div>
          ) : (
            logs.map((log) => {
              const isMatched = log.trigger_matched === 1;
              return (
                <div
                  key={log.comment_id}
                  className="rounded-2xl border border-outline-variant/70 bg-surface p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`https://www.instagram.com/${log.username}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-foreground bg-surface-container-high hover:bg-surface-container-highest px-2.5 py-1 rounded-full border border-outline-variant transition-colors"
                      >
                        <span>@{log.username}</span>
                        <MaterialSymbol name="open_in_new" size={14} className="opacity-70" />
                      </a>

                      <Badge
                        variant="outline"
                        className={isMatched ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] gap-1" : "bg-surface-container-high text-muted-foreground border-outline-variant text-[11px] gap-1"}
                      >
                        <MaterialSymbol name={isMatched ? "check_circle" : "filter_alt"} size={14} />
                        <span>
                          {isMatched
                            ? t("logTriggerMatched")
                            : t("logTriggerFiltered")}
                        </span>
                      </Badge>

                      <span
                        title="شناسه قفل یکتا برای جلوگیری از اجرای تکراری (Idempotency Lock)"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/60"
                      >
                        <MaterialSymbol name="lock" size={12} className="text-amber-600" />
                        <span>lock:{log.comment_id}</span>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {log.processed_at || log.created_at}
                    </span>
                  </div>

                  {/* User Comment */}
                  <div className="rounded-xl bg-surface-container-low border border-outline-variant/60 px-3.5 py-2.5 text-xs text-foreground">
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
                          <div className="rounded-xl border border-sky-300/40 bg-sky-50/60 dark:bg-sky-950/30 px-3.5 py-2.5 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                              <MaterialSymbol name="chat" size={16} />
                              <span>{t("logCommentReply")}</span>
                            </div>
                            <p className="text-foreground leading-relaxed whitespace-pre-line">
                              «{log.comment_reply_text}»
                            </p>
                          </div>
                        )}

                      {(log.dm_status === "sent" || log.dm_status === "queued") &&
                        log.dm_text && (
                        <div className="rounded-xl border border-purple-300/40 bg-purple-50/60 dark:bg-purple-950/30 px-3.5 py-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                            <MaterialSymbol name="send" size={16} />
                            <span>{t("logDmSent")}</span>
                          </div>
                          <p className="text-foreground leading-relaxed whitespace-pre-line">
                            {log.dm_text}
                          </p>
                        </div>
                      )}

                      {log.dm_status === "pending_follow" && (
                        <div className="rounded-xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <MaterialSymbol name="person_check" size={16} />
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
