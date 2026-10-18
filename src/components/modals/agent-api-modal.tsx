"use client";

import React, { useState, useEffect } from "react";
import { Terminal, X, Copy, Check, RefreshCw } from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";

export function AgentApiModal({
  open,
  accountUsername,
  onClose,
}: {
  open: boolean;
  accountUsername: string;
  onClose: () => void;
}) {
  const [pollPreview, setPollPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchLivePoll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/poll?account=${accountUsername}`);
      const data = await res.json();
      setPollPreview(JSON.stringify(data, null, 2));
    } catch (e) {
      setPollPreview(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLivePoll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountUsername]);

  if (!open) return null;

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const curlPoll = `curl -s "${origin}/api/agent/poll?account=${accountUsername}"`;
  const curlLog = `curl -X POST "${origin}/api/posts/DehQhnjoEcr/logs" \\
  -H "Content-Type: application/json" \\
  -d '{
    "comment_id": "1819988776655",
    "username": "customer_ig",
    "comment_text": "قیمت چند؟",
    "trigger_matched": 1,
    "comment_reply_status": "sent",
    "comment_reply_text": "پاسخ در دایرکت ارسال شد 📩",
    "dm_status": "sent",
    "dm_text": "سلام! قیمت محصول ۳۰ هزار دینار است."
  }'`;

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-white/12 bg-[#0c0c0f] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 bg-[#101014]">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              مستندات و خروجی زنده API ویژه ایجنت هرمس (Hermes Worker API)
            </h3>
            <Badge variant="emerald">@{accountUsername}</Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Endpoint 1: Polling */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="emerald">GET</Badge>
                <code className="font-mono text-zinc-200">
                  /api/agent/poll?account={accountUsername}
                </code>
              </div>
              <span className="text-zinc-400">
                فراخوانی هر ۲ دقیقه توسط ایجنت (دریافت پست‌های روشن + قوانین + لیست قفل‌ها)
              </span>
            </div>
            <div
              dir="ltr"
              className="relative rounded-xl bg-black border border-white/10 p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto"
            >
              <button
                type="button"
                onClick={() => copyText(curlPoll, 1)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/8 hover:bg-white/15 text-zinc-300 cursor-pointer"
              >
                {copiedIdx === 1 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <pre>{curlPoll}</pre>
            </div>
          </div>

          {/* Endpoint 2: Lock & Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="sky">POST</Badge>
                <code className="font-mono text-zinc-200">
                  /api/posts/[shortcode]/logs
                </code>
              </div>
              <span className="text-zinc-400">
                ثبت قفل یکتای کامنت (`comment_id`) و ذخیره نتیجه ریپلای و دایرکت
              </span>
            </div>
            <div
              dir="ltr"
              className="relative rounded-xl bg-black border border-white/10 p-3 font-mono text-[11px] text-sky-300 overflow-x-auto"
            >
              <button
                type="button"
                onClick={() => copyText(curlLog, 2)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/8 hover:bg-white/15 text-zinc-300 cursor-pointer"
              >
                {copiedIdx === 2 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <pre>{curlLog}</pre>
            </div>
          </div>

          {/* Live Response Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">
                خروجی زنده فعلی `/api/agent/poll` برای ایجنت:
              </span>
              <Button variant="outline" size="sm" onClick={fetchLivePoll}>
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                <span>بروزرسانی خروجی</span>
              </Button>
            </div>
            <div
              dir="ltr"
              className="rounded-xl bg-[#070709] border border-white/10 p-3.5 font-mono text-[11px] text-zinc-300 max-h-64 overflow-y-auto"
            >
              <pre>{pollPreview}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
