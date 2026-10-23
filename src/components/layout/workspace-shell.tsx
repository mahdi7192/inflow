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
import type { AccountRow } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";

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
    isDirty,
    setPendingNavigation,
  } = useRequiredWorkspace();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isRail, setIsRail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      className="flex h-[100dvh] max-h-[100dvh] w-full bg-surface-container-low text-foreground overflow-hidden antialiased select-none"
      dir={dir}
    >
      {/* 1. Desktop Persistent M3 Navigation Drawer / Rail */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-[100dvh] z-20 select-none">
        <SidebarNav
          currentAccount={account}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onOpenAddAccount={() => setLoginModalOpen(true)}
          onSync={handleSync}
          syncing={syncing}
          currentUser={currentUser}
          onLogout={handleLogout}
          lang={lang}
          activePlugin={activePlugin}
          onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
          isRail={isRail}
          onToggleRail={toggleRail}
        />
      </div>

      {/* 2. Mobile Slide-Over M3 Modal Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex overflow-hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-surface-container z-10 shadow-2xl animate-in slide-in-from-start duration-200 flex flex-col overflow-hidden rounded-e-3xl border-e border-outline-variant">
            <SidebarNav
              currentAccount={account}
              accounts={accounts}
              onSelectAccount={(usr) => {
                handleSelectAccount(usr);
                setMobileDrawerOpen(false);
              }}
              onOpenAddAccount={() => {
                setMobileDrawerOpen(false);
                setLoginModalOpen(true);
              }}
              onSync={handleSync}
              syncing={syncing}
              currentUser={currentUser}
              onLogout={handleLogout}
              lang={lang}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              activePlugin={activePlugin}
              onOpenDeleteAccount={() => {
                setMobileDrawerOpen(false);
                setDeleteAccountOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-16 lg:pb-0">
        {/* Banner if session requires re-login */}
        {sessionStatus === "reauth_required" && (
          <SessionExpiryBanner
            account={account}
            onReLogin={() => setLoginModalOpen(true)}
          />
        )}

        {/* Google M3 Top App Bar */}
        <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-outline-variant/50 bg-surface-container-low/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-full text-foreground/80 hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
              aria-label={t("openMenu")}
            >
              <MaterialSymbol name="menu" size={22} />
            </button>

            {/* Google M3 Search / Context Pill */}
            <div className="hidden sm:flex items-center gap-2 max-w-sm w-full px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/60 text-xs text-muted-foreground focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all shadow-2xs">
              <MaterialSymbol name="search" size={18} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="جستجو در پست‌ها، کامنت‌ها و رول‌ها..."
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-xs"
              />
            </div>

            {/* Account & Plugin Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs truncate" aria-label="Breadcrumb">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium truncate"
              >
                {t("allAccounts")}
              </Link>
              <MaterialSymbol name="chevron_left" size={16} rtlMirror={true} className="text-muted-foreground/60 shrink-0" />
              <span className="font-mono font-medium text-foreground bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/50">
                <bdi>@{account}</bdi>
              </span>
              <MaterialSymbol name="chevron_left" size={16} rtlMirror={true} className="text-muted-foreground/60 shrink-0" />
              <span className="text-muted-foreground font-medium truncate">
                {activePlugin === "dms" ? t("navDms") : t("navComments")}
              </span>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Unified Page Status & Automation Trigger Pill (M3 Tonal Filter Chip) */}
            <button
              type="button"
              onClick={() => setUnifiedModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none shadow-xs active:scale-[0.98]",
                sessionStatus !== "active"
                  ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold"
                  : profile?.status === "paused"
                  ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold"
                  : !dmAutomationEnabled
                  ? "bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100"
                  : "bg-surface-container-lowest text-foreground border-outline-variant hover:bg-surface-container-high"
              )}
              title="مشاهده وضعیت پیج، نشست اینستاگرام و تفکیک ماژول‌ها"
            >
              {sessionStatus !== "active" ? (
                <>
                  <MaterialSymbol name="warning" size={16} className="text-rose-600 shrink-0" />
                  <span className="hidden sm:inline">وضعیت پیج (ورود لازم است)</span>
                </>
              ) : profile?.status === "paused" ? (
                <>
                  <MaterialSymbol name="pause_circle" size={16} className="text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">اتوماسیون متوقف</span>
                </>
              ) : !dmAutomationEnabled ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="hidden sm:inline">فعال (دایرکت آفلاین)</span>
                  <MaterialSymbol name="tune" size={16} className="text-muted-foreground shrink-0" />
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="hidden sm:inline">وضعیت اتوماسیون</span>
                  <MaterialSymbol name="tune" size={16} className="text-muted-foreground shrink-0" />
                </>
              )}
            </button>

            <LanguageDropdown
              currentLang={lang}
              onLangChange={(l) => setLang(l)}
            />
          </div>
        </header>

        {/* 4. Single Unified Vertical Scroll Container */}
        <main className="flex-1 overflow-y-auto overscroll-contain min-w-0 bg-surface-container-low p-3 sm:p-5 lg:p-6">
          <div className="w-full max-w-6xl mx-auto space-y-4">
            {profile?.status === "paused" && (
              <div className="rounded-3xl border border-amber-300 bg-amber-50/95 p-4 text-amber-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                    <MaterialSymbol name="pause_circle" size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-amber-950">
                        {t("automationPausedBannerTitle")}
                      </p>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                        PAUSED
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-amber-800/90 mt-0.5">
                      {t("automationPausedBannerDesc")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={updatingStatus}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <MaterialSymbol name="play_arrow" size={18} fill={true} />
                  <span>{t("resumeAutomationBtn")}</span>
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* 5. Mobile M3 Bottom Navigation Bar (<1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 start-0 end-0 h-16 bg-surface-container border-t border-outline-variant/60 flex items-center justify-around px-2 z-40 shadow-lg select-none"
      >
        {/* Destination 1: Comments */}
        <Link
          href={`/@${account}/comments`}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div
            className={cn(
              "w-14 h-8 rounded-full flex items-center justify-center transition-all duration-200",
              activePlugin === "comments"
                ? "bg-primary-container text-on-primary-container shadow-2xs"
                : "text-muted-foreground group-hover:bg-surface-container-high"
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
                ? "font-bold text-primary"
                : "text-muted-foreground"
            )}
          >
            کامنت‌ها
          </span>
        </Link>

        {/* Destination 2: DMs */}
        <Link
          href={`/@${account}/dms`}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div
            className={cn(
              "w-14 h-8 rounded-full flex items-center justify-center transition-all duration-200",
              activePlugin === "dms"
                ? "bg-primary-container text-on-primary-container shadow-2xs"
                : "text-muted-foreground group-hover:bg-surface-container-high"
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
                ? "font-bold text-primary"
                : "text-muted-foreground"
            )}
          >
            دایرکت
          </span>
        </Link>

        {/* Destination 3: Status / Controls */}
        <button
          type="button"
          onClick={() => setUnifiedModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div className="w-14 h-8 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-surface-container-high transition-all">
            <MaterialSymbol name="tune" size={20} />
          </div>
          <span className="text-[10px] mt-0.5 text-muted-foreground transition-colors truncate">
            وضعیت
          </span>
        </button>

        {/* Destination 4: Switcher / Menu */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div className="w-14 h-8 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-surface-container-high transition-all">
            <MaterialSymbol name="menu" size={20} />
          </div>
          <span className="text-[10px] mt-0.5 text-muted-foreground transition-colors truncate">
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
