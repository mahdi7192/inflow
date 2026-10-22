"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
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
  RotateCw,
  Eye,
  FileText,
  ShieldCheck,
  Zap,
  Flame,
  CheckCircle2,
  CheckCheck,
  Link2,
  Film,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Badge, Switch, Input } from "@/components/ui/primitives";
import { I18N, Lang, formatNumber as formatNumberI18n } from "@/lib/i18n";
import type { AccountRow, PostRow, BotStatus } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
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
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || currentAccount}
                      className="w-13 h-13 rounded-2xl object-cover border border-slate-200 bg-slate-100"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold font-mono text-slate-600 shrink-0">
                      {(currentAccount || "IN").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-bold text-slate-900">
                        {profile?.display_name || currentAccount}
                      </h1>
                      <span className="text-xs font-mono text-slate-500">
                        <bdi>@{currentAccount}</bdi>
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-0.5 rounded-full",
                          PERSONA_STYLE[accountPersona].badge
                        )}
                      >
                        {PERSONA_META[accountPersona].emoji} {t(PERSONA_STUDIO_KEY[accountPersona])}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {profile?.bio || "سیستم‌عامل هوشمند تبدیل کامنت و دایرکت به فروش و فالوور"}
                    </p>
                  </div>
                </div>

                {/* Adaptive Persona Switcher + Brand Cheat Sheet + Sync */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Triple-Persona Switcher (Spec 019) */}
                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                    {PERSONA_ORDER.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSwitchPersona(p)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          accountPersona === p
                            ? PERSONA_STYLE[p].active
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {PERSONA_META[p].emoji} {t(PERSONA_TAB_KEY[p])}
                      </button>
                    ))}
                  </div>

                  {/* Brand Cheat Sheet Toggle */}
                  <button
                    type="button"
                    onClick={() => setBrandSheetOpen(!brandSheetOpen)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      brandCheatSheet.trim()
                        ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>تقلب‌نامه کلی پیج</span>
                    {brandCheatSheet.trim() && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Account-Level Brand Cheat Sheet Drawer */}
              {brandSheetOpen && (
                <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>
                          {t("brandMemoryTitle")}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        اطلاعات ثابتی که در کپشن‌ها نمی‌نویسید (مثل هزینه و زمان ارسال، شرایط تعویض، آدرس، لینک سایت یا معرفی خودتان) را یک بار اینجا بنویسید تا دستیار هوش مصنوعی همیشه بداند.
                      </p>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={brandCheatSheet}
                    onChange={(e) => setBrandCheatSheet(e.target.value)}
                    placeholder={PERSONA_META[accountPersona].brandSheetPlaceholder}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        dir="ltr"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://your-site.ir (وب‌سایت یا لینک اصلی پیج)"
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setBrandSheetOpen(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        {t("close")}
                      </button>
                      <button
                        type="button"
                        disabled={savingBrandSheet}
                        onClick={handleSaveBrandCheatSheet}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingBrandSheet ? t("savingBrandMemory") : t("saveBrandMemory")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4-Stage True Revenue & Engagement Funnel Strip (Flat Borderless Ribbon — Zero Card-in-Card) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 pt-4 border-t border-slate-100 lg:divide-x lg:divide-x-reverse lg:divide-slate-100">
                <div className="lg:ps-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">1. {t("metricTotalViews")}</span>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xl font-bold tabular-nums text-slate-900">
                      {formatNumber(liveInsights?.funnel?.views || 0)}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {t("metricReach")}: {formatNumber(liveInsights?.funnel?.reach || 0)}
                    </span>
                  </div>
                </div>

                <div className="lg:px-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">2. {t("metricComments")}</span>
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xl font-bold tabular-nums text-slate-900">
                      {formatNumber(
                        liveInsights?.funnel?.total_comments ??
                          posts.reduce(
                            (acc, p) =>
                              acc + Number((p as unknown as { logs_count: number }).logs_count || 0),
                            0
                          )
                      )}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium tabular-nums">
                      {formatNumber(liveInsights?.funnel?.comment_replies_sent || 0)} {t("metricPublicReplies")}
                    </span>
                  </div>
                </div>

                <div className="lg:px-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">3. {t("metricSmartDms")}</span>
                    <Send className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xl font-bold tabular-nums text-emerald-700">
                      {formatNumber(liveInsights?.funnel?.total_dms_sent || 0)}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium tabular-nums inline-flex items-center gap-1">
                      <span>{formatNumber(liveInsights?.funnel?.dms_read || 0)}</span>
                      <span>{t("metricRead")}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    </span>
                  </div>
                </div>

                <div className="lg:pe-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">4. {t("metricFollowersLeads")}</span>
                    <UserCheck className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xl font-bold tabular-nums text-rose-600">
                      +{formatNumber(liveInsights?.funnel?.follows_gained || 0)}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium tabular-nums">
                      {formatNumber(activeCount)} {t("metricActivePosts")} ({formatNumber(cheatSheetCount)} {t("metricCheatSheets")})
                    </span>
                  </div>
                </div>
              </div>

              {/* Active 24h Stories Strip (if account has live stories) */}
              {liveInsights?.stories && liveInsights.stories.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-3 overflow-x-auto">
                  <span className="text-[11px] font-bold text-rose-600 shrink-0 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    استوری‌های زنده ۲۴ ساعت اخیر ({liveInsights.stories.length}):
                  </span>
                  <div className="flex items-center gap-2">
                    {liveInsights.stories.slice(0, 8).map((st, idx) => {
                      const thumb = String(st.thumbnail_url || st.media_url || "");
                      return (
                        <div
                          key={String(st.id || idx)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/70 border border-rose-200 text-[11px] text-rose-900 shrink-0"
                        >
                          {thumb && (
                            <img
                              src={thumb}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          )}
                          <span>استوری #{idx + 1}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            پاسخگوی خودکار فعال
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Search, Filter Tabs & View Mode Toolbar */}
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

              {/* View Mode & Filter Tabs */}
              <div className="flex items-center gap-2 shrink-0 justify-between md:justify-end">
                <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      filterTab === "all"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("filterAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("active")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      filterTab === "active"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("filterActive")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("inactive")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      filterTab === "inactive"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("filterInactive")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("reels")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      filterTab === "reels"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("filterReels")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("posts")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      filterTab === "posts"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("filterPosts")}
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={cn(
                      "p-1 rounded-md transition-colors cursor-pointer",
                      viewMode === "cards"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={t("viewCards")}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1 rounded-md transition-colors cursor-pointer",
                      viewMode === "grid"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={t("viewGrid")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Post Feed */}
            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <RotateCw className="w-6 h-6 text-zinc-500" />
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
                  className="gap-2 cursor-pointer"
                >
                  <RotateCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                  <span>{syncing ? t("syncingPostsWithInstagram") : t("syncPostsWithInstagram")}</span>
                </Button>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <FolderOpen className="w-6 h-6" />
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
              <div className="space-y-3">
                {filteredPosts.map((post) => {
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
                        "group rounded-2xl border p-4 transition-all duration-150 cursor-pointer flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center",
                        isActive
                          ? "border-emerald-300/80 bg-white hover:border-emerald-400 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                      )}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          {post.post_type === "reel" ? (
                            <Film className="w-6 h-6" />
                          ) : (
                            <ImageIcon className="w-6 h-6" />
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
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {post.shortcode}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {post.post_type === "reel" ? `🎬 ${t("postTypeReel")}` : `🖼️ ${t("postTypePost")}`}
                            </Badge>
                            {pbPreset && (
                              <span
                                className={cn(
                                  "text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                  PERSONA_STYLE[pbPreset.persona].badge
                                )}
                              >
                                <span>{pbPreset.emoji}</span>
                                <span>{pbPreset.title}</span>
                              </span>
                            )}
                            {hasCheatSheet && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                <span>{t("badgeHasCheatSheet")}</span>
                              </span>
                            )}
                            {hasTargetUrl && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                <span>{t("badgeTargetLink")}</span>
                              </span>
                            )}
                            {post.smart_moderation === 1 && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{t("badgeSpamShield")}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-1">
                            {post.caption || t("noCaption")}
                          </p>

                          {/* Mini Funnel Metrics Row on Card */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-0.5">
                            {pViews > 0 && (
                              <span className="inline-flex items-center gap-1 tabular-nums font-medium">
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                {formatNumber(pViews)} {t("viewsLabel")}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 tabular-nums font-medium">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                              {formatNumber(pLogsCount)} {t("commentReplyLabel")}
                            </span>
                            <span className="inline-flex items-center gap-1 tabular-nums text-emerald-700 font-semibold">
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                              {formatNumber(pDmsCount)} {t("dmLabel")}
                            </span>
                            {pFollows > 0 && (
                              <span className="inline-flex items-center gap-1 tabular-nums text-rose-600 font-bold">
                                +{formatNumber(pFollows)} {t("followersLabel")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2 lg:w-auto lg:pt-0 lg:mt-0 lg:border-0 lg:justify-end shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerShortcode(post.shortcode);
                          }}
                          className={cn(
                            "text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                            PERSONA_STYLE[accountPersona].action
                          )}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{t("btnConfigureScenario")}</span>
                        </button>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 ps-1"
                        >
                          <span className="text-[11px] font-bold text-slate-500 lg:hidden">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPosts.map((post) => {
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
                        "group rounded-2xl border bg-white overflow-hidden transition-all cursor-pointer flex flex-col justify-between",
                        isActive
                          ? "border-emerald-300/90 shadow-xs"
                          : "border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                      )}
                    >
                      {/* Cover Media Area */}
                      <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                          {post.post_type === "reel" ? (
                            <Film className="w-8 h-8" />
                          ) : (
                            <ImageIcon className="w-8 h-8" />
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
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900/75 text-white backdrop-blur-md">
                              {post.post_type === "reel" ? `🎬 ${t("postTypeReel")}` : `📷 ${t("postTypePost")}`}
                            </span>
                            {hasCheatSheet && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-600/90 text-white backdrop-blur-md">
                                📝 {t("badgeHasCheatSheet")}
                              </span>
                            )}
                          </div>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-xs flex items-center gap-1.5"
                          >
                            <span
                              className={cn(
                                "text-[10px] font-bold",
                                isActive ? "text-emerald-700" : "text-slate-400"
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
                          <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed min-h-[2.5rem]">
                            {post.caption || "بدون متن کپشن (برای افزودن تقلب‌نامه و سناریوی فروش کلیک کنید)"}
                          </p>

                          {/* Active Playbook Indicator */}
                          {pbPreset ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                              <span>{pbPreset.emoji}</span>
                              <span className="truncate">{pbPreset.title}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-medium">
                              <span>⚡ سناریوی پیش‌فرض هوشمند</span>
                            </div>
                          )}
                        </div>

                        {/* Flat 3-Metric Strip + Action Button */}
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="grid grid-cols-3 text-center divide-x divide-x-reverse divide-slate-100 text-[11px]">
                            <div>
                              <div className="text-slate-400">{t("viewsLabel")}</div>
                              <div className="font-bold text-slate-800 tabular-nums mt-0.5">
                                {viewsCount > 0 ? formatNumber(viewsCount) : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">{t("commentReplyLabel")}</div>
                              <div className="font-bold text-slate-800 tabular-nums mt-0.5">
                                {formatNumber(logsCount)}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">{t("dmLabel")}</div>
                              <div className="font-bold text-emerald-700 tabular-nums mt-0.5">
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
                                "flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                                isActive
                                  ? "bg-slate-900 hover:bg-slate-800 text-white"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                              )}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
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
          </div>

        {/* 1-Click Slide-Over Playbook & Cheat Sheet Drawer (Spec 018) */}
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
