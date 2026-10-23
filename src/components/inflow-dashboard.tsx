"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { toast } from "@/components/ui/sonner";
import { I18N, Lang, formatNumber as formatNumberI18n } from "@/lib/i18n";
import type { AccountRow, PostRow, BotStatus } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { StoriesSection } from "./stories-section";
import { PostPlaybookDrawer, type DrawerPostData } from "./post-playbook-drawer";
import {
  getPlaybookById,
  normalizePersona,
  PERSONA_META,
  type AccountPersona,
} from "@/lib/playbooks";

const PERSONA_ORDER: AccountPersona[] = ["ecommerce", "service_b2b", "creator"];
const PERSONA_TAB_KEY: Record<AccountPersona, string> = {
  ecommerce: "personaEcommerce",
  service_b2b: "personaServiceB2b",
  creator: "personaCreator",
};
const PERSONA_STUDIO_KEY: Record<AccountPersona, string> = {
  ecommerce: "personaEcommerceStudio",
  service_b2b: "personaServiceB2bStudio",
  creator: "personaCreatorStudio",
};

function getProxiedImageUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  let cleanUrl = rawUrl.trim();
  while (cleanUrl.startsWith("/api/media/proxy?url=") || cleanUrl.startsWith("/api/image-proxy?url=")) {
    const splitIndex = cleanUrl.indexOf("url=");
    if (splitIndex !== -1) {
      cleanUrl = decodeURIComponent(cleanUrl.slice(splitIndex + 4));
    } else {
      break;
    }
  }
  return `/api/media/proxy?url=${encodeURIComponent(cleanUrl)}`;
}
const PERSONA_STYLE: Record<
  AccountPersona,
  { badge: string; active: string; action: string }
> = {
  ecommerce: {
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    active: "bg-indigo-600 text-white shadow-xs",
    action: "border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100",
  },
  service_b2b: {
    badge: "bg-teal-50 text-teal-700 border border-teal-200",
    active: "bg-teal-600 text-white shadow-xs",
    action: "border-teal-200 bg-teal-50/80 text-teal-700 hover:bg-teal-100",
  },
  creator: {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    active: "bg-rose-600 text-white shadow-xs",
    action: "border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100",
  },
};
import { LogsModal } from "./modals/logs-modal";
import { DeleteAccountModal } from "./modals/delete-account-modal";
import { useWorkspace } from "@/components/layout/workspace-context";
import { cn } from "@/lib/utils";

const EMPTY_ACCOUNTS: AccountRow[] = [];
const EMPTY_POSTS: PostRow[] = [];

export interface InflowDashboardProps {
  currentUser?: SafeUser | null;
  initialAccount?: string;
  initialProfile?: AccountRow | null;
  initialPosts?: PostRow[];
  initialAccounts?: AccountRow[];
  initialSelectedShortcode?: string | null;
  embeddedInShell?: boolean;
}

