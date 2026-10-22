"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DMAutomationRow, DMLogRow } from "@/lib/db";
import { t, Lang } from "@/lib/i18n";
import { DmLogsTable } from "./dm-logs-table";
import { DmLiveInboxModal } from "./dm-live-inbox-modal";
import {
  Send,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Loader2,
  UserCheck,
  Inbox,
  Film,
  Flame,
  Phone,
  Download,
  PauseCircle,
  PlayCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Trash2,
} from "lucide-react";

interface CapturedLeadItem {
  id: number;
  account_username: string;
  sender_username: string;
  sender_full_name: string;
  sender_id: string;
  phone_number: string;
  source_shortcode: string;
  intent_summary: string;
  last_message: string;
  status: "new" | "contacted" | "converted";
  created_at: string;
  updated_at: string;
}

interface ThreadSummaryItem {
  sender_username: string;
  sender_full_name: string;
  sender_id: string;
  thread_id: string;
  messages_count: number;
  last_incoming: string;
  last_reply: string;
  reply_status: string;
  is_story_reply: boolean;
  read_at: string | null;
  created_at: string;
  source_shortcode: string;
  bot_paused: boolean;
}

export interface DmAutomationViewProps {
  account: string;
  initialAutomation?: DMAutomationRow | null;
  initialLogs?: DMLogRow[];
  embeddedInShell?: boolean;
  lang?: Lang;
}

