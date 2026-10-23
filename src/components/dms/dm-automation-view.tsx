"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DMAutomationRow, DMLogRow } from "@/lib/db";
import { Lang, formatNumber as formatNumberI18n } from "@/lib/i18n";
import { useWorkspace } from "@/components/layout/workspace-context";
import {
  Send,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Loader2,
  UserCheck,
  Flame,
  Phone,
  Download,
  PauseCircle,
  PlayCircle,
  BookOpen,
  CheckCheck,
  Trash2,
  Search,
  RefreshCw,
  Copy,
  Check,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DmSettingsPanel } from "@/components/dms/dm-settings-panel";
import { DmTestChatPanel } from "@/components/dms/dm-test-chat-panel";
import { cn } from "@/lib/utils";

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

type StudioDmTab = "inbox" | "leads" | "settings" | "test";
type InboxFilter = "all" | "story" | "paused";

export function DmAutomationView({
  account,
  initialAutomation = null,
  initialLogs = [],
  lang: langProp = "fa",
}: DmAutomationViewProps) {
  const workspace = useWorkspace();
  const formatNumber = (val: number | string | undefined | null) =>
    workspace ? workspace.formatNumber(val) : formatNumberI18n(val, langProp);
  const accountUsername = account;
  const [activeTab, setActiveTab] = useState<StudioDmTab>("inbox");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [config, setConfig] = useState<DMAutomationRow | null>(initialAutomation);
  const [logs, setLogs] = useState<DMLogRow[]>(initialLogs);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Leads & Active Threads State
  const [leads, setLeads] = useState<CapturedLeadItem[]>([]);
  const [threads, setThreads] = useState<ThreadSummaryItem[]>([]);
  const [brandCheatSheet, setBrandCheatSheet] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingCheatSheet, setSavingCheatSheet] = useState(false);
  const [cheatSheetSaved, setCheatSheetSaved] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Manual Direct Reply State
  const [manualReplyText, setManualReplyText] = useState("");
  const [sendingManual, setSendingManual] = useState(false);
  const [manualNotice, setManualNotice] = useState<string | null>(null);

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
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/dm-logs?limit=100`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load DM logs:", e);
    }
  }, [accountUsername]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchLogs(), fetchLeadsAndThreads()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!initialAutomation) {
      fetchConfig();
    }
    fetchLeadsAndThreads();
  }, [initialAutomation, fetchConfig, fetchLeadsAndThreads]);

  // Build unified conversation list from logs + threads metadata
  const conversationList = useMemo(() => {
    const map = new Map<
      string,
      {
        sender_username: string;
        sender_full_name: string;
        thread_id: string;
        last_incoming: string;
        last_reply: string;
        reply_status: string;
        is_story_reply: boolean;
        read_at: string | null;
        created_at: string;
        source_shortcode: string;
        bot_paused: boolean;
        messages: DMLogRow[];
      }
    >();

    // Seed with threads metadata from /leads API
    for (const th of threads) {
      const key = th.sender_username.toLowerCase();
      map.set(key, {
        sender_username: th.sender_username,
        sender_full_name: th.sender_full_name || "",
        thread_id: th.thread_id || "",
        last_incoming: th.last_incoming || "",
        last_reply: th.last_reply || "",
        reply_status: th.reply_status || "",
        is_story_reply: Boolean(th.is_story_reply),
        read_at: th.read_at || null,
        created_at: th.created_at || "",
        source_shortcode: th.source_shortcode || "",
        bot_paused: Boolean(th.bot_paused),
        messages: [],
      });
    }

    // Group all logs into their conversation
    for (const log of logs) {
      const username = log.sender_username || "unknown";
      const key = username.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          sender_username: username,
          sender_full_name: log.sender_full_name || "",
          thread_id: log.thread_id || "",
          last_incoming: log.incoming_text || "",
          last_reply: log.reply_text || "",
          reply_status: log.reply_status || "",
          is_story_reply: log.is_story_reply === 1,
          read_at: log.read_at || null,
          created_at: log.created_at || "",
          source_shortcode: "",
          bot_paused: false,
          messages: [log],
        });
      } else {
        existing.messages.push(log);
        if (!existing.thread_id && log.thread_id) existing.thread_id = log.thread_id;
        if (log.is_story_reply === 1) existing.is_story_reply = true;
      }
    }

    const list = Array.from(map.values()).map((conv) => {
      conv.messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return conv;
    });

    return list;
  }, [threads, logs]);

  // Filter conversations by search & pill filter
  const filteredConversations = useMemo(() => {
    return conversationList.filter((c) => {
      if (inboxFilter === "story" && !c.is_story_reply) return false;
      if (inboxFilter === "paused" && !c.bot_paused) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.sender_username.toLowerCase().includes(q) ||
          c.sender_full_name.toLowerCase().includes(q) ||
          c.last_incoming.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conversationList, inboxFilter, searchQuery]);

  // Auto-select first conversation when available
  useEffect(() => {
    if (
      !selectedSender &&
      filteredConversations.length > 0 &&
      filteredConversations[0]
    ) {
      setSelectedSender(filteredConversations[0].sender_username);
    }
  }, [filteredConversations, selectedSender]);

  const activeConversation = useMemo(() => {
    if (!selectedSender) return filteredConversations[0] || null;
    return (
      conversationList.find(
        (c) => c.sender_username.toLowerCase() === selectedSender.toLowerCase()
      ) ||
      filteredConversations[0] ||
      null
    );
  }, [conversationList, filteredConversations, selectedSender]);

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
        setThreads((prev) => {
          const exists = prev.some(
            (th) =>
              th.sender_username.toLowerCase() === senderUsername.toLowerCase()
          );
          if (!exists) {
            return [
              ...prev,
              {
                sender_username: senderUsername,
                sender_full_name: "",
                sender_id: "",
                thread_id: "",
                messages_count: 1,
                last_incoming: "",
                last_reply: "",
                reply_status: "",
                is_story_reply: false,
                read_at: null,
                created_at: new Date().toISOString(),
                source_shortcode: "",
                bot_paused: !currentPaused,
              },
            ];
          }
          return prev.map((th) =>
            th.sender_username.toLowerCase() === senderUsername.toLowerCase()
              ? { ...th, bot_paused: !currentPaused }
              : th
          );
        });
      }
    } catch (e) {
      console.error("Failed to toggle bot pause:", e);
    } finally {
      setTogglingUser(null);
    }
  };

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !manualReplyText.trim() || sendingManual) return;

    setSendingManual(true);
    setManualNotice(null);
    const textToSend = manualReplyText.trim();
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(accountUsername)}/inbox`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConversation.thread_id || undefined,
            target: activeConversation.sender_username,
            text: textToSend,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setManualReplyText("");
        // Automatically pause bot for this user when human admin steps in
        if (!activeConversation.bot_paused) {
          await handleToggleBotPause(activeConversation.sender_username, false);
        }
        setManualNotice("پیام شما ارسال شد و ربات برای این کاربر متوقف گردید.");
        setTimeout(() => setManualNotice(null), 4000);
        await fetchLogs();
      } else {
        setManualNotice(data.error || "ارسال پیام نیازمند نشست فعال اینستاگرام است.");
      }
    } catch {
      setManualNotice("خطا در ارتباط با سرور هنگام ارسال پیام.");
    } finally {
      setSendingManual(false);
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

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
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
        <span className="text-sm">در حال بارگذاری صندوق دایرکت...</span>
      </div>
    );
  }

  const isEnabled = config.enabled === 1;
  const pausedCount = conversationList.filter((c) => c.bot_paused).length;

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Unified Studio Header & Segmented Switcher (Single Flat Bar — No Nested Cards) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <span>صندوق دایرکت، استوری و مشتریان</span>
            {pausedCount > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 tabular-nums">
                {formatNumber(pausedCount)} چت در دست ادمین
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مکالمات پست‌ها به صورت خودکار ادامه می‌یابند. در اینجا گفتگوها را ببینید، ربات را برای هر کاربر متوقف کنید یا شماره‌های تماس را بردارید.
          </p>
        </div>

        {/* Material 3 Segmented Filter Chips */}
        <div className="inline-flex items-center gap-1.5 bg-surface-container-high p-1.5 rounded-full max-w-full overflow-x-auto self-start lg:self-auto shrink-0 border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setActiveTab("inbox")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
              activeTab === "inbox"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>گفتگوهای دایرکت</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[11px] tabular-nums font-bold",
              activeTab === "inbox" ? "bg-white/20 text-white" : "bg-surface-container text-on-surface-variant"
            )}>
              {formatNumber(conversationList.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
              activeTab === "leads"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>شماره‌های شکارشده</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] tabular-nums font-bold",
                activeTab === "leads"
                  ? "bg-white/20 text-white"
                  : leads.length > 0
                  ? "bg-rose-100 text-rose-700"
                  : "bg-surface-container text-on-surface-variant"
              )}
            >
              {formatNumber(leads.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
              activeTab === "settings"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>تنظیمات دایرکت مستقیم</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isEnabled ? "bg-emerald-400" : "bg-outline"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("test")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
              activeTab === "test"
                ? "bg-secondary text-on-secondary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تست و شبیه‌ساز چت</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: 2-COLUMN SPLIT MESSENGER INBOX (M3 Dual Pane Canvas)
         ===================================================================== */}
      {activeTab === "inbox" && (
        <div className="bg-surface-container-lowest rounded-[28px] border border-outline-variant/40 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          {/* RIGHT PANE: Thread List */}
          <div className={cn("lg:col-span-4 border-b lg:border-b-0 lg:border-l border-outline-variant/30 flex flex-col bg-surface-container-lowest", showMobileChat ? "hidden lg:flex" : "flex")}>
            {/* Search & Filter Header */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی کاربر یا متن پیام..."
                    className="w-full rounded-xl bg-slate-100/80 pr-8 pl-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  title="بروزرسانی گفتگوها"
                  className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

            </div>

            {/* Scrollable Conversation Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[500px]">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-slate-400">
                  <MessageSquare className="w-6 h-6 mx-auto opacity-60" />
                  <div className="text-xs font-semibold text-slate-600">
                    گفتگویی در این بخش وجود ندارد
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    به محض اینکه کاربری در دایرکت پیام بدهد یا استوری شما را ریپلای کند، مکالمه‌اش در این ستون ظاهر می‌شود.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected =
                    activeConversation?.sender_username.toLowerCase() ===
                    conv.sender_username.toLowerCase();
                  return (
                    <button
                      key={conv.sender_username}
                      type="button"
                      onClick={() => {
                        setSelectedSender(conv.sender_username);
                        setShowMobileChat(true);
                      }}
                      className={cn(
                        "w-full text-right px-4 py-3.5 flex items-start gap-3 transition-all cursor-pointer border-r-4",
                        isSelected
                          ? "bg-primary/10 border-r-primary text-on-surface"
                          : "border-r-transparent hover:bg-surface-container-high/50 bg-transparent text-on-surface-variant"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-2xs",
                          conv.bot_paused
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : isSelected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface"
                        )}
                      >
                        {conv.sender_username.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn(
                            "font-mono text-xs truncate",
                            isSelected ? "font-bold text-on-surface" : "font-medium text-on-surface"
                          )}>
                            <bdi>@{conv.sender_username}</bdi>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {conv.bot_paused && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                ⏸️ ادمین
                              </span>
                            )}
                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                conv.is_story_reply
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                  : conv.source_shortcode
                                  ? "bg-primary/10 text-primary"
                                  : "bg-surface-container text-on-surface-variant"
                              )}
                            >
                              {conv.is_story_reply
                                ? "ریپلای استوری"
                                : conv.source_shortcode
                                ? `از کامنت پست ${conv.source_shortcode}`
                                : "دایرکت مستقیم"}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-on-surface-variant truncate mt-1">
                          {conv.last_incoming || "—"}
                        </p>

                        {conv.last_reply && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5 flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{conv.last_reply}</span>
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* LEFT PANE: Active Conversation Stream & 1-Click Bot Pause */}
          <div className={cn("lg:col-span-8 flex flex-col bg-slate-50/40", !showMobileChat ? "hidden lg:flex" : "flex")}>
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  هنوز مکالمه‌ای در صندوق دایرکت ثبت نشده است
                </div>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  وقتی مخاطبان زیر پست‌های شما کامنت بگذارند یا در دایرکت و استوری پیام بدهند، تمام پیام‌ها و پاسخ‌های هوش مصنوعی به شکل چت زنده در این صفحه نمایش داده می‌شود.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>بررسی تنظیمات پاسخگوی خودکار استوری و دایرکت</span>
                </button>
              </div>
            ) : (
              <>
                {/* Conversation Top Bar */}
                <div className="bg-white border-b border-slate-100 px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMobileChat(false)}
                      className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                      title="بازگشت به لیست گفتگوها"
                    >
                      <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {activeConversation.sender_username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          <bdi>@{activeConversation.sender_username}</bdi>
                        </span>
                        {activeConversation.read_at && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCheck className="w-3 h-3" />
                            سین شده
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {activeConversation.is_story_reply ? (
                          <span className="text-rose-600 font-medium">
                            📸 شروع مکالمه از ریپلای استوری
                          </span>
                        ) : activeConversation.source_shortcode ? (
                          <span className="text-indigo-600 font-medium">
                            🎬 ادامه خودکار سناریوی پست
                          </span>
                        ) : (
                          <span>💬 پیام مستقیم در دایرکت</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Human Takeover Switch */}
                  <button
                    type="button"
                    disabled={togglingUser === activeConversation.sender_username}
                    onClick={() =>
                      handleToggleBotPause(
                        activeConversation.sender_username,
                        activeConversation.bot_paused
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeConversation.bot_paused
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800"
                    }`}
                  >
                    {togglingUser === activeConversation.sender_username ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : activeConversation.bot_paused ? (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>ربات برای این کاربر متوقف است (فعال‌سازی مجدد)</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-4 h-4 text-amber-600" />
                        <span>توقف ربات برای این کاربر (پاسخ توسط خودم)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[420px]">
                  {activeConversation.messages.length === 0 ? (
                    <div className="space-y-3">
                      {activeConversation.last_incoming && (
                        <div className="flex justify-start">
                          <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-white border border-slate-200/80 px-4 py-2.5 text-xs text-slate-800 shadow-2xs">
                            <div className="font-semibold text-[10px] text-slate-400 mb-1">
                              پیام مشتری
                            </div>
                            <p className="leading-relaxed">
                              {activeConversation.last_incoming}
                            </p>
                          </div>
                        </div>
                      )}
                      {activeConversation.last_reply && (
                        <div className="flex justify-end">
                          <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-indigo-600 text-white px-4 py-2.5 text-xs shadow-2xs">
                            <div className="font-semibold text-[10px] text-indigo-200 mb-1">
                              پاسخ هوشمند پیج
                            </div>
                            <p className="leading-relaxed">
                              {activeConversation.last_reply}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    activeConversation.messages.map((msg) => (
                      <div key={msg.id} className="space-y-2.5">
                        {/* Customer Incoming Bubble */}
                        {msg.incoming_text && (
                          <div className="flex justify-start">
                            <div className="max-w-[78%] rounded-[20px] rounded-tr-xs bg-surface-container-high border border-outline-variant/30 px-4 py-2.5 text-xs text-on-surface shadow-2xs">
                              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mb-1">
                                <span>مشتری</span>
                                {msg.is_story_reply === 1 && (
                                  <span className="text-rose-600 font-semibold">
                                    • 📸 ریپلای روی استوری
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">
                                {msg.incoming_text}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Bot/Admin Outgoing Bubble */}
                        {msg.reply_text ? (
                          <div className="flex justify-end">
                            <div
                              className={cn(
                                "max-w-[78%] rounded-[20px] rounded-tl-xs px-4.5 py-3 text-xs shadow-2xs",
                                msg.reply_status === "pending_follow"
                                  ? "bg-amber-600 text-white"
                                  : "bg-primary text-on-primary"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 text-[10px] opacity-85 mb-1">
                                <span>
                                  {msg.reply_status === "pending_follow"
                                    ? "🔒 پیام دعوت به فالو"
                                    : "🤖 پاسخ خودکار استودیو"}
                                </span>
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>ارسال شد</span>
                                </span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap font-medium">
                                {msg.reply_text}
                              </p>
                            </div>
                          </div>
                        ) : (
                          msg.reply_status === "skipped" && (
                            <div className="flex justify-end">
                              <div className="rounded-full bg-surface-container-high text-on-surface-variant px-3 py-1.5 text-[11px]">
                                بدون پاسخ خودکار (رد شده طبق قوانین)
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Manual Direct Reply Input Bar (M3 Tonal Surface) */}
                <form
                  onSubmit={handleSendManualReply}
                  className="bg-surface-container-lowest border-t border-outline-variant/30 p-4 space-y-2 shrink-0"
                >
                  {manualNotice && (
                    <div className="text-[11px] font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                      {manualNotice}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualReplyText}
                      onChange={(e) => setManualReplyText(e.target.value)}
                      placeholder={`ارسال پیام مستقیم به @${activeConversation.sender_username} (با ارسال پیام، ربات برای این کاربر متوقف می‌شود)...`}
                      className="flex-1 rounded-full bg-surface-container-high px-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sendingManual || !manualReplyText.trim()}
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-primary hover:opacity-95 disabled:opacity-40 text-on-primary text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      {sendingManual ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>ارسال</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: CAPTURED LEADS & PHONE NUMBERS CRM (Single Clean Surface)
         ===================================================================== */}
      {activeTab === "leads" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>مشتریان داغ و شماره‌های موبایل شکارشده</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 tabular-nums font-bold">
                  {formatNumber(leads.length)} مورد
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                شماره‌های موبایل ارسالی در دایرکت یا کامنت به صورت خودکار استخراج و در این لیست ذخیره می‌شوند.
              </p>
            </div>

            {leads.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود فایل اکسل شماره‌ها (CSV)</span>
              </button>
            )}
          </div>

          {leads.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Phone className="w-7 h-7 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                هنوز شماره تماسی از مشتریان دریافت نشده است
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                به محض اینکه کاربری در دایرکت یا کامنت شماره موبایل خود را بفرستد، شماره او به همراه نام کاربری و پست مبدا در این جدول آماده تماس خواهد بود.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">مشتری</th>
                    <th className="py-3 px-4">شماره تماس</th>
                    <th className="py-3 px-4">پست مبدا</th>
                    <th className="py-3 px-4">پیام مشتری</th>
                    <th className="py-3 px-4">وضعیت پیگیری</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          <bdi className="font-mono text-indigo-700">
                            @{lead.sender_username}
                          </bdi>
                        </div>
                        {lead.sender_full_name && (
                          <div className="text-[11px] text-slate-500">
                            {lead.sender_full_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(lead.phone_number)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold tabular-nums transition-colors cursor-pointer"
                          title="کپی شماره"
                        >
                          <Phone className="w-3 h-3" />
                          <span dir="ltr">{lead.phone_number}</span>
                          {copiedPhone === lead.phone_number ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {lead.source_shortcode ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                            🎬 پست پیج
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            دایرکت / استوری
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div
                          className="truncate text-slate-700"
                          title={lead.last_message}
                        >
                          {lead.last_message}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleLeadStatusChange(
                              lead.id,
                              e.target.value as
                                | "new"
                                | "contacted"
                                | "converted"
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold outline-none cursor-pointer ${
                            lead.status === "converted"
                              ? "bg-emerald-50 text-emerald-800"
                              : lead.status === "contacted"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-800"
                          }`}
                        >
                          <option value="new">🔥 جدید (منتظر تماس)</option>
                          <option value="contacted">📞 تماس گرفته شد</option>
                          <option value="converted">✅ تبدیل به فروش شد</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSender(lead.sender_username);
                              setActiveTab("inbox");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            مشاهده چت
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: STORY REPLIES & GENERAL DM AUTOPILOT SETTINGS (Single Surface)
         ===================================================================== */}
      {activeTab === "settings" && (
        <DmSettingsPanel
          account={accountUsername}
          config={config}
          setConfig={setConfig}
          onSaveConfig={handleSave}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          brandCheatSheet={brandCheatSheet}
          setBrandCheatSheet={setBrandCheatSheet}
          saving={saving}
          saveSuccess={saveSuccess}
          onOpenTestChat={() => setActiveTab("test")}
        />
      )}

      {/* =====================================================================
          TAB 4: LIVE INSTAGRAM DM AGENT TEST SIMULATOR
         ===================================================================== */}
      {activeTab === "test" && (
        <DmTestChatPanel
          username={accountUsername}
          config={config}
          pagesCount={Number(config.crawl_pages_count || 0)}
        />
      )}
    </div>
  );
}

export const DMAutomationView = DmAutomationView;
