"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Clock,
  LayoutGrid,
  List,
  Sparkles,
  MessageSquare,
  Send,
  UserCheck,
  FolderOpen,
  Menu,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge, Switch, Input } from "@/components/ui/primitives";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { SidebarNav } from "@/components/sidebar-nav";
import { I18N, Lang } from "@/lib/i18n";
import type { AccountRow, PostRow, BotStatus } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { EmptyTenancyView } from "./empty-tenancy-view";
import { PostDetailView } from "./post-detail-view";
import { LogsModal } from "./modals/logs-modal";
import { AgentApiModal } from "./modals/agent-api-modal";
import { AddAccountModal } from "./modals/create-modals";
import { DeleteAccountModal } from "./modals/delete-account-modal";
import { BotSetupWizard } from "./bot/bot-setup-wizard";
import { BotToolbarButton } from "./bot/bot-toolbar-button";
import { BotMonitorDrawer } from "./bot/bot-monitor-drawer";
import { VncViewerModal } from "./bot/vnc-viewer-modal";
import { cn } from "@/lib/utils";

export interface InflowDashboardProps {
  currentUser?: SafeUser | null;
  initialAccount?: string;
  initialProfile?: AccountRow | null;
  initialPosts?: PostRow[];
  initialAccounts?: AccountRow[];
}

