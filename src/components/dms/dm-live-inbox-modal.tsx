"use client";

import React, { useState, useEffect } from "react";
import {
  Inbox,
  Send,
  RotateCw,
  X,
  User,
  AlertCircle,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

interface MessageItem {
  id: string;
  text: string;
  user_id: string;
  is_me: boolean;
}

interface ThreadItem {
  id: string;
  title: string;
  users: Array<{ pk: string; username: string; full_name?: string }>;
  last_message: string;
  messages: MessageItem[];
}

interface DmLiveInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
}

export function DmLiveInboxModal({
  isOpen,
  onClose,
  account,
}: DmLiveInboxModalProps) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${account}/inbox`);
      const data = await res.json();
      if (data.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
        if (data.threads.length > 0 && !selectedThread) {
          setSelectedThread(data.threads[0]);
        } else if (selectedThread) {
          const updated = data.threads.find(
            (t: ThreadItem) => t.id === selectedThread.id
          );
          if (updated) setSelectedThread(updated);
        }
      } else {
        setError(data.error || "خطا در دریافت پیام‌های دایرکت");
      }
    } catch {
      setError("خطا در برقراری ارتباط با موتور دایرکت");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInbox();
    }
  }, [isOpen, account]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim() || sending) return;

    const targetUser =
      selectedThread.users.find((u) => u.username !== account)?.username ||
      selectedThread.users[0]?.username;

    if (!targetUser) return;

    setSending(true);
    try {
      const res = await fetch(`/api/accounts/${account}/inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedThread.id,
          target: targetUser,
          text: replyText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("پیام با موفقیت ارسال شد");
        setReplyText("");
        // Append sent message to local view
        setSelectedThread((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: data.message_id || String(Date.now()),
                text: replyText.trim(),
                user_id: "me",
                is_me: true,
              },
            ],
          };
        });
      } else {
        toast.error(data.error || "خطا در ارسال پیام");
      }
    } catch {
      toast.error("خطای شبکه هنگام ارسال پیام");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-vazir" dir="rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl h-[82vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 border-b border-border flex items-center justify-between shrink-0 bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <Inbox className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              صندوق زنده پیام‌های دایرکت
            </h3>
            <Badge variant="outline" className="font-mono text-[11px] px-2">
              <bdi>@{account}</bdi>
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={fetchInbox}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">بروزرسانی</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body: Split View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Threads Column */}
          <div className="w-full sm:w-72 md:w-80 border-e border-border flex flex-col bg-background shrink-0">
            <div className="p-2.5 border-b border-border/70 text-[11px] font-semibold text-muted-foreground">
              گفتگوهای اخیر ({threads.length})
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {loading && threads.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>در حال دریافت پیام‌ها از اینستاگرام...</span>
                </div>
              ) : threads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  گفتگویی یافت نشد.
                </div>
              ) : (
                threads.map((thread) => {
                  const isSelected = selectedThread?.id === thread.id;
                  const otherUser =
                    thread.users.find((u) => u.username !== account) ||
                    thread.users[0];
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full p-3 text-start transition-colors flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-secondary text-foreground"
                          : "hover:bg-secondary/40 text-muted-foreground"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-200 border border-border flex items-center justify-center shrink-0 font-bold text-xs text-foreground">
                        {otherUser?.username?.slice(0, 1).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground truncate">
                            {otherUser?.full_name || otherUser?.username || thread.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {thread.last_message || "پیام چندرسانه‌ای"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Conversation Column */}
          <div className="hidden sm:flex flex-1 flex-col bg-zinc-50/50 min-w-0">
            {selectedThread ? (
              <>
                {/* Chat Topbar */}
                <div className="h-12 px-4 border-b border-border bg-card/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground font-mono">
                      <bdi>
                        @
                        {selectedThread.users.find((u) => u.username !== account)
                          ?.username || selectedThread.title}
                      </bdi>
                    </span>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-2.5 flex flex-col justify-end">
                  {selectedThread.messages.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground my-auto">
                      پیامی در این گفتگو ثبت نشده است.
                    </div>
                  ) : (
                    selectedThread.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.is_me ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            m.is_me
                              ? "bg-primary text-primary-foreground rounded-br-xs"
                              : "bg-card border border-border text-foreground rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0"
                >
                  <Input
                    placeholder="نوشتن پیام مستقیم..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                    className="text-xs flex-1 h-9"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={sending || !replyText.trim()}
                    className="h-9 px-3 gap-1.5 cursor-pointer"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>ارسال</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                <Inbox className="w-8 h-8 stroke-1" />
                <span>یک گفتگو را از لیست سمت راست انتخاب کنید.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
