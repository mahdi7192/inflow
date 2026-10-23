"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Globe,
  FileText,
} from "lucide-react";
import { DMAutomationRow } from "@/lib/db";
import { DM_GOALS, DM_TONES } from "@/lib/dm-goals";

interface StepInfo {
  tool: string;
  args: any;
  result?: any;
  ok: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  link?: { url: string; title: string };
  handedOff?: boolean;
  steps?: StepInfo[];
  timestamp: string;
}

interface Props {
  username: string;
  config: DMAutomationRow;
  pagesCount: number;
}

const QUICK_PROMPTS = [
  "سلام، کتاب‌های روانشناسی چی دارین؟",
  "هزینه و شرایط ارسال چطوریه؟",
  "شماره تماسم ۰۹۱۲۳۴۵۶۷۸۹ هست، برای ثبت سفارش راهنمایی کنید.",
  "می‌خوام با پشتیبان انسانی صحبت کنم.",
];

export function DmTestChatPanel({ username, config, pagesCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeTone = DM_TONES.find((t) => t.id === config.tone)?.label || "صمیمی";
  const activeGoal = DM_GOALS.find((g) => g.id === config.primary_goal)?.label || "فروش";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      // Build history for API
      const apiHistory = newHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch(`/api/accounts/${encodeURIComponent(username)}/dm-test-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: apiHistory.slice(0, -1), // prior turns
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در پردازش پاسخ");
      }

      const botMsg: ChatMessage = {
        id: "b_" + Date.now(),
        role: "assistant",
        text: data.replyText || "پاسخی دریافت نشد.",
        link: data.link,
        handedOff: data.handedOff,
        steps: data.steps,
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "err_" + Date.now(),
        role: "assistant",
        text: `⚠️ خطا: ${err.message || "برقراری ارتباط با مدل هوش مصنوعی با خطا مواجه شد."}`,
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSteps = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[700px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] shadow-xs">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">شبیه‌ساز زنده دایرکت</h3>
              <span className="text-[10px] font-mono text-slate-500">@{username}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                آماده پاسخ
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              آزمایش پرامپت‌ها، لحن و استفاده از اطلاعات وب‌سایت در پاسخ به پیام‌های کاربر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition-all cursor-pointer"
              title="پاک کردن سابقه این تست"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاک کردن</span>
            </button>
          )}
        </div>
      </div>

      {/* Context Badge Bar */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">لحن فعال:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{activeTone}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">هدف اصلی:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{activeGoal}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-slate-400">صفحات ایندکس‌شده:</span>
          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
            {pagesCount.toLocaleString("fa-IR")} صفحه (سقف: ۵۰۰)
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">گفتگو را با یک پیام تستی شروع کنید</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                پیامی ارسال کنید تا ببینید دستیار هوشمند چگونه صفحات سایت را جستجو می‌کند، اطلاعات را استخراج کرده و پاسخ می‌دهد.
              </p>
            </div>
            <div className="w-full space-y-1.5 pt-2">
              <div className="text-[11px] font-bold text-slate-400 text-right">پیشنهادهای آماده:</div>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="w-full text-right p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 text-[11px] text-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  💬 {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const hasSteps = !isUser && msg.steps && msg.steps.length > 0;
            const isExpanded = expandedSteps[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${isUser ? "mr-auto flex-row-reverse" : "ml-auto"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs text-xs font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-none shadow-xs"
                        : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-none shadow-2xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Attached link button if generated */}
                    {msg.link && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <a
                          href={msg.link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{msg.link.title || "مشاهده صفحه وب‌سایت"}</span>
                        </a>
                      </div>
                    )}

                    {/* Handoff notice */}
                    {msg.handedOff && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-700 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>مکالمه به اپراتور انسانی ارجاع داده شد.</span>
                      </div>
                    )}
                  </div>

                  {/* Foot metadata */}
                  <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${isUser ? "justify-end" : "justify-start"}`}>
                    <span>{msg.timestamp}</span>

                    {/* Expandable Agent Reasoning steps */}
                    {hasSteps && (
                      <button
                        type="button"
                        onClick={() => toggleSteps(msg.id)}
                        className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-50 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                      >
                        <Search className="w-2.5 h-2.5" />
                        <span>{msg.steps!.length} مرحله تصمیم‌گیری ابزار</span>
                        {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                    )}
                  </div>

                  {/* Tool steps breakdown */}
                  {hasSteps && isExpanded && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ابزارهای استفاده شده توسط ایجنت:</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.steps!.map((st, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-100 font-mono text-[10px] text-slate-600 space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-indigo-600">🛠️ {st.tool}</span>
                              <span className={st.ok ? "text-emerald-600" : "text-rose-600"}>
                                {st.ok ? "موفق" : "ناموفق"}
                              </span>
                            </div>
                            <div className="text-slate-500 overflow-x-auto text-[10px]">
                              <b>ورودی:</b> {JSON.stringify(st.args)}
                            </div>
                            {st.result && (
                              <div className="text-slate-500 overflow-x-auto text-[10px]">
                                <b>خروجی:</b> {JSON.stringify(st.result).slice(0, 300)}
                                {JSON.stringify(st.result).length > 300 ? "…" : ""}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-2.5 max-w-[85%] ml-auto">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs text-xs font-bold animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none px-4 py-2.5 bg-white border border-slate-200/80 text-slate-500 text-xs flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>در حال جستجوی سایت و تحلیل پاسخ هوشمند…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="پیام آزمایشی خود را بنویسید (Enter برای ارسال)..."
            disabled={loading}
            className="flex-1 resize-none rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all max-h-24 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
            title="ارسال پیام"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