export function InflowDashboard({
  currentUser,
  initialAccount,
  initialProfile = null,
  initialPosts = [],
  initialAccounts = [],
}: InflowDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [lang, setLang] = useState<Lang>("fa");
  const [accounts, setAccounts] = useState<AccountRow[]>(initialAccounts);
  const [currentAccount, setCurrentAccount] = useState<string>(
    initialAccount || (initialAccounts.length > 0 ? initialAccounts[0].username : "")
  );
  const [profile, setProfile] = useState<AccountRow | null>(initialProfile);
  const [posts, setPosts] = useState<PostRow[]>(initialPosts);
  const [loading, setLoading] = useState(
    !initialProfile && !initialPosts.length && !initialAccount
  );
  const [syncing, setSyncing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<{
    is_online: boolean;
    sse_connected: boolean;
  } | null>(null);
  const [syncAlert, setSyncAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Responsive mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<
    "all" | "active" | "inactive" | "reels" | "posts"
  >("all");
  const [viewMode, setViewMode] = useState<"cards" | "grid">("cards");

  // Selected post for detail configuration screen
  const [selectedShortcode, setSelectedShortcode] = useState<string | null>(null);

  // Modals
  const [logsShortcode, setLogsShortcode] = useState<string | null>(null);
  const [agentApiOpen, setAgentApiOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const handleAccountDeleted = () => {
    setDeleteAccountOpen(false);
    const clean = (currentAccount || "").toLowerCase();
    const remaining = accounts.filter(
      (a) => a.username.toLowerCase() !== clean
    );
    setAccounts(remaining);
    if (remaining.length > 0) {
      handleSelectAccount(remaining[0].username);
    } else {
      router.push("/");
    }
  };

  // Dedicated Bot Lifecycle & VNC Guard States
  const [botStatus, setBotStatus] = useState<BotStatus>(
    initialProfile?.bot_status || "unprovisioned"
  );
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(false);
  const [botDrawerOpen, setBotDrawerOpen] = useState(false);
  const [vncModalOpen, setVncModalOpen] = useState(false);
  const [vncUrl, setVncUrl] = useState("");
  const [vncExpiresInSec, setVncExpiresInSec] = useState(600);
  const [isVncLoading, setIsVncLoading] = useState(false);

  const handleOpenVnc = async () => {
    setIsVncLoading(true);
    try {
      const res = await fetch("/api/bot/vnc-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: currentAccount }),
      });
      const data = await res.json();
      if (data.success) {
        setVncUrl(data.vnc_url);
        setVncExpiresInSec(data.timeout_seconds || 600);
        setVncModalOpen(true);
      } else {
        alert("خطا در باز کردن نشست مانیتور: " + data.error);
      }
    } catch (err: unknown) {
      alert("خطا در ارتباط با سرور: " + (err as Error).message);
    } finally {
      setIsVncLoading(false);
    }
  };

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const checkAgentStatus = useCallback(async (accountName: string) => {
    if (!accountName) return;
    try {
      const res = await fetch(`/api/sync/status?account=${encodeURIComponent(accountName)}`);
      const data = await res.json();
      if (data.success && data.agent_status) {
        setAgentStatus(data.agent_status);
      }

      const botRes = await fetch(`/api/bot/status?account=${encodeURIComponent(accountName)}`);
      const botData = await botRes.json();
      if (botData.success && botData.bot_status) {
        setBotStatus(botData.bot_status);
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  // Sync saved language from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem("inflow_lang") as Lang | null;
    if (saved && (saved === "fa" || saved === "en" || saved === "ar")) {
      setLang(saved);
      document.documentElement.dir = saved === "en" ? "ltr" : "rtl";
      document.documentElement.lang = saved;
    }
  }, []);

  // Change HTML dir and lang
  const handleSetLang = (l: Lang) => {
    setLang(l);
    if (typeof document !== "undefined") {
      document.documentElement.dir = l === "en" ? "ltr" : "rtl";
      document.documentElement.lang = l;
      localStorage.setItem("inflow_lang", l);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  // URL deep-link search parameter synchronization
  const postParam = searchParams.get("post");
  const accountParam = searchParams.get("account");

  // Fetch accounts list (tenancy scoped by server)
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0) {
          const names = data.accounts.map((a: AccountRow) => a.username);
          if (currentAccount && names.includes(currentAccount)) {
            // Retain currently selected account
          } else if (initialAccount && names.includes(initialAccount)) {
            setCurrentAccount(initialAccount);
          } else if (accountParam && names.includes(accountParam)) {
            setCurrentAccount(accountParam);
          } else if (!currentAccount) {
            setCurrentAccount(data.accounts[0].username);
          }
        } else {
          setCurrentAccount("");
          setProfile(null);
          setPosts([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [accountParam, initialAccount, currentAccount]);

  // Fetch posts for the current account
  const fetchPosts = useCallback(async (account: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/posts?account=${encodeURIComponent(account)}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        if (data.profile?.bot_status) {
          setBotStatus(data.profile.bot_status);
        } else {
          setBotStatus("unprovisioned");
        }
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialAccounts || initialAccounts.length === 0) {
      fetchAccounts();
    }
  }, [fetchAccounts, initialAccounts]);

  useEffect(() => {
    setIsSetupCompleted(false);
  }, [currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      // If we don't already have profile for currentAccount, fetch it with loading indicator
      if (!profile || profile.username !== currentAccount) {
        fetchPosts(currentAccount, true);
      }
      checkAgentStatus(currentAccount);

      const interval = setInterval(() => {
        checkAgentStatus(currentAccount);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentAccount, profile, fetchPosts, checkAgentStatus]);

  // Synchronize URL query parameter with selectedShortcode state (Deep Linking)
  useEffect(() => {
    if (postParam) {
      if (posts.length > 0) {
        const found = posts.some((p) => p.shortcode === postParam);
        if (found) {
          setSelectedShortcode(postParam);
        } else if (!loading) {
          // Graceful fallback for non-existent shortcode in URL (T011)
          console.warn(`Post with shortcode "${postParam}" not found. Falling back to catalog.`);
          setSelectedShortcode(null);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("post");
          const q = params.toString();
          router.replace(q ? `${pathname}?${q}` : pathname);
        }
      } else if (loading) {
        setSelectedShortcode(postParam);
      }
    } else {
      setSelectedShortcode(null);
    }
  }, [postParam, posts, loading, pathname, router, searchParams]);

  // Navigation handlers that update browser history and URL
  const handleSelectPost = (shortcode: string) => {
    setSelectedShortcode(shortcode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("post", shortcode);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBackToList = () => {
    setSelectedShortcode(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("post");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  const handleSelectAccount = (username: string) => {
    setSelectedShortcode(null);
    router.push(`/@${username}`);
  };

  // Sync action with real-time job polling
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_username: currentAccount }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.job_id) {
          // Poll job status until completed or max attempts (15 seconds)
          let attempts = 0;
          const maxAttempts = 10;
          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            attempts++;
            try {
              const statusRes = await fetch(
                `/api/sync/status?account=${currentAccount}&job_id=${data.job_id}`
              );
              const statusData = await statusRes.json();
              if (
                statusData.job &&
                (statusData.job.status === "completed" ||
                  statusData.job.status === "failed" ||
                  statusData.job.status === "timed_out")
              ) {
                break;
              }
            } catch {
              // Ignore polling network glitches
            }
          }
        }
        await fetchPosts(currentAccount);
        await fetchAccounts();
      }
    } finally {
      setSyncing(false);
    }
  };

  // Quick toggle on master switch from card
  const handleQuickToggle = async (shortcode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = posts.find((p) => p.shortcode === shortcode);
    if (!target) return;
    const nextState = target.auto_reply !== 1;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.shortcode === shortcode ? { ...p, auto_reply: nextState ? 1 : 0 } : p
      )
    );

    try {
      await fetch(`/api/posts/${shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_reply: nextState }),
      });
    } catch (err) {
      console.error(err);
      fetchPosts(currentAccount);
    }
  };

  // Filtered posts calculation
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (filterTab === "active" && p.auto_reply !== 1) return false;
      if (filterTab === "inactive" && p.auto_reply === 1) return false;
      if (filterTab === "reels" && p.post_type !== "reel") return false;
      if (filterTab === "posts" && p.post_type !== "post") return false;

      if (q) {
        const inCode = p.shortcode.toLowerCase().includes(q);
        const inCaption = (p.caption || "").toLowerCase().includes(q);
        const inKeywords = (p.trigger_keywords || "").toLowerCase().includes(q);
        const inTrigger = (p.trigger_context || "").toLowerCase().includes(q);
        const inComment = (p.comment_action_text || "").toLowerCase().includes(q);
        const inDm = (p.dm_action_text || "").toLowerCase().includes(q);
        if (!inCode && !inCaption && !inKeywords && !inTrigger && !inComment && !inDm) {
          return false;
        }
      }
      return true;
    });
  }, [posts, filterTab, searchQuery]);

  // Selected post for detail view
  const activeDetailPost = useMemo(() => {
    return posts.find((p) => p.shortcode === selectedShortcode) || null;
  }, [posts, selectedShortcode]);

  // Selected post for logs modal
  const activeLogPost = useMemo(() => {
    return posts.find((p) => p.shortcode === logsShortcode) || null;
  }, [posts, logsShortcode]);

  // Metrics
  const activeCount = posts.filter((p) => p.auto_reply === 1).length;
  const configuredCount = posts.filter(
    (p) =>
      p.auto_reply === 1 &&
      (p.comment_action_type !== "none" || p.dm_action_type !== "none")
  ).length;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-50/50 text-foreground">
      {/* Desktop Sidebar Navigation (Persistent on >= lg viewports) */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-30">
        <SidebarNav
          currentAccount={currentAccount}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onOpenAddAccount={() => setAddAccountOpen(true)}
          onOpenAgentApi={() => setAgentApiOpen(true)}
          onSync={handleSync}
          syncing={syncing}
          currentUser={currentUser}
          onLogout={handleLogout}
          lang={lang}
          isCatalogActive={!selectedShortcode}
          onNavigateCatalog={handleBackToList}
          onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
        />
      </div>

      {/* Mobile Drawer (Accessible on < lg viewports) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Slide-over Drawer */}
          <div className="relative w-64 max-w-[80vw] h-full z-10 animate-in slide-in-from-start duration-200">
            <SidebarNav
              currentAccount={currentAccount}
              accounts={accounts}
              onSelectAccount={(username) => {
                handleSelectAccount(username);
                setMobileDrawerOpen(false);
              }}
              onOpenAddAccount={() => {
                setMobileDrawerOpen(false);
                setAddAccountOpen(true);
              }}
              onOpenAgentApi={() => {
                setMobileDrawerOpen(false);
                setAgentApiOpen(true);
              }}
              onSync={handleSync}
              syncing={syncing}
              currentUser={currentUser}
              onLogout={handleLogout}
              lang={lang}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              isCatalogActive={!selectedShortcode}
              onNavigateCatalog={() => {
                handleBackToList();
                setMobileDrawerOpen(false);
              }}
              onOpenDeleteAccount={() => {
                setMobileDrawerOpen(false);
                setDeleteAccountOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Decluttered Top Header Navigation */}
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-white/80 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label={t("openMenu")}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Contextual Title / Breadcrumb */}
            <div className="flex items-center gap-2 text-xs">
              {selectedShortcode ? (
                <>
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{t("navCatalog")}</span>
                  </button>
                  <span className="text-zinc-300">/</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedShortcode}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    {t("dashboardTitle") || "داشبورد اتوماسیون"}
                  </span>
                  <span className="text-zinc-300">/</span>
                  <span className="font-mono text-muted-foreground">
                    @{currentAccount || "---"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Clean Right Actions: Unified Bot Indicator & Language Dropdown */}
          <div className="flex items-center gap-2">
            {currentAccount && (
              <BotToolbarButton
                account={currentAccount}
                botStatus={botStatus}
                lang={lang}
                onClick={() => setBotDrawerOpen(true)}
              />
            )}

            <LanguageDropdown
              currentLang={lang}
              onLangChange={handleSetLang}
              size="sm"
            />
          </div>
        </header>

        {/* Sync Status Alert Banner */}
        {syncAlert && (
          <div
            className={cn(
              "mx-4 mt-3 px-3 py-2 rounded-lg text-xs flex items-center justify-between border",
              syncAlert.type === "success" &&
                "bg-emerald-50 text-emerald-800 border-emerald-200",
              syncAlert.type === "error" &&
                "bg-red-50 text-red-800 border-red-200",
              syncAlert.type === "info" &&
                "bg-zinc-100 text-zinc-800 border-zinc-200"
            )}
          >
            <span>{syncAlert.message}</span>
            <button
              type="button"
              onClick={() => setSyncAlert(null)}
              className="text-muted-foreground hover:text-foreground text-xs cursor-pointer px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Body */}
        {!loading && accounts.length === 0 && currentUser?.role === "tenant" ? (
          <EmptyTenancyView
            user={currentUser}
            lang={lang}
            onLogout={handleLogout}
          />
        ) : selectedShortcode && activeDetailPost ? (
          <PostDetailView
            post={activeDetailPost}
            lang={lang}
            onBack={handleBackToList}
            onSaveSuccess={(updated) => {
              setPosts((prev) =>
                prev.map((p) => (p.shortcode === updated.shortcode ? updated : p))
              );
            }}
            onOpenLogs={(sc) => setLogsShortcode(sc)}
          />
        ) : !loading && posts.length === 0 && (botStatus !== "live" || !isSetupCompleted) ? (
          <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
            <BotSetupWizard
              account={currentAccount}
              botStatus={botStatus}
              lang={lang}
              onOpenVnc={handleOpenVnc}
              isVncLoading={isVncLoading}
              onStatusChange={(newStatus) => {
                setBotStatus(newStatus);
              }}
              onComplete={async () => {
                setIsSetupCompleted(true);
                await fetchPosts(currentAccount);
                await fetchAccounts();
              }}
            />
          </div>
        ) : (
          <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
            {botStatus === "login_required" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">{I18N[lang]?.botLoginAlertTitle || "نشست اینستاگرام نیازمند ورود مجدد است"}</h4>
                    <p className="text-[11px] text-amber-800/90 mt-0.5">{I18N[lang]?.botLoginAlertDesc || "برای ادامه پاسخگویی خودکار، نیاز به ورود مجدد به حساب دارید. پست‌ها و اتوماسیون‌های شما حفظ شده‌اند."}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenVnc}
                  disabled={isVncLoading}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {isVncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{isVncLoading ? "در حال اتصال..." : (I18N[lang]?.botLoginVncBtn || "ورود مجدد با دسکتاپ مجازی")}</span>
                </button>
              </div>
            )}
            {botStatus === "checkpoint_required" && (
              <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">{I18N[lang]?.botCheckpointAlertTitle || "توجه: اینستاگرام نیازمند تایید هویت است"}</h4>
                    <p className="text-[11px] text-red-800/90 mt-0.5">{I18N[lang]?.botCheckpointAlertDesc || "برای ادامه فعالیت ربات، لطفاً صفحه مرورگر را باز کرده و کد تایید ارسالی توسط اینستاگرام را وارد نمایید."}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenVnc}
                  disabled={isVncLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  {isVncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isVncLoading ? "در حال اتصال..." : (I18N[lang]?.botResolveCheckpointBtn || "حل چالش در مرورگر")}</span>
                </button>
              </div>
            )}
            {/* Account Meta & KPI Metrics Strip */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || currentAccount}
                      className="w-12 h-12 rounded-full object-cover border border-border bg-secondary"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold font-mono text-muted-foreground shrink-0">
                      {(currentAccount || "IN").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{profile?.display_name || currentAccount}</span>
                      <span className="text-xs font-mono text-muted-foreground font-normal">
                        @{currentAccount}
                      </span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {profile?.bio || "پلتفرم اتوماسیون هوشمند کامنت و دایرکت"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteAccountOpen(true)}
                  title="حذف حساب و پاک‌سازی کامل ربات از سامانه"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف حساب و ربات</span>
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{t("totalPosts")}</div>
                  <div className="text-xl font-bold font-mono text-foreground mt-1">
                    {posts.length}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{t("activeAutomations")}</div>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {activeCount}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{t("configuredRules")}</div>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {configuredCount}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{t("totalActions")}</div>
                  <div className="text-xl font-bold font-mono text-sky-700 mt-1">
                    {posts.reduce(
                      (acc, p) =>
                        acc +
                        Number(
                          (p as unknown as { logs_count: number }).logs_count || 0
                        ),
                      0
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Search, Filter Tabs & Relocated View Mode Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  icon={<Search className="w-4 h-4 text-muted-foreground" />}
                  className="h-9 text-xs"
                />
              </div>

              {/* Controls: Filter Tabs + View Mode Toggle */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {/* Filter Tabs */}
                <div className="flex items-center p-0.5 rounded-lg border border-border bg-secondary text-xs">
                  {(
                    [
                      { id: "all", label: t("filterAll") },
                      { id: "active", label: t("filterActive") },
                      { id: "inactive", label: t("filterInactive") },
                      { id: "reels", label: t("filterReels") },
                      { id: "posts", label: t("filterPosts") },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterTab(tab.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-md whitespace-nowrap text-xs font-medium transition-colors cursor-pointer",
                        filterTab === tab.id
                          ? "bg-white text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* View Mode Switcher (Relocated to Content Toolbar) */}
                <div className="flex items-center p-0.5 rounded-lg border border-border bg-secondary shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      viewMode === "cards"
                        ? "bg-white text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={t("viewCards") || "Card View"}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      viewMode === "grid"
                        ? "bg-white text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={t("viewGrid") || "Grid View"}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Posts List / Grid */}
            {loading ? (
              <div className="py-20 text-center text-zinc-500 text-xs">
                در حال بارگذاری پست‌های پیج...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-20 text-center space-y-3 rounded-xl border border-border bg-card">
                <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("noPostsMatch")}</p>
              </div>
            ) : viewMode === "cards" ? (
              /* Cards / Rows View */
              <div className="space-y-3">
                {filteredPosts.map((p) => {
                  const isActive = p.auto_reply === 1;
                  const isReel = p.post_type === "reel";

                  return (
                    <div
                      key={p.shortcode}
                      onClick={() => handleSelectPost(p.shortcode)}
                      className="group rounded-xl border border-border bg-card hover:border-zinc-300 hover:shadow-xs transition-all p-3.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {/* Media Thumb */}
                        <div className="relative w-14 h-18 sm:w-16 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-secondary border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.thumbnail_url ? (
                            <img
                              src={p.thumbnail_url}
                              alt="Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-secondary text-muted-foreground p-1 text-center">
                              <FolderOpen className="w-5 h-5 opacity-40 mb-1" />
                            </div>
                          )}
                          <span className="absolute bottom-1 end-1 px-1 py-0.2 rounded text-[9px] font-mono bg-black/60 text-white">
                            {isReel ? "REEL" : "POST"}
                          </span>
                        </div>

                        {/* Content Snippet */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[130px] sm:max-w-none">
                              {p.shortcode}
                            </span>
                            <span
                              className={cn(
                                "inline-block w-2 h-2 rounded-full shrink-0",
                                isActive ? "bg-emerald-500" : "bg-zinc-300"
                              )}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {p.caption || t("noCaption")}
                          </p>

                          {/* Active Rule Tags */}
                          {isActive && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {p.trigger_type === "keywords" && (
                                <Badge variant="amber">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>{t("tagTriggerKeywords")}</span>
                                </Badge>
                              )}
                              {p.trigger_type === "ai_context" && (
                                <Badge variant="fuchsia">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>{t("tagTriggerAi")}</span>
                                </Badge>
                              )}
                              {p.trigger_type === "all" && (
                                <Badge variant="amber">
                                  <span>{t("tagTriggerAll")}</span>
                                </Badge>
                              )}
                              {p.comment_action_type === "direct" && (
                                <Badge variant="sky">
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>{t("tagCommentDirect")}</span>
                                </Badge>
                              )}
                              {p.comment_action_type === "ai" && (
                                <Badge variant="sky">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>{t("tagCommentAi")}</span>
                                </Badge>
                              )}
                              {p.dm_action_type === "direct" && (
                                <Badge variant="purple">
                                  <Send className="w-2.5 h-2.5" />
                                  <span>{t("tagDmDirect")}</span>
                                </Badge>
                              )}
                              {p.dm_action_type === "ai" && (
                                <Badge variant="purple">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>{t("tagDmAi")}</span>
                                </Badge>
                              )}
                              {p.dm_require_follow === 1 && (
                                <Badge variant="emerald">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  <span>{t("tagRequireFollow")}</span>
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions on Card */}
                      <div
                        className="flex items-center gap-3 shrink-0 self-end sm:self-center pt-2 sm:pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogsShortcode(p.shortcode);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary px-2.5 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          <span>{t("viewLogs")}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isActive ? "text-emerald-700" : "text-muted-foreground"
                            )}
                          >
                            {isActive ? t("statusOn") : t("statusOff")}
                          </span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleQuickToggle(p.shortcode, {} as unknown as React.MouseEvent)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredPosts.map((p) => {
                  const isActive = p.auto_reply === 1;
                  const isReel = p.post_type === "reel";

                  return (
                    <div
                      key={p.shortcode}
                      onClick={() => handleSelectPost(p.shortcode)}
                      className="group rounded-xl border border-border bg-card hover:border-zinc-300 hover:shadow-xs transition-all overflow-hidden cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-4/5 bg-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.thumbnail_url ? (
                          <img
                            src={p.thumbnail_url}
                            alt="Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-secondary text-muted-foreground p-2 text-center">
                            <FolderOpen className="w-6 h-6 opacity-40 mb-1" />
                          </div>
                        )}
                        <span className="absolute top-2 start-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-white">
                          {isReel ? "REEL" : "POST"}
                        </span>
                        <div className="absolute top-2 end-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleQuickToggle(p.shortcode, e)}
                            className={cn(
                              "w-2.5 h-2.5 rounded-full cursor-pointer transition-transform",
                              isActive
                                ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                                : "bg-zinc-300"
                            )}
                          />
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[130px] sm:max-w-none">
                              {p.shortcode}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {p.caption || t("noCaption")}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border text-[10px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogsShortcode(p.shortcode);
                            }}
                            className="text-sky-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3 h-3" />
                            <span>{t("viewLogs")}</span>
                          </button>
                          <span
                            className={cn(
                              "font-semibold",
                              isActive ? "text-emerald-700" : "text-muted-foreground"
                            )}
                          >
                            {isActive ? t("statusOn") : t("statusOff")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {logsShortcode && activeLogPost && (
        <LogsModal
          post={activeLogPost}
          lang={lang}
          onClose={() => setLogsShortcode(null)}
          onLogsUpdated={() => fetchPosts(currentAccount)}
        />
      )}

      {/* Agent API Modal */}
      <AgentApiModal
        open={agentApiOpen}
        accountUsername={currentAccount}
        onClose={() => setAgentApiOpen(false)}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onCreated={(username) => {
          fetchAccounts();
          handleSelectAccount(username);
        }}
      />

      {/* Bot Monitor Drawer */}
      <BotMonitorDrawer
        isOpen={botDrawerOpen}
        onClose={() => setBotDrawerOpen(false)}
        account={currentAccount}
        botStatus={botStatus}
        lang={lang}
        agentStatus={agentStatus}
        onOpenVnc={handleOpenVnc}
        isVncLoading={isVncLoading}
        onStatusChange={(status) => {
          setBotStatus(status);
          if (status === "live") fetchPosts(currentAccount);
        }}
        onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
      />

      {/* VNC Viewer Modal */}
      <VncViewerModal
        isOpen={vncModalOpen}
        onClose={() => setVncModalOpen(false)}
        account={currentAccount}
        vncUrl={vncUrl}
        initialExpiresInSeconds={vncExpiresInSec}
        lang={lang}
        onSessionVerified={() => {
          setBotStatus("live");
        }}
      />

      {/* Delete Account & Wipe Bot Modal */}
      {currentAccount && (
        <DeleteAccountModal
          open={deleteAccountOpen}
          account={currentAccount}
          onClose={() => setDeleteAccountOpen(false)}
          onDeleted={handleAccountDeleted}
        />
      )}
    </div>
  );
}
