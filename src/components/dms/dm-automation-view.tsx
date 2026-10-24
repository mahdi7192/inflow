"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DMAutomationRow, DMLogRow } from "@/lib/db";
import { Lang, formatNumber as formatNumberI18n } from "@/lib/i18n";
import { useWorkspace } from "@/components/layout/workspace-context";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { M3Switch, M3Tabs, type M3TabItem } from "@/components/material/m3";
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
      "﻿" +
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
      <div className="flex items-center justify-center py-20 text-on-surface-variant gap-3">
        <md-circular-progress indeterminate className="[--md-circular-progress-size:24px]" />
        <span className="body-medium">در حال بارگذاری صندوق دایرکت...</span>
      </div>
    );
  }

  const isEnabled = config.enabled === 1;
  const pausedCount = conversationList.filter((c) => c.bot_paused).length;

  const countBadge = (n: number, tone: "neutral" | "error" = "neutral") => (
    <span
      className={cn(
        "min-w-5 h-5 px-1.5 rounded-full inline-flex items-center justify-center label-small tabular-nums",
        tone === "error" && n > 0
          ? "bg-error-container text-on-error-container"
          : "bg-surface-container-highest text-on-surface-variant"
      )}
    >
      {formatNumber(n)}
    </span>
  );

  const studioTabs: M3TabItem<StudioDmTab>[] = [
    {
      id: "inbox",
      label: "گفتگوهای دایرکت",
      icon: <MaterialSymbol name="forum" size={20} />,
      badge: countBadge(conversationList.length),
    },
    {
      id: "leads",
      label: "شماره‌های شکارشده",
      icon: <MaterialSymbol name="local_fire_department" size={20} />,
      badge: countBadge(leads.length, "error"),
    },
    {
      id: "settings",
      label: "دستیار هوشمند دایرکت",
      icon: <MaterialSymbol name="smart_toy" size={20} />,
      badge: (
        <span
          className={cn("w-2 h-2 rounded-full", isEnabled ? "bg-primary" : "bg-outline")}
          aria-label={isEnabled ? "فعال" : "غیرفعال"}
        />
      ),
    },
    {
      id: "test",
      label: "تست و شبیه‌ساز چت",
      icon: <MaterialSymbol name="science" size={20} />,
    },
  ];

  return (
    <div dir="rtl" className="w-full space-y-4 pb-10 text-on-surface">
      {/* Studio header */}
      <header className="space-y-1 px-1">
        <h1 className="headline-small text-on-surface flex flex-wrap items-center gap-2.5">
          <span>صندوق دایرکت، استوری و مشتریان</span>
          {pausedCount > 0 && (
            <span className="inline-flex items-center gap-1 label-medium px-2.5 py-1 rounded-lg bg-tertiary-container text-on-tertiary-container tabular-nums">
              <MaterialSymbol name="support_agent" size={16} />
              {formatNumber(pausedCount)} چت در دست ادمین
            </span>
          )}
        </h1>
        <p className="body-medium text-on-surface-variant">
          مکالمات پست‌ها به صورت خودکار ادامه می‌یابند. در اینجا گفتگوها را ببینید، ربات را برای هر کاربر متوقف کنید یا شماره‌های تماس را بردارید.
        </p>
      </header>

      {/* M3 primary tabs */}
      <M3Tabs
        tabs={studioTabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="بخش‌های استودیوی دایرکت"
        className="rounded-2xl overflow-hidden bg-surface max-w-full overflow-x-auto"
      />

      {/* =====================================================================
          TAB 1: 2-COLUMN SPLIT MESSENGER INBOX (M3 Dual Pane Canvas)
         ===================================================================== */}
      {activeTab === "inbox" && (
        <div className="bg-surface rounded-3xl border border-outline-variant overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          {/* START PANE: Thread List */}
          <div
            className={cn(
              "lg:col-span-4 border-b lg:border-b-0 lg:border-e border-outline-variant flex-col bg-surface-container-low",
              showMobileChat ? "hidden lg:flex" : "flex"
            )}
          >
            {/* M3 search bar */}
            <div className="p-3 flex items-center gap-1.5">
              <label className="relative flex-1 flex items-center h-12 rounded-full bg-surface-container-high text-on-surface-variant focus-within:ring-2 focus-within:ring-primary transition-shadow">
                <MaterialSymbol name="search" size={22} className="absolute start-3.5 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی کاربر یا متن پیام..."
                  aria-label="جستجوی گفتگوها"
                  className="w-full h-full bg-transparent ps-12 pe-4 body-medium text-on-surface placeholder:text-on-surface-variant outline-none"
                />
              </label>
              <md-icon-button
                onClick={handleRefreshAll}
                disabled={refreshing}
                title="بروزرسانی گفتگوها"
                aria-label="بروزرسانی گفتگوها"
              >
                <MaterialSymbol name="refresh" size={22} className={cn(refreshing && "animate-spin")} />
              </md-icon-button>
            </div>

            {/* Scrollable Conversation Rows */}
            <div className="flex-1 overflow-y-auto max-h-[500px] px-2 pb-2 space-y-0.5">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-on-surface-variant">
                  <MaterialSymbol name="forum" size={32} className="opacity-60" />
                  <div className="title-small text-on-surface">گفتگویی در این بخش وجود ندارد</div>
                  <p className="body-small leading-relaxed">
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
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "relative w-full text-start px-3 py-3 flex items-start gap-3 rounded-2xl transition-colors cursor-pointer",
                        isSelected
                          ? "bg-secondary-container text-on-secondary-container"
                          : "text-on-surface hover:bg-on-surface/5"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-mono label-large shrink-0",
                          conv.bot_paused
                            ? "bg-tertiary-container text-on-tertiary-container"
                            : isSelected
                            ? "bg-primary text-on-primary"
                            : "bg-primary-container text-on-primary-container"
                        )}
                      >
                        {conv.sender_username.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono label-large truncate">
                            <bdi>@{conv.sender_username}</bdi>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {conv.bot_paused && (
                              <span className="inline-flex items-center gap-0.5 label-small px-1.5 py-0.5 rounded-md bg-tertiary-container text-on-tertiary-container">
                                <MaterialSymbol name="pause" size={12} />
                                ادمین
                              </span>
                            )}
                            <span
                              className={cn(
                                "label-small px-2 py-0.5 rounded-md",
                                conv.is_story_reply
                                  ? "bg-error-container text-on-error-container"
                                  : conv.source_shortcode
                                  ? "bg-primary-container text-on-primary-container"
                                  : "bg-surface-container-highest text-on-surface-variant"
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

                        <p className="body-small text-on-surface-variant truncate mt-1">
                          {conv.last_incoming || "—"}
                        </p>

                        {conv.last_reply && (
                          <p className="body-small text-primary truncate mt-0.5 flex items-center gap-1">
                            <MaterialSymbol name="done_all" size={14} className="shrink-0" />
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

          {/* END PANE: Active Conversation Stream & 1-Click Bot Pause */}
          <div className={cn("lg:col-span-8 flex-col bg-surface", !showMobileChat ? "hidden lg:flex" : "flex")}>
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                  <MaterialSymbol name="forum" size={28} />
                </div>
                <div className="title-medium text-on-surface">
                  هنوز مکالمه‌ای در صندوق دایرکت ثبت نشده است
                </div>
                <p className="body-small text-on-surface-variant max-w-md leading-relaxed">
                  وقتی مخاطبان زیر پست‌های شما کامنت بگذارند یا در دایرکت و استوری پیام بدهند، تمام پیام‌ها و پاسخ‌های هوش مصنوعی به شکل چت زنده در این صفحه نمایش داده می‌شود.
                </p>
                <md-filled-tonal-button onClick={() => setActiveTab("settings")} className="mt-1">
                  <MaterialSymbol name="smart_toy" size={18} slot="icon" />
                  بررسی تنظیمات دستیار هوشمند دایرکت
                </md-filled-tonal-button>
              </div>
            ) : (
              <>
                {/* Conversation Top Bar */}
                <div className="bg-surface-container-low border-b border-outline-variant px-3 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <md-icon-button
                      onClick={() => setShowMobileChat(false)}
                      className="lg:hidden shrink-0"
                      title="بازگشت به لیست گفتگوها"
                      aria-label="بازگشت به لیست گفتگوها"
                    >
                      <MaterialSymbol name="arrow_forward" size={22} />
                    </md-icon-button>
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-mono label-large flex items-center justify-center shrink-0">
                      {activeConversation.sender_username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono title-small text-on-surface truncate">
                          <bdi>@{activeConversation.sender_username}</bdi>
                        </span>
                        {activeConversation.read_at && (
                          <span className="inline-flex items-center gap-1 label-small px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container">
                            <MaterialSymbol name="done_all" size={14} />
                            سین شده
                          </span>
                        )}
                      </div>
                      <div className="body-small text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <MaterialSymbol
                          name={
                            activeConversation.is_story_reply
                              ? "amp_stories"
                              : activeConversation.source_shortcode
                              ? "movie"
                              : "chat"
                          }
                          size={14}
                        />
                        <span>
                          {activeConversation.is_story_reply
                            ? "شروع مکالمه از ریپلای استوری"
                            : activeConversation.source_shortcode
                            ? "ادامه خودکار سناریوی پست"
                            : "پیام مستقیم در دایرکت"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Human Takeover Switch */}
                  <div className="flex items-center gap-3 rounded-full bg-surface-container-high ps-4 pe-2 py-1.5">
                    <span className="flex flex-col">
                      <span className="label-large text-on-surface">
                        {activeConversation.bot_paused ? "ربات متوقف است" : "پاسخ خودکار ربات"}
                      </span>
                      <span className="label-small text-on-surface-variant">
                        {activeConversation.bot_paused ? "پاسخ‌ها توسط ادمین" : "خاموش کنید تا خودتان پاسخ دهید"}
                      </span>
                    </span>
                    {togglingUser === activeConversation.sender_username ? (
                      <md-circular-progress indeterminate className="[--md-circular-progress-size:24px] mx-3" />
                    ) : (
                      <M3Switch
                        selected={!activeConversation.bot_paused}
                        onChange={() =>
                          handleToggleBotPause(
                            activeConversation.sender_username,
                            activeConversation.bot_paused
                          )
                        }
                        ariaLabel="پاسخ خودکار ربات برای این کاربر"
                      />
                    )}
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[420px] bg-surface">
                  {activeConversation.messages.length === 0 ? (
                    <div className="space-y-3">
                      {activeConversation.last_incoming && (
                        <div className="flex justify-start">
                          <div className="max-w-[78%] rounded-[20px] rounded-ss-sm bg-surface-container-high px-4 py-2.5 body-small text-on-surface">
                            <div className="label-small text-on-surface-variant mb-1">پیام مشتری</div>
                            <p className="leading-relaxed">{activeConversation.last_incoming}</p>
                          </div>
                        </div>
                      )}
                      {activeConversation.last_reply && (
                        <div className="flex justify-end">
                          <div className="max-w-[78%] rounded-[20px] rounded-se-sm bg-primary-container text-on-primary-container px-4 py-2.5 body-small">
                            <div className="label-small text-on-primary-container/80 mb-1">پاسخ هوشمند پیج</div>
                            <p className="leading-relaxed">{activeConversation.last_reply}</p>
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
                            <div className="max-w-[78%] rounded-[20px] rounded-ss-sm bg-surface-container-high px-4 py-2.5 body-small text-on-surface">
                              <div className="flex items-center gap-1.5 label-small text-on-surface-variant mb-1">
                                <span>مشتری</span>
                                {msg.is_story_reply === 1 && (
                                  <span className="inline-flex items-center gap-0.5 text-on-error-container">
                                    <MaterialSymbol name="amp_stories" size={12} />
                                    ریپلای روی استوری
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.incoming_text}</p>
                            </div>
                          </div>
                        )}

                        {/* Bot/Admin Outgoing Bubble */}
                        {msg.reply_text ? (
                          <div className="flex justify-end">
                            <div
                              className={cn(
                                "max-w-[78%] rounded-[20px] rounded-se-sm px-4 py-2.5 body-small",
                                msg.reply_status === "pending_follow"
                                  ? "bg-tertiary-container text-on-tertiary-container"
                                  : "bg-primary-container text-on-primary-container"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 label-small opacity-85 mb-1">
                                <span className="inline-flex items-center gap-1">
                                  <MaterialSymbol
                                    name={msg.reply_status === "pending_follow" ? "lock" : "smart_toy"}
                                    size={12}
                                  />
                                  {msg.reply_status === "pending_follow"
                                    ? "پیام دعوت به فالو"
                                    : "پاسخ خودکار استودیو"}
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <MaterialSymbol name="check" size={14} />
                                  ارسال شد
                                </span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.reply_text}</p>
                            </div>
                          </div>
                        ) : (
                          msg.reply_status === "skipped" && (
                            <div className="flex justify-end">
                              <div className="rounded-full bg-surface-container-high text-on-surface-variant px-3 py-1.5 label-small">
                                بدون پاسخ خودکار (رد شده طبق قوانین)
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Manual Direct Reply Composer */}
                <form
                  onSubmit={handleSendManualReply}
                  className="bg-surface-container-low border-t border-outline-variant p-3 sm:p-4 space-y-2 shrink-0"
                >
                  {manualNotice && (
                    <div role="status" className="body-small text-on-secondary-container bg-secondary-container px-3 py-1.5 rounded-lg">
                      {manualNotice}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualReplyText}
                      onChange={(e) => setManualReplyText(e.target.value)}
                      placeholder={`ارسال پیام مستقیم به @${activeConversation.sender_username} (با ارسال پیام، ربات برای این کاربر متوقف می‌شود)...`}
                      aria-label="متن پیام دستی"
                      className="flex-1 min-w-0 h-12 rounded-full bg-surface-container-high px-5 body-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                    <md-filled-button
                      type="submit"
                      disabled={sendingManual || !manualReplyText.trim()}
                      className="shrink-0"
                    >
                      {sendingManual ? (
                        <md-circular-progress indeterminate slot="icon" className="[--md-circular-progress-size:18px]" />
                      ) : (
                        <MaterialSymbol name="send" size={18} slot="icon" />
                      )}
                      ارسال
                    </md-filled-button>
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
        <div className="bg-surface rounded-3xl border border-outline-variant overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <MaterialSymbol name="local_fire_department" size={24} className="text-on-error-container shrink-0 mt-0.5" />
              <div>
                <h2 className="title-medium text-on-surface flex flex-wrap items-center gap-2">
                  <span>مشتریان داغ و شماره‌های موبایل شکارشده</span>
                  <span className="label-medium px-2 py-0.5 rounded-md bg-error-container text-on-error-container tabular-nums">
                    {formatNumber(leads.length)} مورد
                  </span>
                </h2>
                <p className="body-small text-on-surface-variant mt-0.5">
                  شماره‌های موبایل ارسالی در دایرکت یا کامنت به صورت خودکار استخراج و در این لیست ذخیره می‌شوند.
                </p>
              </div>
            </div>

            {leads.length > 0 && (
              <md-filled-tonal-button onClick={handleExportCsv} className="shrink-0">
                <MaterialSymbol name="download" size={18} slot="icon" />
                دانلود فایل اکسل شماره‌ها (CSV)
              </md-filled-tonal-button>
            )}
          </div>

          {leads.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <MaterialSymbol name="call" size={32} className="text-on-surface-variant opacity-60" />
              <div className="title-small text-on-surface">
                هنوز شماره تماسی از مشتریان دریافت نشده است
              </div>
              <p className="body-small text-on-surface-variant max-w-md mx-auto leading-relaxed">
                به محض اینکه کاربری در دایرکت یا کامنت شماره موبایل خود را بفرستد، شماره او به همراه نام کاربری و پست مبدا در این جدول آماده تماس خواهد بود.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start body-small">
                <thead className="bg-surface-container-high text-on-surface-variant label-medium">
                  <tr>
                    <th className="py-3 px-4 text-start">مشتری</th>
                    <th className="py-3 px-4 text-start">شماره تماس</th>
                    <th className="py-3 px-4 text-start">پست مبدا</th>
                    <th className="py-3 px-4 text-start">پیام مشتری</th>
                    <th className="py-3 px-4 text-start">وضعیت پیگیری</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-on-surface/5 transition-colors">
                      <td className="py-3 px-4">
                        <bdi className="font-mono label-large text-primary">@{lead.sender_username}</bdi>
                        {lead.sender_full_name && (
                          <div className="body-small text-on-surface-variant">{lead.sender_full_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(lead.phone_number)}
                          className="relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary-container text-on-secondary-container label-large tabular-nums cursor-pointer"
                          title="کپی شماره"
                        >
                          <md-ripple />
                          <MaterialSymbol name="call" size={16} />
                          <span dir="ltr">{lead.phone_number}</span>
                          <MaterialSymbol
                            name={copiedPhone === lead.phone_number ? "check" : "content_copy"}
                            size={16}
                            className={cn(copiedPhone !== lead.phone_number && "opacity-60")}
                          />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {lead.source_shortcode ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container label-small">
                            <MaterialSymbol name="movie" size={14} />
                            پست پیج
                          </span>
                        ) : (
                          <span className="text-on-surface-variant label-small">دایرکت / استوری</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate text-on-surface" title={lead.last_message}>
                          {lead.last_message}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleLeadStatusChange(
                              lead.id,
                              e.target.value as "new" | "contacted" | "converted"
                            )
                          }
                          aria-label="وضعیت پیگیری"
                          className={cn(
                            "h-8 px-2.5 rounded-lg label-medium outline-none cursor-pointer border border-outline-variant focus:ring-2 focus:ring-primary",
                            lead.status === "converted"
                              ? "bg-primary-container text-on-primary-container"
                              : lead.status === "contacted"
                              ? "bg-tertiary-container text-on-tertiary-container"
                              : "bg-error-container text-on-error-container"
                          )}
                        >
                          <option value="new">🔥 جدید (منتظر تماس)</option>
                          <option value="contacted">📞 تماس گرفته شد</option>
                          <option value="converted">✅ تبدیل به فروش شد</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <md-text-button
                            onClick={() => {
                              setSelectedSender(lead.sender_username);
                              setActiveTab("inbox");
                            }}
                          >
                            مشاهده چت
                          </md-text-button>
                          <md-icon-button
                            onClick={() => handleDeleteLead(lead.id)}
                            title="حذف"
                            aria-label="حذف"
                          >
                            <MaterialSymbol name="delete" size={20} />
                          </md-icon-button>
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
          TAB 3: AGENTIC AI DM ASSISTANT SETTINGS
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
