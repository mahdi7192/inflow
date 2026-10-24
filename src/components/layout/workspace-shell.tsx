"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/sidebar-nav";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { UnifiedStatusModal } from "@/components/layout/unified-status-modal";
import { SessionExpiryBanner } from "@/components/layout/session-expiry-banner";
import { AccountLoginDialog } from "@/components/auth/account-login-dialog";
import { Toaster, toast } from "@/components/ui/sonner";
import { DeleteAccountModal } from "@/components/modals/delete-account-modal";
import { WorkspaceProvider, useRequiredWorkspace } from "./workspace-context";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { BrandLogo } from "@/components/ui/brand-logo";
import { M3Switch } from "@/components/material/m3";
import type { AccountRow, SessionStatus } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";

type ConnectionHealth = "active" | "expired" | "invalid";

function getConnectionHealth(status: SessionStatus): ConnectionHealth {
  if (status === "active") return "active";
  if (status === "reauth_required" || status === "paused") return "expired";
  return "invalid";
}

const HEALTH_BADGE: Record<ConnectionHealth, { label: string; icon: string; className: string }> = {
  active: {
    label: "اتصال فعال",
    icon: "check_circle",
    className: "bg-secondary-container text-on-secondary-container",
  },
  expired: {
    label: "نشست منقضی",
    icon: "schedule",
    className: "bg-tertiary-container text-on-tertiary-container",
  },
  invalid: {
    label: "اتصال نامعتبر",
    icon: "error",
    className: "bg-error-container text-on-error-container",
  },
};

/* -------------------------------------------------------------------------- */
/* Account switcher (M3 menu anchored to a top-app-bar button)                 */
/* -------------------------------------------------------------------------- */

function AccountSwitcherMenu({
  account,
  accounts,
  profile,
  canAddAccount,
  onSelectAccount,
  onOpenAddAccount,
  onOpenDeleteAccount,
}: {
  account: string;
  accounts: AccountRow[];
  profile: AccountRow | null;
  canAddAccount: boolean;
  onSelectAccount: (username: string) => void;
  onOpenAddAccount: () => void;
  onOpenDeleteAccount: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="تغییر پیج فعال"
        className="h-10 ps-1 pe-3 inline-flex items-center gap-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
      >
        <span className="w-8 h-8 rounded-full overflow-hidden bg-primary-container text-on-primary-container flex items-center justify-center title-small uppercase shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            account.slice(0, 1)
          )}
        </span>
        <span className="hidden md:inline label-large max-w-[10rem] truncate" dir="ltr">
          <bdi>@{account}</bdi>
        </span>
        <MaterialSymbol
          name="arrow_drop_down"
          size={20}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="پیج‌های متصل"
          className="absolute top-full mt-2 start-0 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-surface-container-low text-on-surface elevation-2 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-4 py-2 flex items-center justify-between label-medium text-on-surface-variant">
            <span>پیج‌های متصل</span>
            <span className="label-small tabular-nums px-2 py-0.5 rounded-full bg-surface-container-high">
              {accounts.length}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {accounts.map((acc) => {
              const selected = acc.username === account;
              return (
                <button
                  key={acc.username}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => run(() => onSelectAccount(acc.username))}
                  className={cn(
                    "w-full h-12 px-4 flex items-center justify-between gap-3 text-start transition-colors cursor-pointer",
                    selected
                      ? "bg-secondary-container text-on-secondary-container"
                      : "hover:bg-on-surface/8"
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        acc.status === "paused" ? "bg-outline" : "bg-primary"
                      )}
                    />
                    <span className="body-medium truncate" dir="ltr">
                      <bdi>@{acc.username}</bdi>
                    </span>
                  </span>
                  {selected && <MaterialSymbol name="check" size={20} className="shrink-0" />}
                </button>
              );
            })}
          </div>

          <md-divider className="my-2" />

          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full h-12 px-4 flex items-center gap-3 body-medium hover:bg-on-surface/8 transition-colors cursor-pointer"
          >
            <MaterialSymbol name="grid_view" size={20} className="text-on-surface-variant" />
            <span>همه پیج‌ها</span>
          </Link>

          {canAddAccount && (
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onOpenAddAccount)}
              className="w-full h-12 px-4 flex items-center gap-3 body-medium text-primary hover:bg-primary/8 transition-colors cursor-pointer text-start"
            >
              <MaterialSymbol name="add" size={20} />
              <span>افزودن پیج</span>
            </button>
          )}

          <md-divider className="my-2" />

          <button
            type="button"
            role="menuitem"
            onClick={() => run(onOpenDeleteAccount)}
            className="w-full h-12 px-4 flex items-center gap-3 body-medium text-destructive hover:bg-destructive/8 transition-colors cursor-pointer text-start"
          >
            <MaterialSymbol name="delete" size={20} />
            <span>حذف حساب از سامانه</span>
          </button>
        </div>
      )}
    </div>
  );
}

