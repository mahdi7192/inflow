"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  RotateCw,
  Search,
  Plus,
  Terminal,
  Clock,
  LayoutGrid,
  List,
  Sparkles,
  MessageSquare,
  Send,
  UserCheck,
  ChevronDown,
  Check,
  FolderOpen,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button, Badge, Switch, Input } from "@/components/ui/primitives";
import { I18N, Lang } from "@/lib/i18n";
import type { AccountRow, PostRow } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { EmptyTenancyView } from "./empty-tenancy-view";
import { PostDetailView } from "./post-detail-view";
import { LogsModal } from "./modals/logs-modal";
import { AgentApiModal } from "./modals/agent-api-modal";
import { AddPostModal, AddAccountModal } from "./modals/create-modals";

export function InflowDashboard({
  currentUser,
}: {
  currentUser?: SafeUser | null;
}) {
  const [lang, setLang] = useState<Lang>("fa");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string>("r9spoort1");
  const [profile, setProfile] = useState<AccountRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
  const [addPostOpen, setAddPostOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  // Change HTML dir and lang
  const handleSetLang = (l: Lang) => {
    setLang(l);
    if (typeof document !== "undefined") {
      document.documentElement.dir = l === "en" ? "ltr" : "rtl";
      document.documentElement.lang = l;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  // Fetch accounts list (tenancy scoped by server)
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0) {
          const names = data.accounts.map((a: AccountRow) => a.username);
          setCurrentAccount((prev) => (names.includes(prev) ? prev : data.accounts[0].username));
        } else {
          setCurrentAccount("");
          setProfile(null);
          setPosts([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch posts for the current account
  const fetchPosts = useCallback(async (account: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?account=${account}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (currentAccount) {
      fetchPosts(currentAccount);
    }
  }, [currentAccount, fetchPosts]);

  // Sync action
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
    <div className="min-h-screen flex flex-col bg-zinc-50/50 text-foreground">
      {/* inFlow Header Navigation */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-white/80 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Official Brand Logo */}
          <BrandLogo size="sm" />

          <span className="text-zinc-300">/</span>

          {/* Account Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-secondary text-xs font-medium text-foreground border border-transparent hover:border-border transition-all cursor-pointer"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-zinc-700" />
              <span>@{currentAccount}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {accountDropdownOpen && (
              <div
                className="absolute top-full start-0 mt-1.5 w-60 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  پیج‌های متصل به پلتفرم
                </div>
                {accounts.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => {
                      setCurrentAccount(acc.username);
                      setSelectedShortcode(null);
                      setAccountDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      acc.username === currentAccount
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="truncate">@{acc.username}</span>
                    </div>
                    {acc.username === currentAccount && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    setAddAccountOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("addAccount")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-secondary text-xs">
            {(["fa", "en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleSetLang(l)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  lang === l
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center p-0.5 rounded-lg border border-border bg-secondary">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Agent API Modal Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAgentApiOpen(true)}
            className="hidden md:inline-flex"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("agentApiBtn")}</span>
          </Button>

          {/* Add Post Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAddPostOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("addPost")}</span>
          </Button>

          {/* Sync Button */}
          <Button
            variant="default"
            size="sm"
            disabled={syncing}
            onClick={handleSync}
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {syncing ? t("syncing") : t("sync")}
            </span>
          </Button>

          {/* Back-Office Portal Link for Superadmins */}
          {currentUser?.role === "superadmin" && (
            <Link
              href="/backoffice"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-all shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-foreground" />
              <span>{t("backofficeBtn")}</span>
            </Link>
          )}

          {/* User Profile & Logout Button */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-border rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
              <div className="hidden sm:flex flex-col text-end rtl:text-start leading-tight">
                <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                  {currentUser.display_name || currentUser.username}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {currentUser.role === "superadmin"
                    ? t("roleSuperadmin")
                    : t("roleTenant")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title={t("logoutButton")}
                className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
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
          onBack={() => setSelectedShortcode(null)}
          onSaveSuccess={(updated) => {
            setPosts((prev) =>
              prev.map((p) => (p.shortcode === updated.shortcode ? updated : p))
            );
          }}
          onOpenLogs={(sc) => setLogsShortcode(sc)}
        />
      ) : (
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
          {/* Account Meta & KPI Metrics Strip */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile?.avatar_url || "/media/avatar.jpg"}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border border-border bg-secondary"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                  }}
                />
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

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t("liveSession")}</span>
                </span>
              </div>
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

          {/* Search & Tabs Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
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

            {/* Filter Tabs */}
            <div className="flex items-center p-0.5 rounded-lg border border-border bg-secondary overflow-x-auto text-xs">
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
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap text-xs font-medium transition-colors cursor-pointer ${
                    filterTab === tab.id
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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
                    onClick={() => setSelectedShortcode(p.shortcode)}
                    className="group rounded-xl border border-border bg-card hover:border-zinc-300 hover:shadow-xs transition-all p-3.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Media Thumb */}
                      <div className="relative w-14 h-18 sm:w-16 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-secondary border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg"}
                          alt="Thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80";
                          }}
                        />
                        <span className="absolute bottom-1 end-1 px-1 py-0.2 rounded text-[9px] font-mono bg-black/60 text-white">
                          {isReel ? "REEL" : "POST"}
                        </span>
                      </div>

                      {/* Content Snippet */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {p.shortcode}
                          </span>
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-zinc-300"
                            }`}
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
                          className={`text-xs font-semibold ${
                            isActive ? "text-emerald-700" : "text-muted-foreground"
                          }`}
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
                    onClick={() => setSelectedShortcode(p.shortcode)}
                    className="group rounded-xl border border-border bg-card hover:border-zinc-300 hover:shadow-xs transition-all overflow-hidden cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-4/5 bg-secondary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg"}
                        alt="Thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80";
                        }}
                      />
                      <span className="absolute top-2 start-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-white">
                        {isReel ? "REEL" : "POST"}
                      </span>
                      <div className="absolute top-2 end-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleQuickToggle(p.shortcode, e)}
                          className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-transform ${
                            isActive
                              ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                              : "bg-zinc-300"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-foreground">
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
                          className={`font-semibold ${
                            isActive ? "text-emerald-700" : "text-muted-foreground"
                          }`}
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

      {/* Add Post Modal */}
      <AddPostModal
        open={addPostOpen}
        accountUsername={currentAccount}
        onClose={() => setAddPostOpen(false)}
        onCreated={() => fetchPosts(currentAccount)}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onCreated={(username) => {
          fetchAccounts();
          setCurrentAccount(username);
        }}
      />
    </div>
  );
}