export function DmAutomationView({
  account,
  initialAutomation = null,
  initialLogs = [],
  lang = "fa",
}: DmAutomationViewProps) {
  const accountUsername = account;
  const [config, setConfig] = useState<DMAutomationRow | null>(initialAutomation);
  const [logs, setLogs] = useState<DMLogRow[]>(initialLogs);
  const [logsStats, setLogsStats] = useState({
    totalReceived: initialLogs.length,
    repliedCount: initialLogs.filter((l) => l.reply_status === "sent").length,
    pendingFollowCount: initialLogs.filter(
      (l) => l.reply_status === "pending_follow"
    ).length,
    skippedCount: initialLogs.filter((l) => l.reply_status === "skipped").length,
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [liveInboxOpen, setLiveInboxOpen] = useState(false);
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);

  // Leads & Active Threads State (Step 2 & 3)
  const [leads, setLeads] = useState<CapturedLeadItem[]>([]);
  const [threads, setThreads] = useState<ThreadSummaryItem[]>([]);
  const [brandCheatSheet, setBrandCheatSheet] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingCheatSheet, setSavingCheatSheet] = useState(false);
  const [cheatSheetSaved, setCheatSheetSaved] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/dm-automation`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.automation) setConfig(data.automation);
      }
    } catch (e) {
      console.error("Failed to load DM config:", e);
    }
  }, [accountUsername]);

  const fetchLeadsAndThreads = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/leads`
      );
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setThreads(data.threads || []);
        if (data.account_context) {
          setBrandCheatSheet(data.account_context.brand_cheat_sheet || "");
          setWebsiteUrl(data.account_context.website_url || "");
        }
      }
    } catch (e) {
      console.error("Failed to load leads & threads:", e);
    }
  }, [accountUsername]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/dm-logs?limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        const loadedLogs: DMLogRow[] = data.logs || [];
        setLogs(loadedLogs);
        if (data.stats) {
          setLogsStats(data.stats);
        } else {
          setLogsStats({
            totalReceived: loadedLogs.length,
            repliedCount: loadedLogs.filter((l) => l.reply_status === "sent").length,
            pendingFollowCount: loadedLogs.filter(
              (l) => l.reply_status === "pending_follow"
            ).length,
            skippedCount: loadedLogs.filter((l) => l.reply_status === "skipped")
              .length,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load DM logs:", e);
    } finally {
      setLogsLoading(false);
    }
  }, [accountUsername]);

  useEffect(() => {
    if (!initialAutomation) {
      fetchConfig();
    }
    fetchLeadsAndThreads();
  }, [initialAutomation, fetchConfig, fetchLeadsAndThreads]);

  const handleSave = async (overrides?: Partial<DMAutomationRow>) => {
    if (!config) return;
    setSaving(true);
    setSaveSuccess(false);
    const updated = { ...config, ...overrides };
    setConfig(updated);

    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/dm-automation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.automation) setConfig(data.automation);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error("Error saving DM config:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBrandCheatSheet = async () => {
    setSavingCheatSheet(true);
    setCheatSheetSaved(false);
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand_cheat_sheet: brandCheatSheet,
            website_url: websiteUrl,
          }),
        }
      );
      if (res.ok) {
        setCheatSheetSaved(true);
        setTimeout(() => setCheatSheetSaved(false), 2500);
      }
    } catch (e) {
      console.error("Error saving brand cheat sheet:", e);
    } finally {
      setSavingCheatSheet(false);
    }
  };

  const handleToggleBotPause = async (
    senderUsername: string,
    currentPaused: boolean
  ) => {
    setTogglingUser(senderUsername);
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "toggle_bot_pause",
            sender_username: senderUsername,
            bot_paused: !currentPaused,
          }),
        }
      );
      if (res.ok) {
        setThreads((prev) =>
          prev.map((th) =>
            th.sender_username.toLowerCase() === senderUsername.toLowerCase()
              ? { ...th, bot_paused: !currentPaused }
              : th
          )
        );
      }
    } catch (e) {
      console.error("Failed to toggle bot pause:", e);
    } finally {
      setTogglingUser(null);
    }
  };

  const handleLeadStatusChange = async (
    leadId: number,
    status: "new" | "contacted" | "converted"
  ) => {
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_lead_status",
            lead_id: leadId,
            status,
          }),
        }
      );
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status } : l))
        );
      }
    } catch (e) {
      console.error("Failed to update lead status:", e);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_lead",
            lead_id: leadId,
          }),
        }
      );
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      }
    } catch (e) {
      console.error("Failed to delete lead:", e);
    }
  };

  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const headers = [
      "Username",
      "FullName",
      "PhoneNumber",
      "SourcePost",
      "Status",
      "LastMessage",
      "UpdatedAt",
    ];
    const rows = leads.map((l) => [
      `@${l.sender_username}`,
      `"${(l.sender_full_name || "").replace(/"/g, '""')}"`,
      l.phone_number,
      l.source_shortcode || "Direct/Story",
      l.status,
      `"${(l.last_message || "").replace(/"/g, '""')}"`,
      l.updated_at,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `inflow-leads-${accountUsername}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">در حال بارگذاری صندوق دایرکت و لیدها...</span>
      </div>
    );
  }

  const isEnabled = config.enabled === 1;
  const pausedCount = threads.filter((t) => t.bot_paused).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Studio Unified Header & Architecture Guide */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900">
                  صندوق دایرکت، ریپلای استوری و لیدهای شکارشده
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  inFlow Studio CRM
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                دایرکت‌های مربوط به هر پست یا ریلز به صورت خودکار از روی{" "}
                <strong className="text-slate-900">«سناریو و تقلب‌نامه همان پست»</strong>{" "}
                ادامه پیدا می‌کنند. در این صفحه می‌توانید{" "}
                <strong className="text-emerald-700">شماره‌های تماس دریافتی</strong> را ببینید،
                ربات را برای چت‌های خاص{" "}
                <strong className="text-amber-700">متوقف کنید (پاسخ ادمین)</strong>، و پاسخگوی{" "}
                <strong className="text-indigo-700">ریپلای استوری‌ها و پیام‌های عمومی</strong> را مدیریت کنید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setLiveInboxOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer"
            >
              <Inbox className="w-4 h-4 text-emerald-400" />
              <span>مشاهده چت‌های زنده دایرکت</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="rounded-xl bg-rose-50/60 border border-rose-200/80 p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-rose-700 font-medium">
                🔥 شماره‌ها و لیدهای شکارشده
              </div>
              <div className="text-xl font-bold tabular-nums text-rose-700 mt-1">
                {leads.length.toLocaleString("fa-IR")}
              </div>
            </div>
            <Phone className="w-5 h-5 text-rose-500" />
          </div>

          <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-800 font-medium">
                ✉️ پاسخ‌های هوشمند ارسالی
              </div>
              <div className="text-xl font-bold tabular-nums text-emerald-700 mt-1">
                {logsStats.repliedCount.toLocaleString("fa-IR")}
              </div>
            </div>
            <Send className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-amber-800 font-medium">
                ⏸️ چت‌های در اختیار ادمین انسانی
              </div>
              <div className="text-xl font-bold tabular-nums text-amber-700 mt-1">
                {pausedCount.toLocaleString("fa-IR")}
              </div>
            </div>
            <PauseCircle className="w-5 h-5 text-amber-600" />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-600 font-medium">
                🔒 منتظر تایید فالو پیج
              </div>
              <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                {logsStats.pendingFollowCount.toLocaleString("fa-IR")}
              </div>
            </div>
            <UserCheck className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* SECTION 1: CAPTURED LEADS & PHONE NUMBERS CRM */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>مشتریان داغ و شماره‌های تماس شکارشده</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 tabular-nums font-bold">
                  {leads.length.toLocaleString("fa-IR")} مورد
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                هر کاربری در دایرکت شماره موبایل بفرستد یا از روی پست درخواست خرید ثبت کند، خودکار اینجا لیست می‌شود.
              </p>
            </div>
          </div>

          {leads.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود اکسل شماره‌ها (CSV)</span>
            </button>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-1.5">
            <Phone className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">
              هنوز شماره تماسی در دایرکت ثبت نشده است
            </div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              وقتی سناریوی «🎯 شکارچی شماره تماس و ثبت سفارش» را روی پست‌های خود فعال کنید، شماره‌های موبایل ارسالی مشتریان به صورت خودکار در این جدول ذخیره می‌شوند.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">مشتری</th>
                  <th className="py-2.5 px-3">شماره تماس / نوع لید</th>
                  <th className="py-2.5 px-3">پست مبدا</th>
                  <th className="py-2.5 px-3">آخرین پیام مشتری</th>
                  <th className="py-2.5 px-3">وضعیت پیگیری</th>
                  <th className="py-2.5 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">
                        <bdi className="font-mono text-indigo-700">@{lead.sender_username}</bdi>
                      </div>
                      {lead.sender_full_name && (
                        <div className="text-[11px] text-slate-500">{lead.sender_full_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        dir="ltr"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold tabular-nums"
                      >
                        <Phone className="w-3 h-3" />
                        {lead.phone_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {lead.source_shortcode ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px]">
                          🎬 <bdi>{lead.source_shortcode}</bdi>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">دایرکت مستقیم</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="truncate text-slate-700" title={lead.last_message}>
                        {lead.last_message}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={lead.status}
                        onChange={(e) =>
                          handleLeadStatusChange(
                            lead.id,
                            e.target.value as "new" | "contacted" | "converted"
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border outline-none cursor-pointer ${
                          lead.status === "converted"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : lead.status === "contacted"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                        }`}
                      >
                        <option value="new">🔥 جدید (منتظر تماس)</option>
                        <option value="contacted">📞 تماس گرفته شد</option>
                        <option value="converted">✅ تبدیل به فروش شد</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: LIVE THREADS & HUMAN TAKEOVER (BOT PAUSE PER USER) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <PauseCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                مکالمات فعال دایرکت و کلید «توقف ربات برای ادمین» (Human Takeover)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                هر زمان خودتان وسط مکالمه با یک مشتری وارد شدید، دکمه «توقف ربات» آن کاربر را بزنید تا هوش مصنوعی وسط حرف شما نپرد.
              </p>
            </div>
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            هنوز مکالمه‌ای در دایرکت ثبت نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {threads.slice(0, 8).map((th) => (
              <div
                key={th.sender_username}
                className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                  th.bot_paused
                    ? "bg-amber-50/50 border-amber-300"
                    : "bg-slate-50/60 border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">
                        <bdi className="font-mono text-indigo-700">@{th.sender_username}</bdi>
                      </span>
                      {th.is_story_reply && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                          📸 ریپلای استوری
                        </span>
                      )}
                      {th.source_shortcode && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                          🎬 پست <bdi className="font-mono">{th.source_shortcode}</bdi>
                        </span>
                      )}
                      {th.read_at && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <CheckCheck className="w-3 h-3" />
                          سین شده
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1.5 line-clamp-1">
                      <span className="text-slate-400">مشتری: </span>
                      {th.last_incoming || "—"}
                    </p>
                    {th.last_reply && (
                      <p className="text-[11px] text-emerald-700 mt-0.5 line-clamp-1">
                        <span className="text-slate-400">پاسخ: </span>
                        {th.last_reply}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={togglingUser === th.sender_username}
                    onClick={() =>
                      handleToggleBotPause(th.sender_username, th.bot_paused)
                    }
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      th.bot_paused
                        ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                    }`}
                  >
                    {togglingUser === th.sender_username ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : th.bot_paused ? (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>ربات متوقف است (فعال‌سازی)</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>توقف ربات (ورود ادمین)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: UNIFIED STORY REPLIES & GENERAL DM AUTOPILOT */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isEnabled
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  پاسخگوی خودکار «ریپلای استوری‌ها» و «دایرکت‌های عمومی»
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isEnabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isEnabled ? "فعال (۲۴/۷)" : "غیرفعال"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                وقتی کاربری بدون کامنت گذاشتن زیر پست، مستقیم استوری شما را ریپلای کند یا در دایرکت سوال کلی بپرسد، از روی «تقلب‌نامه کلی پیج» به او پاسخ داده می‌شود.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave({ enabled: isEnabled ? 0 : 1 })}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {isEnabled ? "🟢 پاسخگوی استوری و عمومی روشن است" : "⚪ روشن کردن پاسخگوی استوری و عمومی"}
          </button>
        </div>

        {/* Direct Connection to Brand Cheat Sheet */}
        <div className="rounded-xl bg-slate-50/80 border border-slate-200/90 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>تقلب‌نامه کلی پیج (منبع پاسخگویی به استوری‌ها و سوالات عمومی دایرکت)</span>
            </div>
            {cheatSheetSaved && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ذخیره شد
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={brandCheatSheet}
            onChange={(e) => setBrandCheatSheet(e.target.value)}
            placeholder="مثال: ارسال به سراسر ایران با تیپاکس (۴۵ هزار تومان) | تحویل تهران ۲۴ ساعته | آدرس سایت: myshop.ir | پشتیبانی تلفنی: ۰۲۱xxxxxxx"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none leading-relaxed"
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] text-slate-500 shrink-0">لینک اصلی سایت/بیو:</span>
              <input
                type="url"
                dir="ltr"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://myshop.ir"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveBrandCheatSheet}
              disabled={savingCheatSheet}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {savingCheatSheet ? "در حال ذخیره..." : "بروزرسانی تقلب‌نامه پیج"}
            </button>
          </div>
        </div>

        {/* Quick Toggles: Story Replies & Follow Gate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200/90 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Film className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  پاسخ خودکار به ریپلای استوری‌ها (Story Replies)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  وقتی مخاطب روی استوری شما ریپلای می‌زند یا قیمت می‌پرسد، با توجه به متن استوری و تقلب‌نامه پاسخ دهد.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleSave({
                  story_handling_mode:
                    config.story_handling_mode === "ignore" ? "auto" : "ignore",
                })
              }
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                config.story_handling_mode !== "ignore"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {config.story_handling_mode !== "ignore" ? "فعال ✓" : "غیرفعال"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/90 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  قفل فالو در دایرکت عمومی
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  قبل از پاسخ کامل در دایرکت، بررسی کند که کاربر حتماً پیج را فالو داشته باشد.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleSave({
                  require_follow: config.require_follow === 1 ? 0 : 1,
                })
              }
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                config.require_follow === 1
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {config.require_follow === 1 ? "قفل فالو روشن 🔒" : "آزاد (بدون قفل)"}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced AI Instructions for General DM */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvancedRules((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {showAdvancedRules ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>تنظیمات پیشرفته دستورالعمل هوش مصنوعی و فیلتر کلمات کلیدی دایرکت</span>
          </button>

          {showAdvancedRules && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  دستورالعمل لحن و رفتار دستیار در دایرکت عمومی:
                </label>
                <textarea
                  rows={3}
                  value={config.ai_prompt_instructions || ""}
                  onChange={(e) =>
                    setConfig({ ...config, ai_prompt_instructions: e.target.value })
                  }
                  placeholder="مثال: با لحن صمیمی و کوتاه پاسخ بده و اگر مشتری قصد خرید داشت شماره تماس یا سایز مورد نظرش را بپرس."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 font-bold">
                    ✓ ذخیره شد
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  {saving ? "در حال ذخیره..." : t("dmSaveConfigBtn", undefined, lang)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: FULL DM LOGS TABLE */}
      <DmLogsTable
        logs={logs}
        onRefresh={() => {
          fetchLogs();
          fetchLeadsAndThreads();
        }}
        loading={logsLoading}
        lang={lang}
      />

      {/* Live Inbox Modal */}
      <DmLiveInboxModal
        isOpen={liveInboxOpen}
        onClose={() => setLiveInboxOpen(false)}
        account={accountUsername}
      />
    </div>
  );
}

export const DMAutomationView = DmAutomationView;