export interface WorkspaceShellProps {
  children: React.ReactNode;
  initialAccount: string;
  initialProfile: AccountRow;
  initialAccounts: AccountRow[];
  currentUser: SafeUser | null;
}

function WorkspaceShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    account,
    accounts,
    profile,
    currentUser,
    lang,
    dir,
    setLang,
    t,
    updateAccountStatus,
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    isDirty,
    setPendingNavigation,
  } = useRequiredWorkspace();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isRail, setIsRail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Global shortcut for Search (⌘K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  // Read rail preference from localStorage
  useEffect(() => {
    try {
      const savedRail = localStorage.getItem("inflow_nav_rail");
      if (savedRail === "true") setIsRail(true);
    } catch {
      // ignore storage access errors
    }
  }, []);

  const toggleRail = () => {
    setIsRail((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("inflow_nav_rail", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Auxiliary modals
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);

  // Granular DM Automation status
  const [dmAutomationEnabled, setDmAutomationEnabled] = useState(true);
  const [loadingDm, setLoadingDm] = useState(false);

  // Session status from active profile
  const sessionStatus = profile?.session_status || "unauthenticated";
  const connectionHealth = getConnectionHealth(sessionStatus);
  const healthBadge = HEALTH_BADGE[connectionHealth];
  const automationRunning = (profile?.status || "active") !== "paused";

  // Fetch DM automation status on account change
  useEffect(() => {
    let cancelled = false;
    async function loadDmAutomation() {
      try {
        const res = await fetch(`/api/accounts/${encodeURIComponent(account)}/dm-automation`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.automation) {
            setDmAutomationEnabled(data.automation.enabled === 1);
          }
        }
      } catch {
        // ignore fetch error
      }
    }
    loadDmAutomation();
    return () => {
      cancelled = true;
    };
  }, [account]);

  const handleToggleDmAutomation = async (nextEnabled: boolean) => {
    setLoadingDm(true);
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(account)}/dm-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDmAutomationEnabled(nextEnabled);
        if (nextEnabled) {
          toast.success("پاسخگوی خودکار دایرکت فعال شد");
        } else {
          toast.warning("پاسخگوی خودکار دایرکت متوقف شد (تایید فالو کامنت‌ها فعال است)");
        }
      } else {
        toast.error(data.error || "خطا در تغییر وضعیت دایرکت");
      }
    } catch {
      toast.error("خطای شبکه در بروزرسانی تنظیمات دایرکت");
    } finally {
      setLoadingDm(false);
    }
  };

  // Derive active plugin from pathname
  const activePlugin = pathname.includes("/dms") ? "dms" : "comments";

  const handleSelectAccount = (username: string) => {
    const target = `/@${username}/${activePlugin}`;
    if (isDirty) {
      setPendingNavigation(target);
    } else {
      router.push(target);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("syncSuccess") || "همگام‌سازی با موفقیت انجام شد");
        router.refresh();
      } else {
        toast.error(data.error || "خطا در همگام‌سازی");
        if (data.session_required) {
          setLoginModalOpen(true);
        }
      }
    } catch {
      toast.error("خطای شبکه در همگام‌سازی");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const handleTogglePause = async () => {
    if (updatingStatus) return;
    const currentStatus = profile?.status || "active";
    const nextStatus = currentStatus === "paused" ? "active" : "paused";

    setUpdatingStatus(true);
    try {
      const ok = await updateAccountStatus(nextStatus);
      if (ok) {
        if (nextStatus === "paused") {
          toast.warning(t("pauseAutomationSuccess"));
        } else {
          toast.success(t("resumeAutomationSuccess"));
        }
        router.refresh();
      } else {
        toast.error(t("updateStatusError"));
      }
    } catch {
      toast.error(t("updateStatusError"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div
      className="flex flex-col h-[100dvh] max-h-[100dvh] w-full bg-surface text-on-surface overflow-hidden antialiased"
      dir={dir}
    >
      {/* 1. M3 Top App Bar (sits on `surface`; controls use surface-container-high) */}
      <header className="h-16 shrink-0 px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 bg-surface z-30">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <md-icon-button
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                toggleRail();
              } else {
                setMobileDrawerOpen(true);
              }
            }}
            aria-label="منو"
          >
            <MaterialSymbol name="menu" size={24} />
          </md-icon-button>

          <Link href="/" className="hidden sm:flex items-center gap-2 shrink-0">
            <BrandLogo size="default" showText={false} />
            <span className="title-large text-on-surface">
              in<span className="text-primary">Flow</span>
            </span>
          </Link>

          <AccountSwitcherMenu
            account={account}
            accounts={accounts}
            profile={profile}
            canAddAccount={currentUser?.role === "superadmin"}
            onSelectAccount={handleSelectAccount}
            onOpenAddAccount={() => setLoginModalOpen(true)}
            onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
          />
        </div>

        {/* Search bar (M3 search: surface-container-high, elevates on focus) */}
        <div className="hidden md:flex items-center flex-1 max-w-xl">
          <div className="w-full h-12 px-4 rounded-full bg-surface-container-high focus-within:bg-surface-container-lowest focus-within:elevation-2 transition-all flex items-center gap-3">
            <MaterialSymbol name="search" size={22} className="text-on-surface-variant shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در سناریوها، کلمات کلیدی، نام پست‌ها..."
              className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/70 body-medium"
            />
            {searchQuery ? (
              <md-icon-button onClick={() => setSearchQuery("")} aria-label="پاک کردن جستجو">
                <MaterialSymbol name="close" size={20} />
              </md-icon-button>
            ) : (
              <span dir="ltr" className="label-small text-on-surface-variant px-2 py-0.5 rounded-md bg-surface-container-highest shrink-0">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* Trailing actions: connection health, master pause, theme, language */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              connectionHealth === "active" ? setUnifiedModalOpen(true) : setLoginModalOpen(true)
            }
            className={cn(
              "h-8 ps-2 pe-3 inline-flex items-center gap-1.5 rounded-lg label-large transition-[filter] hover:brightness-95 cursor-pointer",
              healthBadge.className
            )}
            title={
              connectionHealth === "active"
                ? "مشاهده وضعیت پیج و نشست اینستاگرام"
                : "اتصال مجدد به اینستاگرام"
            }
            aria-label={`وضعیت اتصال اینستاگرام: ${healthBadge.label}`}
          >
            <MaterialSymbol name={healthBadge.icon} size={18} fill className="shrink-0" />
            <span className="hidden sm:inline">{healthBadge.label}</span>
          </button>

          <div
            className={cn(
              "h-10 ps-3 pe-2 inline-flex items-center gap-2 rounded-full transition-colors",
              automationRunning
                ? "bg-surface-container-high"
                : "bg-tertiary-container text-on-tertiary-container"
            )}
          >
            {updatingStatus ? (
              <md-circular-progress indeterminate className="[--md-circular-progress-size:20px] shrink-0" />
            ) : (
              <MaterialSymbol
                name={automationRunning ? "bolt" : "pause_circle"}
                size={20}
                fill
                className={cn("shrink-0", automationRunning && "text-primary")}
              />
            )}
            <span className="hidden lg:inline label-large" aria-live="polite">
              {updatingStatus
                ? "در حال اعمال..."
                : automationRunning
                ? "اتوماسیون فعال"
                : "اتوماسیون متوقف"}
            </span>
            <M3Switch
              selected={automationRunning}
              onChange={(next) => {
                if (next !== automationRunning) handleTogglePause();
              }}
              disabled={updatingStatus}
              ariaLabel={`توقف/ادامه اتوماسیون @${account}`}
            />
          </div>

          <md-icon-button
            onClick={toggleTheme}
            className="hidden sm:inline-flex"
            title={theme === "dark" ? "تغییر به تم روشن" : "تغییر به تم تاریک"}
            aria-label={theme === "dark" ? "تغییر به تم روشن" : "تغییر به تم تاریک"}
          >
            <MaterialSymbol name={theme === "dark" ? "light_mode" : "dark_mode"} size={22} />
          </md-icon-button>

          <LanguageDropdown
            currentLang={lang}
            onLangChange={(l) => setLang(l)}
          />
        </div>
      </header>

      {/* Compact-width search (the top-app-bar search is md+ only) */}
      <div className="md:hidden shrink-0 px-3 pb-2">
        <div className="w-full h-11 px-4 rounded-full bg-surface-container-high focus-within:bg-surface-container-lowest focus-within:elevation-2 transition-all flex items-center gap-3">
          <MaterialSymbol name="search" size={20} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو..."
            className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/70 body-medium"
          />
          {searchQuery && (
            <md-icon-button onClick={() => setSearchQuery("")} aria-label="پاک کردن جستجو">
              <MaterialSymbol name="close" size={20} />
            </md-icon-button>
          )}
        </div>
      </div>

      {/* 2. Workspace body: navigation rail + floating main pane */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Desktop navigation rail (compact 80dp ⇄ expanded 280dp) */}
        <div className="hidden lg:block shrink-0 h-full select-none">
          <SidebarNav
            variant="rail"
            expanded={!isRail}
            currentAccount={account}
            onSync={handleSync}
            syncing={syncing}
            currentUser={currentUser}
            onLogout={handleLogout}
            lang={lang}
            activePlugin={activePlugin}
          />
        </div>

        {/* Mobile modal navigation drawer */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex overflow-hidden">
            <div
              className="fixed inset-0 bg-black/32 animate-in fade-in duration-200"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="منوی ناوبری"
              className="relative w-[360px] max-w-[85vw] h-full bg-surface-container-low z-10 elevation-1 animate-in slide-in-from-start duration-300 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col overflow-hidden rounded-e-[16px]"
            >
              <SidebarNav
                variant="drawer"
                currentAccount={account}
                onSync={handleSync}
                syncing={syncing}
                currentUser={currentUser}
                onLogout={handleLogout}
                lang={lang}
                activePlugin={activePlugin}
                onNavigate={() => setMobileDrawerOpen(false)}
                onClose={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* 3. Floating main pane (surface-container-lowest on the `surface` canvas) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden m-2 sm:m-3 lg:m-4 mb-18 sm:mb-3 lg:mb-4 mt-0 sm:mt-1 rounded-[20px] sm:rounded-[24px] bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(60,64,67,0.1),0_1px_2px_0_rgba(60,64,67,0.06)] dark:bg-surface-container-low dark:shadow-none transition-all">
          {/* Banner if session requires re-login */}
          {sessionStatus === "reauth_required" && (
            <SessionExpiryBanner
              account={account}
              onReLogin={() => setLoginModalOpen(true)}
            />
          )}

          {/* Inner Scrollable Workspace Canvas */}
          <main className="flex-1 overflow-y-auto overscroll-contain min-w-0 p-4 sm:p-6 lg:p-7 pb-8 sm:pb-6">
            <div className="w-full max-w-[1500px] mx-auto space-y-6">
              {profile?.status === "paused" && (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-200/70 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-800 dark:text-amber-300">
                      <MaterialSymbol name="pause_circle" size={24} fill />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                          {t("automationPausedBannerTitle")}
                        </p>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                          PAUSED
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                        {t("automationPausedBannerDesc")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    disabled={updatingStatus}
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto active:scale-95"
                  >
                    <MaterialSymbol name="play_arrow" size={18} fill />
                    <span>{t("resumeAutomationBtn")}</span>
                  </button>
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 4. Mobile Bottom Navigation Bar (<1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 start-0 end-0 h-16 bg-surface-container flex items-center justify-around px-2 z-40 select-none"
      >
        <Link
          href={`/@${account}/comments`}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div
            className={cn(
              "w-12 h-8 rounded-full flex items-center justify-center transition-colors",
              activePlugin === "comments"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant group-hover:bg-on-surface/8"
            )}
          >
            <MaterialSymbol
              name="forum"
              size={20}
              fill={activePlugin === "comments"}
            />
          </div>
          <span
            className={cn(
              "text-[10px] mt-0.5 transition-colors truncate",
              activePlugin === "comments"
                ? "font-bold text-on-surface"
                : "text-on-surface-variant"
            )}
          >
            کامنت‌ها
          </span>
        </Link>

        <Link
          href={`/@${account}/dms`}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div
            className={cn(
              "w-12 h-8 rounded-full flex items-center justify-center transition-colors",
              activePlugin === "dms"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant group-hover:bg-on-surface/8"
            )}
          >
            <MaterialSymbol
              name="chat_bubble"
              size={20}
              fill={activePlugin === "dms"}
            />
          </div>
          <span
            className={cn(
              "text-[10px] mt-0.5 transition-colors truncate",
              activePlugin === "dms"
                ? "font-bold text-on-surface"
                : "text-on-surface-variant"
            )}
          >
            دایرکت
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setUnifiedModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div className="w-12 h-8 rounded-full flex items-center justify-center text-on-surface-variant group-hover:bg-on-surface/8 transition-colors">
            <MaterialSymbol name="tune" size={20} />
          </div>
          <span className="text-[10px] mt-0.5 text-on-surface-variant transition-colors truncate">
            وضعیت
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div className="w-12 h-8 rounded-full flex items-center justify-center text-on-surface-variant group-hover:bg-on-surface/8 transition-colors">
            <MaterialSymbol name="menu" size={20} />
          </div>
          <span className="text-[10px] mt-0.5 text-on-surface-variant transition-colors truncate">
            منو
          </span>
        </button>
      </nav>

      {/* Global Toast Provider */}
      <Toaster />

      {/* Unified Page Status & Automation Modal */}
      <UnifiedStatusModal
        isOpen={unifiedModalOpen}
        onClose={() => setUnifiedModalOpen(false)}
        account={account}
        profile={profile}
        sessionStatus={sessionStatus}
        masterStatus={profile?.status || "active"}
        dmAutomationEnabled={dmAutomationEnabled}
        onToggleMasterStatus={handleTogglePause}
        onToggleDmAutomation={handleToggleDmAutomation}
        onOpenLoginModal={() => {
          setUnifiedModalOpen(false);
          setLoginModalOpen(true);
        }}
        loadingMaster={updatingStatus}
        loadingDm={loadingDm}
      />

      {/* Direct In-App Login Modal (Zero Password Storage) */}
      <AccountLoginDialog
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        defaultUsername={account}
        lockUsername={true}
        onSuccess={(usr) => {
          toast.success(`اکانت @${usr} با موفقیت متصل شد`);
          router.push(`/@${usr}/comments`);
          router.refresh();
        }}
      />

      {deleteAccountOpen && (
        <DeleteAccountModal
          open={deleteAccountOpen}
          account={account}
          onClose={() => setDeleteAccountOpen(false)}
          onDeleted={() => {
            router.push("/");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  return (
    <WorkspaceProvider {...props}>
      <WorkspaceShellInner>{props.children}</WorkspaceShellInner>
    </WorkspaceProvider>
  );
}
