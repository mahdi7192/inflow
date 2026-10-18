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
import { Button, Badge } from "@/components/ui/primitives";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-white/12 bg-[#0c0c0f] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 bg-[#101014]">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              {t("modalLogsTitle")}
            </h3>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/6 text-zinc-300 border border-white/10">
              {post.shortcode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSimOpen(!simOpen)}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t("simulateCommentBtn")}</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Simulator Collapsible Box */}
        {simOpen && (
          <form
            onSubmit={handleSimulateComment}
            className="border-b border-emerald-500/25 bg-emerald-950/15 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                شبیه‌ساز ثبت لاگ و قفل کامنت توسط ایجنت هرمس
              </span>
              <span className="text-[11px] text-zinc-400">
                تست مستقیم قوانین فعلی پست
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  یوزرنیم کامنت‌گذار
                </label>
                <input
                  type="text"
                  value={simUsername}
                  onChange={(e) => setSimUsername(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-black/60 border border-white/12 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="username"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  متن کامنت تستی
                </label>
                <input
                  type="text"
                  value={simComment}
                  onChange={(e) => setSimComment(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-black/60 border border-white/12 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="متن کامنت..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simFollows}
                  onChange={(e) => setSimFollows(e.target.checked)}
                  className="rounded border-white/20 bg-black text-emerald-500"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-white/8 bg-[#09090c]">
          <div className="rounded-xl border border-white/8 bg-[#121216] p-3 text-center">
            <div className="text-lg font-bold font-mono text-zinc-100">
              {summary.total_comments}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {t("statTotalComments")}
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#121216] p-3 text-center">
            <div className="text-lg font-bold font-mono text-emerald-400">
              {summary.trigger_matches}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {t("statMatched")}
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#121216] p-3 text-center">
            <div className="text-lg font-bold font-mono text-sky-400">
              {summary.comments_replied}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {t("statReplies")}
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#121216] p-3 text-center">
            <div className="text-lg font-bold font-mono text-purple-400">
              {summary.dms_sent}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {t("statDms")}
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              <span className="text-xs">{t("syncing")}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">{t("noLogsYet")}</p>
            </div>
          ) : (
            logs.map((log) => {
              const isMatched = log.trigger_matched === 1;
              return (
                <div
                  key={log.comment_id}
                  className="rounded-xl border border-white/10 bg-[#121216] p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`https://www.instagram.com/${log.username}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium text-zinc-200 bg-white/6 hover:bg-white/12 px-2 py-0.5 rounded-md border border-white/10 transition-colors"
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
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-white/6"
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        lock:{log.comment_id}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {log.processed_at || log.created_at}
                    </span>
                  </div>

                  {/* User Comment */}
                  <div className="rounded-lg bg-black/40 border border-white/6 px-3 py-2 text-xs text-zinc-200">
                    <span className="text-zinc-400 font-medium me-1.5">
                      {t("logCommentLabel")}:
                    </span>
                    «{log.comment_text}»
                  </div>

                  {/* Executed Actions */}
                  {(log.comment_reply_status === "sent" ||
                    log.dm_status === "sent" ||
                    log.dm_status === "pending_follow") && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {log.comment_reply_status === "sent" &&
                        log.comment_reply_text && (
                          <div className="rounded-lg border border-sky-500/25 bg-sky-500/8 px-3 py-2 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{t("logCommentReply")}</span>
                            </div>
                            <p className="text-zinc-200 leading-relaxed whitespace-pre-line">
                              «{log.comment_reply_text}»
                            </p>
                          </div>
                        )}

                      {log.dm_status === "sent" && log.dm_text && (
                        <div className="rounded-lg border border-purple-500/25 bg-purple-500/8 px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400">
                            <Send className="w-3.5 h-3.5" />
                            <span>{t("logDmSent")}</span>
                          </div>
                          <p className="text-zinc-200 leading-relaxed whitespace-pre-line">
                            {log.dm_text}
                          </p>
                        </div>
                      )}

                      {log.dm_status === "pending_follow" && (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t("logPendingFollow")}</span>
                          </div>
                          <p className="text-zinc-300 leading-relaxed">
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