export function InflowDashboard({
  currentUser: propUser,
  initialAccount = "",
  initialProfile = null,
  initialPosts = EMPTY_POSTS,
  initialAccounts = EMPTY_ACCOUNTS,
  initialSelectedShortcode = null,
  embeddedInShell = false,
}: InflowDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const workspace = useWorkspace();

  const currentUser = workspace ? workspace.currentUser : propUser;
  const [internalLang, setInternalLang] = useState<Lang>("fa");
  const lang = workspace ? workspace.lang : internalLang;
  const setLang = (l: Lang) => {
    if (workspace) {
      workspace.setLang(l);
    } else {
      setInternalLang(l);
    }
  };
  const [accounts, setAccounts] = useState<AccountRow[]>(
    workspace?.accounts && workspace.accounts.length > 0 ? workspace.accounts : initialAccounts
  );
  const [currentAccount, setCurrentAccount] = useState<string>(
    workspace?.account || initialAccount || (initialAccounts.length > 0 ? initialAccounts[0].username : "")
  );
  const [profile, setProfile] = useState<AccountRow | null>(
    workspace?.profile || initialProfile
  );
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
  const [viewMode, setViewMode] = useState<"cards" | "grid">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;

  // Selected post for detail configuration screen
  const [selectedShortcode, setSelectedShortcode] = useState<string | null>(
    initialSelectedShortcode || null
  );

  // Modals & Slide-Over Playbook Drawer (Spec 018)
  const [logsShortcode, setLogsShortcode] = useState<string | null>(null);
  const [drawerShortcode, setDrawerShortcode] = useState<string | null>(
    initialSelectedShortcode || null
  );
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Spec 018: Persona, Brand Cheat Sheet & Live SocialAPI Insights
  const [accountPersona, setAccountPersona] = useState<AccountPersona>(
    normalizePersona(initialProfile?.account_persona)
  );
  const [brandCheatSheet, setBrandCheatSheet] = useState<string>(
    initialProfile?.brand_cheat_sheet || ""
  );
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    initialProfile?.website_url || ""
  );
  const [brandSheetOpen, setBrandSheetOpen] = useState(false);
  const [savingBrandSheet, setSavingBrandSheet] = useState(false);
  const [liveInsights, setLiveInsights] = useState<{
    funnel?: {
      views: number;
      reach: number;
      saves: number;
      shares: number;
      avg_skip_rate: number | null;
      total_comments: number;
      comment_replies_sent: number;
      total_dms_sent: number;
      dms_read: number;
      story_replies: number;
      follows_gained: number;
      pending_follow: number;
    };
    stories?: Array<Record<string, unknown>>;
    post_metrics?: Record<string, Record<string, unknown>>;
  } | null>(null);

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

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const formatNumber = (n: number | string | undefined | null) =>
    workspace ? workspace.formatNumber(n) : formatNumberI18n(n, lang);

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
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Synchronize state with incoming props or workspace context changes
  useEffect(() => {
    if (workspace?.account && workspace.account !== currentAccount) {
      setCurrentAccount(workspace.account);
    }
  }, [workspace?.account, currentAccount]);

  useEffect(() => {
    if (workspace?.profile) {
      setProfile(workspace.profile);
    } else if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [workspace?.profile, initialProfile]);

  useEffect(() => {
    if (workspace?.accounts && workspace.accounts.length > 0) {
      setAccounts(workspace.accounts);
    }
  }, [workspace?.accounts]);

  useEffect(() => {
    if (initialPosts) {
      setPosts(initialPosts);
    }
  }, [initialPosts]);

  // Fetch accounts list only when standalone (NOT embeddedInShell)
  const fetchAccountsCalledRef = React.useRef(false);
  useEffect(() => {
    if (embeddedInShell) return;
    if (initialAccounts.length === 0 && !fetchAccountsCalledRef.current) {
      fetchAccountsCalledRef.current = true;
      fetchAccounts();
    }
  }, [embeddedInShell, initialAccounts.length, fetchAccounts]);

  // Fetch posts only when standalone (NOT embeddedInShell) and profile missing
  useEffect(() => {
    if (embeddedInShell) return;
    if (currentAccount && (!profile || profile.username !== currentAccount)) {
      fetchPosts(currentAccount, false);
    }
  }, [embeddedInShell, currentAccount, profile, fetchPosts]);

  // Synchronize route prop with selectedShortcode state
  useEffect(() => {
    if (initialSelectedShortcode !== undefined) {
      setSelectedShortcode(initialSelectedShortcode || null);
    }
  }, [initialSelectedShortcode]);

  // Migrate legacy query parameter to clean route (e.g. ?post=... -> /comments/...)
  useEffect(() => {
    if (postParam && !initialSelectedShortcode && currentAccount) {
      router.replace(`/@${currentAccount}/comments/${postParam}`);
    }
  }, [postParam, initialSelectedShortcode, currentAccount, router]);

  // Navigation handlers that update browser history and URL
  const handleSelectPost = (shortcode: string) => {
    setSelectedShortcode(shortcode);
    router.push(`/@${currentAccount}/comments/${shortcode}`);
  };

  const handleBackToList = () => {
    setSelectedShortcode(null);
    router.push(`/@${currentAccount}/comments`);
  };

  const handleSelectAccount = (username: string) => {
    setSelectedShortcode(null);
    router.push(`/@${username}/comments`);
  };

  // Native Sync action
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
        toast.success(data.message || t("syncSuccess") || "همگام‌سازی با موفقیت انجام شد");
        await fetchPosts(currentAccount);
        await fetchAccounts();
      } else {
        toast.error(data.error || "خطا در همگام‌سازی پست‌ها");
      }
    } catch {
      toast.error("خطای شبکه هنگام ارتباط با سرور");
    } finally {
      setSyncing(false);
    }
  };

  // Quick toggle on master switch from card
  const handleQuickToggle = async (shortcode: string, e?: React.MouseEvent | boolean) => {
    if (e && typeof e === "object" && "stopPropagation" in e) {
      e.stopPropagation();
    }
    const target = posts.find((p) => p.shortcode === shortcode);
    if (!target) return;
    const nextState = typeof e === "boolean" ? e : target.auto_reply !== 1;

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

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, currentPage, PAGE_SIZE]);

  // Selected post for detail view
  const activeDetailPost = useMemo(() => {
    return posts.find((p) => p.shortcode === selectedShortcode) || null;
  }, [posts, selectedShortcode]);

  // Selected post for logs modal
  const activeLogPost = useMemo(() => {
    return posts.find((p) => p.shortcode === logsShortcode) || null;
  }, [posts, logsShortcode]);

  // Selected post for Slide-Over Playbook Drawer (Spec 018)
  const activeDrawerPost = useMemo(() => {
    return (posts.find((p) => p.shortcode === drawerShortcode) as unknown as DrawerPostData) || null;
  }, [posts, drawerShortcode]);

  // Sync Persona & Brand Cheat Sheet when profile changes
  useEffect(() => {
    if (profile) {
      if (profile.account_persona) {
        setAccountPersona(normalizePersona(profile.account_persona));
      }
      if (typeof profile.brand_cheat_sheet === "string") {
        setBrandCheatSheet(profile.brand_cheat_sheet);
      }
      if (typeof profile.website_url === "string") {
        setWebsiteUrl(profile.website_url);
      }
    }
  }, [profile]);

  // Fetch Zero-Credit SocialAPI Insights & ROI Funnel (Spec 018)
  const fetchLiveInsights = useCallback(async (account: string, force = false) => {
    if (!account) return;
    try {
      const res = await fetch(
        `/api/accounts/${encodeURIComponent(account)}/insights${force ? "?refresh=1" : ""}`
      );
      const data = await res.json();
      if (data.success) {
        setLiveInsights({
          funnel: data.funnel,
          stories: data.stories || [],
          post_metrics: data.post_metrics || {},
        });
        if (data.account) {
          setAccountPersona(normalizePersona(data.account.account_persona));
          setBrandCheatSheet(data.account.brand_cheat_sheet || "");
          setWebsiteUrl(data.account.website_url || "");
        }
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    if (currentAccount) {
      fetchLiveInsights(currentAccount, false);
    }
  }, [currentAccount, fetchLiveInsights]);

  const handleSwitchPersona = async (nextPersona: AccountPersona) => {
    setAccountPersona(nextPersona);
    if (!currentAccount) return;
    try {
      await fetch(`/api/accounts/${encodeURIComponent(currentAccount)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_persona: nextPersona }),
      });
      toast.success(
        nextPersona === "creator"
          ? "حالت استودیو روی «کریتور و بلاگر» تنظیم شد 🎥"
          : "حالت استودیو روی «فروشگاه و بیزینس» تنظیم شد 🛍️"
      );
    } catch {
      // ignore
    }
  };

  const handleSaveBrandCheatSheet = async () => {
    if (!currentAccount) return;
    setSavingBrandSheet(true);
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(currentAccount)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_persona: accountPersona,
          brand_cheat_sheet: brandCheatSheet,
          website_url: websiteUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تقلب‌نامه کلی پیج و لینک سایت ذخیره شد ✓");
        setBrandSheetOpen(false);
      }
    } finally {
      setSavingBrandSheet(false);
    }
  };

  // Metrics
  const activeCount = posts.filter((p) => p.auto_reply === 1).length;
  const configuredCount = posts.filter(
    (p) =>
      p.auto_reply === 1 &&
      (p.comment_action_type !== "none" || p.dm_action_type !== "none")
  ).length;
  const cheatSheetCount = posts.filter((p) => (p.cheat_sheet || "").trim().length > 0).length;

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="space-y-6">
            {/* Studio Account Command Bar, Adaptive Persona Switcher & True ROI Funnel (Spec 018) */}
            <div className="rounded-3xl border border-outline-variant bg-surface-container-low p-5 sm:p-6 space-y-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || currentAccount}
                      className="w-13 h-13 rounded-2xl object-cover border border-outline-variant bg-surface-container shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-2xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-sm font-bold font-mono text-foreground shrink-0 shadow-2xs">
                      {(currentAccount || "IN").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-bold text-foreground truncate">
                        {profile?.display_name || currentAccount}
                      </h1>
                      <span className="text-xs font-mono text-muted-foreground bg-surface-container-high px-2 py-0.5 rounded-full border border-outline-variant/60">
                        <bdi>@{currentAccount}</bdi>
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors",
                          PERSONA_STYLE[accountPersona].badge
                        )}
                      >
                        <span aria-hidden="true">{PERSONA_META[accountPersona].emoji}</span>
                        <span>{t(PERSONA_STUDIO_KEY[accountPersona])}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-xl">
                      {profile?.bio || "سیستم‌عامل هوشمند تبدیل کامنت و دایرکت به فروش و فالوور"}
                    </p>
                  </div>
                </div>

                {/* Adaptive Persona Switcher + Brand Cheat Sheet */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Triple-Persona Switcher (Spec 019) */}
                  <div className="inline-flex items-center p-1 rounded-full bg-surface-container-high border border-outline-variant/60 shadow-2xs">
                    {PERSONA_ORDER.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSwitchPersona(p)}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                          accountPersona === p
                            ? PERSONA_STYLE[p].active
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-container-highest"
                        )}
                      >
                        <span aria-hidden="true">{PERSONA_META[p].emoji}</span>
                        <span>{t(PERSONA_TAB_KEY[p])}</span>
                      </button>
                    ))}
                  </div>

                  {/* Brand Cheat Sheet Toggle */}
                  <button
                    type="button"
                    onClick={() => setBrandSheetOpen(!brandSheetOpen)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs",
                      brandSheetOpen
                        ? "bg-primary text-on-primary border-primary shadow-xs"
                        : brandCheatSheet.trim()
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                        : "bg-surface text-foreground border-outline-variant hover:bg-surface-container"
                    )}
                  >
                    <MaterialSymbol name="description" size={16} />
                    <span>تقلب‌نامه کلی پیج</span>
                    {brandCheatSheet.trim() && !brandSheetOpen && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Account-Level Brand Cheat Sheet Drawer */}
              {brandSheetOpen && (
                <div className="pt-4 border-t border-outline-variant/60 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MaterialSymbol name="description" size={18} className="text-primary" />
                        <span>
                          {t("brandMemoryTitle")}
                        </span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        اطلاعات ثابتی که در کپشن‌ها نمی‌نویسید (مثل هزینه و زمان ارسال، شرایط تعویض، آدرس، لینک سایت یا معرفی خودتان) را یک بار اینجا بنویسید تا دستیار هوش مصنوعی همیشه بداند.
                      </p>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={brandCheatSheet}
                    onChange={(e) => setBrandCheatSheet(e.target.value)}
                    placeholder={PERSONA_META[accountPersona].brandSheetPlaceholder}
                    className="w-full rounded-2xl border border-outline-variant bg-surface p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <MaterialSymbol name="link" size={18} className="text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        dir="ltr"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://your-site.ir (وب‌سایت یا لینک اصلی پیج)"
                        className="w-full rounded-full border border-outline-variant bg-surface px-4 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBrandSheetOpen(false)}
                        className="text-xs"
                      >
                        {t("close")}
                      </Button>
                      <Button
                        type="button"
                        variant="filled"
                        size="sm"
                        disabled={savingBrandSheet}
                        onClick={handleSaveBrandCheatSheet}
                        className="text-xs font-bold gap-1.5"
                      >
                        {savingBrandSheet && <MaterialSymbol name="progress_activity" size={16} className="animate-spin" />}
                        <span>{savingBrandSheet ? t("savingBrandMemory") : t("saveBrandMemory")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Material You 4-Stage Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Views */}
              <div className="rounded-[28px] border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant">۱. {t("metricTotalViews")}</span>
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface shadow-2xs">
                    <MaterialSymbol name="visibility" size={20} fill />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tabular-nums text-on-surface tracking-tight">
                    {formatNumber(liveInsights?.funnel?.views || 0)}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
                  <span>{t("metricReach")}</span>
                  <span className="font-bold text-on-surface">
                    {formatNumber(liveInsights?.funnel?.reach || 0)}
                  </span>
                </div>
              </div>

              {/* Card 2: Comments & Replies */}
              <div className="rounded-[28px] border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant">۲. {t("metricComments")}</span>
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-2xs">
                    <MaterialSymbol name="chat_bubble" size={20} fill />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tabular-nums text-on-surface tracking-tight">
                    {formatNumber(
                      liveInsights?.funnel?.total_comments ??
                        posts.reduce(
                          (acc, p) =>
                            acc + Number((p as unknown as { logs_count: number }).logs_count || 0),
                          0
                        )
                    )}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
                  <span>{t("metricPublicReplies")}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                    {formatNumber(liveInsights?.funnel?.comment_replies_sent || 0)}
                  </span>
                </div>
              </div>

              {/* Card 3: Smart DMs */}
              <div className="rounded-[28px] border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant">۳. {t("metricSmartDms")}</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                    <MaterialSymbol name="send" size={20} fill />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {formatNumber(liveInsights?.funnel?.total_dms_sent || 0)}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
                  <span>{t("metricRead")}</span>
                  <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <span>{formatNumber(liveInsights?.funnel?.dms_read || 0)}</span>
                    <MaterialSymbol name="done_all" size={14} className="text-primary shrink-0" />
                  </span>
                </div>
              </div>

              {/* Card 4: Leads & Followers */}
              <div className="rounded-[28px] border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant">۴. {t("metricFollowersLeads")}</span>
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs">
                    <MaterialSymbol name="person_check" size={20} fill />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tabular-nums text-rose-600 dark:text-rose-400 tracking-tight">
                    <bdi>+{formatNumber(liveInsights?.funnel?.follows_gained || 0)}</bdi>
                  </span>
                </div>
                <div className="pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
                  <span>{t("metricActivePosts")}</span>
                  <span className="font-bold text-on-surface">
                    {formatNumber(activeCount)}{" "}
                    <span className="text-on-surface-variant font-normal">
                      ({formatNumber(cheatSheetCount)} {t("metricCheatSheets")})
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Active 24h Stories section (Spec 021) */}
            <StoriesSection accountUsername={currentAccount} />

            {/* Search, Filter Tabs & View Mode Toolbar */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Search Input & Manual Sync Button */}
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    icon={<MaterialSymbol name="search" size={18} className="text-muted-foreground" />}
                    className="h-10 text-xs rounded-full"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="h-10 px-4 gap-2 text-xs font-medium cursor-pointer shrink-0 rounded-full"
                  title="همگام‌سازی آخرین ریلزها و پست‌ها از اینستاگرام"
                >
                  <MaterialSymbol name="sync" size={18} className={cn("text-primary", syncing && "animate-spin")} />
                  <span>{syncing ? "در حال دریافت..." : "همگام‌سازی دستی ریلزها"}</span>
                </Button>
              </div>

              {/* View Mode & Filter Tabs (M3 Filter Chips & Segmented Buttons) */}
              <div className="flex items-center gap-2 shrink-0 justify-between lg:justify-end">
                <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-full border border-outline-variant/60">
                  {(["all", "active", "inactive", "reels", "posts"] as const).map((tabKey) => {
                    const isSelected = filterTab === tabKey;
                    const labels: Record<string, string> = {
                      all: t("filterAll"),
                      active: t("filterActive"),
                      inactive: t("filterInactive"),
                      reels: t("filterReels"),
                      posts: t("filterPosts"),
                    };
                    return (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => setFilterTab(tabKey)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                          isSelected
                            ? "bg-surface text-foreground shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-container-highest"
                        )}
                      >
                        {labels[tabKey]}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-full border border-outline-variant/60">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={cn(
                      "p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center",
                      viewMode === "cards"
                        ? "bg-surface text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={t("viewCards")}
                  >
                    <MaterialSymbol name="view_list" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center",
                      viewMode === "grid"
                        ? "bg-surface text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={t("viewGrid")}
                  >
                    <MaterialSymbol name="grid_view" size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Post Feed */}
            {posts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-outline-variant bg-surface p-12 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant flex items-center justify-center mx-auto text-muted-foreground shadow-2xs">
                  <MaterialSymbol name="sync" size={28} className="text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    {t("postsNotSyncedYet")}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {t("syncPostsSubtitle") || "پست‌ها و ریلزهای پیج هنوز دریافت نشده‌اند. با کلیک بر روی دکمه زیر، پست‌ها و ریلزها مستقیماً از اینستاگرام واکشی می‌شوند."}
                  </p>
                </div>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  size="sm"
                  variant="filled"
                  className="gap-2 cursor-pointer rounded-full text-xs font-bold"
                >
                  <MaterialSymbol name="sync" size={18} className={cn(syncing && "animate-spin")} />
                  <span>{syncing ? t("syncingPostsWithInstagram") : t("syncPostsWithInstagram")}</span>
                </Button>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-outline-variant bg-surface p-12 text-center space-y-3 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant flex items-center justify-center mx-auto text-muted-foreground shadow-2xs">
                  <MaterialSymbol name="folder_open" size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("noPostsFound")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    فیلتر یا عبارت جستجوی دیگری را امتحان کنید.
                  </p>
                </div>
              </div>
            ) : viewMode === "cards" ? (
              <div className="space-y-3.5">
                {paginatedPosts.map((post) => {
                  const isActive = post.auto_reply === 1;
                  const pbPreset = getPlaybookById(post.playbook_id);
                  const hasCheatSheet = Boolean((post.cheat_sheet || "").trim());
                  const hasTargetUrl = Boolean((post.target_url || "").trim());
                  const pMetrics =
                    liveInsights?.post_metrics?.[post.shortcode] ||
                    (() => {
                      if (!post.metrics_json) return {};
                      try {
                        return JSON.parse(post.metrics_json);
                      } catch {
                        return {};
                      }
                    })();
                  const pViews = Number(pMetrics.views || pMetrics.plays || 0);
                  const pFollows = Number(pMetrics.follows || 0);
                  const pLogsCount = Number(
                    (post as unknown as { logs_count?: number }).logs_count || 0
                  );
                  const pDmsCount = Number(
                    (post as unknown as { dms_count?: number }).dms_count || 0
                  );

                  return (
                    <div
                      key={post.id}
                      onClick={() => setDrawerShortcode(post.shortcode)}
                      className={cn(
                        "group rounded-[28px] border p-5 transition-all duration-200 cursor-pointer flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-surface-container-lowest shadow-xs hover:shadow-md",
                        isActive
                          ? "border-emerald-500/40 hover:border-emerald-500/70"
                          : "border-outline-variant/40 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/70 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                          {post.post_type === "reel" ? (
                            <MaterialSymbol name="movie" size={24} />
                          ) : (
                            <MaterialSymbol name="image" size={24} />
                          )}
                          {post.thumbnail_url && (
                            <img
                              src={getProxiedImageUrl(post.thumbnail_url)}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-foreground">
                              {post.shortcode}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {post.post_type === "reel" ? `🎬 ${t("postTypeReel")}` : `🖼️ ${t("postTypePost")}`}
                            </Badge>
                            {pbPreset && (
                              <span
                                className={cn(
                                  "text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1",
                                  PERSONA_STYLE[pbPreset.persona].badge
                                )}
                              >
                                <span>{pbPreset.emoji}</span>
                                <span>{pbPreset.title}</span>
                              </span>
                            )}
                            {hasCheatSheet && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
                                <MaterialSymbol name="description" size={12} />
                                <span>{t("badgeHasCheatSheet")}</span>
                              </span>
                            )}
                            {hasTargetUrl && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-foreground border border-outline-variant/60 inline-flex items-center gap-1">
                                <MaterialSymbol name="link" size={12} />
                                <span>{t("badgeTargetLink")}</span>
                              </span>
                            )}
                            {post.smart_moderation === 1 && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 inline-flex items-center gap-1">
                                <MaterialSymbol name="security" size={12} />
                                <span>{t("badgeSpamShield")}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {post.caption || t("noCaption")}
                          </p>

                          {/* Mini Funnel Metrics Row on Card */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            {pViews > 0 && (
                              <span className="inline-flex items-center gap-1 tabular-nums font-medium">
                                <MaterialSymbol name="visibility" size={14} className="text-muted-foreground" />
                                {formatNumber(pViews)} {t("viewsLabel")}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 tabular-nums font-medium">
                              <MaterialSymbol name="chat_bubble" size={14} className="text-primary" />
                              {formatNumber(pLogsCount)} {t("commentReplyLabel")}
                            </span>
                            <span className="inline-flex items-center gap-1 tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                              <MaterialSymbol name="send" size={14} className="text-emerald-600 dark:text-emerald-400" />
                              {formatNumber(pDmsCount)} {t("dmLabel")}
                            </span>
                            {pFollows > 0 && (
                              <span className="inline-flex items-center gap-1 tabular-nums text-rose-600 dark:text-rose-400 font-bold">
                                +{formatNumber(pFollows)} {t("followersLabel")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full pt-3 mt-2 border-t border-outline-variant/60 flex items-center justify-between gap-2.5 lg:w-auto lg:pt-0 lg:mt-0 lg:border-0 lg:justify-end shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerShortcode(post.shortcode);
                          }}
                          className={cn(
                            "text-xs font-bold flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer shadow-2xs",
                            PERSONA_STYLE[accountPersona].action
                          )}
                        >
                          <MaterialSymbol name="bolt" size={16} />
                          <span>{t("btnConfigureScenario")}</span>
                        </button>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 ps-1"
                        >
                          <span className="text-[11px] font-bold text-muted-foreground lg:hidden">
                            {isActive ? t("drawerStatusActive") : t("drawerStatusInactive")}
                          </span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => handleQuickToggle(post.shortcode, checked)}
                            className="cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedPosts.map((post) => {
                  const isActive = post.auto_reply === 1;
                  const pbPreset = getPlaybookById(post.playbook_id);
                  const hasCheatSheet = Boolean((post.cheat_sheet || "").trim());
                  const logsCount = Number(
                    (post as unknown as { logs_count: number }).logs_count || 0
                  );
                  const pm = liveInsights?.post_metrics?.[post.shortcode];
                  const viewsCount = Number(pm?.views || pm?.play_count || 0);
                  const dmsSentCount = Number(pm?.dms_sent || 0);

                  return (
                    <div
                      key={post.id}
                      onClick={() => setDrawerShortcode(post.shortcode)}
                      className={cn(
                        "group rounded-[28px] border bg-surface-container-lowest overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md",
                        isActive
                          ? "border-emerald-500/40 hover:border-emerald-500/70"
                          : "border-outline-variant/40 hover:border-primary/40"
                      )}
                    >
                      {/* Cover Media Area */}
                      <div className="aspect-[4/5] bg-surface-container relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
                          {post.post_type === "reel" ? (
                            <MaterialSymbol name="movie" size={36} />
                          ) : (
                            <MaterialSymbol name="image" size={36} />
                          )}
                        </div>
                        {post.thumbnail_url && (
                          <img
                            src={getProxiedImageUrl(post.thumbnail_url)}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        )}

                        {/* Top Overlay: Media Type & Instant Switch */}
                        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface/90 text-foreground backdrop-blur-md shadow-2xs border border-outline-variant/40">
                              {post.post_type === "reel" ? `🎬 ${t("postTypeReel")}` : `📷 ${t("postTypePost")}`}
                            </span>
                            {hasCheatSheet && (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600/90 text-white backdrop-blur-md shadow-2xs">
                                📝 {t("badgeHasCheatSheet")}
                              </span>
                            )}
                          </div>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-outline-variant/40"
                          >
                            <span
                              className={cn(
                                "text-[10px] font-bold",
                                isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                              )}
                            >
                              {isActive ? t("drawerStatusActive") : t("drawerStatusInactive")}
                            </span>
                            <Switch
                              checked={isActive}
                              onCheckedChange={(checked) =>
                                handleQuickToggle(post.shortcode, checked)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                        <div className="space-y-2">
                          <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed min-h-[2.5rem]">
                            {post.caption || "بدون متن کپشن (برای افزودن تقلب‌نامه و سناریوی فروش کلیک کنید)"}
                          </p>

                          {/* Active Playbook Indicator */}
                          {pbPreset ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                              <span>{pbPreset.emoji}</span>
                              <span className="truncate">{pbPreset.title}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-muted-foreground text-[11px] font-medium border border-outline-variant/60">
                              <span>⚡ سناریوی پیش‌فرض هوشمند</span>
                            </div>
                          )}
                        </div>

                        {/* Flat 3-Metric Strip + Action Button */}
                        <div className="pt-3 border-t border-outline-variant/60 space-y-3">
                          <div className="grid grid-cols-3 text-center divide-x divide-x-reverse divide-outline-variant/60 text-[11px]">
                            <div>
                              <div className="text-muted-foreground">{t("viewsLabel")}</div>
                              <div className="font-bold text-foreground tabular-nums mt-0.5">
                                {viewsCount > 0 ? formatNumber(viewsCount) : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">{t("commentReplyLabel")}</div>
                              <div className="font-bold text-foreground tabular-nums mt-0.5">
                                {formatNumber(logsCount)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">{t("dmLabel")}</div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                                {formatNumber(dmsSentCount)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerShortcode(post.shortcode);
                              }}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                                isActive
                                  ? "bg-primary text-on-primary hover:opacity-90"
                                  : "bg-surface-container-high text-foreground hover:bg-surface-container-highest border border-outline-variant/60"
                              )}
                            >
                              <MaterialSymbol name="auto_awesome" size={16} />
                              <span>
                                {isActive ? t("btnConfigureScenario") : t("btnQuickActivate")}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls (M3 Paged Navigation) */}
            {filteredPosts.length > PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-outline-variant/60 mt-6 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/80 shadow-2xs">
                <div className="text-xs text-muted-foreground">
                  نمایش{" "}
                  <span className="font-semibold text-foreground font-mono">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  تا{" "}
                  <span className="font-semibold text-foreground font-mono">
                    {Math.min(currentPage * PAGE_SIZE, filteredPosts.length)}
                  </span>{" "}
                  از{" "}
                  <span className="font-semibold text-foreground font-mono">
                    {filteredPosts.length}
                  </span>{" "}
                  پست و ریلز
                </div>

                <div className="flex items-center gap-1.5" dir="rtl">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5 cursor-pointer rounded-full"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 350, behavior: "smooth" });
                    }}
                    disabled={currentPage <= 1}
                  >
                    <MaterialSymbol name="chevron_right" size={16} rtlMirror />
                    <span className="hidden sm:inline">صفحه قبلی</span>
                  </Button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        return (
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 1
                        );
                      })
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-xs text-muted-foreground select-none"
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={`page-${p}`}
                            variant={currentPage === p ? "filled" : "outline"}
                            size="sm"
                            className="h-8 min-w-8 p-0 text-xs font-mono cursor-pointer rounded-full"
                            onClick={() => {
                              setCurrentPage(Number(p));
                              window.scrollTo({ top: 350, behavior: "smooth" });
                            }}
                          >
                            {p}
                          </Button>
                        )
                      )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5 cursor-pointer rounded-full"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 350, behavior: "smooth" });
                    }}
                    disabled={currentPage >= totalPages}
                  >
                    <span className="hidden sm:inline">صفحه بعدی</span>
                    <MaterialSymbol name="chevron_left" size={16} rtlMirror />
                  </Button>
                </div>
              </div>
            )}
          </div>

        {/* 1-Click Slide-Over Playbook & Cheat Sheet Drawer (Spec 018) */}
        {drawerShortcode && activeDrawerPost && (
          <PostPlaybookDrawer
            post={activeDrawerPost}
            persona={accountPersona}
            accountUsername={currentAccount}
            postMetrics={
              drawerShortcode ? liveInsights?.post_metrics?.[drawerShortcode] : undefined
            }
            onClose={() => setDrawerShortcode(null)}
            onSaved={(updatedPost) => {
              setPosts((prev) =>
                prev.map((p) =>
                  p.shortcode === updatedPost.shortcode
                    ? ({ ...p, ...updatedPost } as unknown as PostRow)
                    : p
                )
              );
            }}
          />
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

        {/* Delete Account Modal */}
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
