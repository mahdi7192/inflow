"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Pause, Play, PauseCircle, AlertCircle, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/sidebar-nav";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { SessionHealthBadge } from "@/components/layout/session-health-badge";
import { UnifiedStatusModal } from "@/components/layout/unified-status-modal";
import { SessionExpiryBanner } from "@/components/layout/session-expiry-banner";
import { AccountLoginDialog } from "@/components/auth/account-login-dialog";
import { Toaster, toast } from "@/components/ui/sonner";
import { DeleteAccountModal } from "@/components/modals/delete-account-modal";
import { WorkspaceProvider, useRequiredWorkspace } from "./workspace-context";
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
    pendingNavigation,
    setPendingNavigation,
    confirmDiscardAndNavigate,
  } = useRequiredWorkspace();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      className="flex h-[100dvh] max-h-[100dvh] w-full bg-background text-foreground overflow-hidden font-vazir antialiased select-none"
      dir={dir}
    >
      {/* 1. Desktop Persistent Sidebar */}
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
        />
      </div>

      {/* 2. Mobile Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex overflow-hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-card z-10 shadow-2xl animate-in slide-in-from-start duration-200 flex flex-col overflow-hidden">
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Banner if session requires re-login */}
        {sessionStatus === "reauth_required" && (
          <SessionExpiryBanner
            account={account}
            onReLogin={() => setLoginModalOpen(true)}
          />
        )}

        {/* Persistent Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
              aria-label={t("openMenu")}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1.5 text-xs truncate" aria-label="Breadcrumb">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium truncate"
              >
                {t("allAccounts")}
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="font-mono font-medium text-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border/60">
                <bdi>@{account}</bdi>
              </span>
              <span className="text-zinc-300">/</span>
              <span className="text-muted-foreground font-medium truncate">
                {activePlugin === "dms" ? t("navDms") : t("navComments")}
              </span>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Unified Page Status & Automation Trigger Pill */}
            <button
              type="button"
              onClick={() => setUnifiedModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none shadow-2xs hover:opacity-90",
                sessionStatus !== "active"
                  ? "bg-rose-500/10 text-rose-700 border-rose-300 hover:bg-rose-500/20 font-semibold dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                  : profile?.status === "paused"
                  ? "bg-amber-500/10 text-amber-700 border-amber-300 hover:bg-amber-500/20 font-semibold dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  : !dmAutomationEnabled
                  ? "bg-teal-500/10 text-teal-800 border-teal-300 hover:bg-teal-500/20 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
                  : "bg-emerald-500/10 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              )}
              title="مشاهده وضعیت پیج، نشست اینستاگرام و تفکیک ماژول‌ها"
            >
              {sessionStatus !== "active" ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>وضعیت پیج (نیاز به ورود)</span>
                </>
              ) : profile?.status === "paused" ? (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>اتوماسیون پیج (متوقف)</span>
                </>
              ) : !dmAutomationEnabled ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span>اتوماسیون فعال (دایرکت متوقف)</span>
                  <SlidersHorizontal className="w-3 h-3 text-teal-600 shrink-0 opacity-70" />
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span>وضعیت و اتوماسیون پیج</span>
                  <SlidersHorizontal className="w-3 h-3 text-emerald-600 shrink-0 opacity-70" />
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
        <main className="flex-1 overflow-y-auto overscroll-contain min-w-0 bg-[#F8FAFC] p-3 sm:p-5 lg:p-6">
          <div className="w-full max-w-6xl mx-auto">
            {profile?.status === "paused" && (
              <div className="mb-4 sm:mb-6 rounded-xl border border-amber-300 bg-amber-50/95 p-3.5 sm:p-4 text-amber-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                    <PauseCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-amber-900">
                        {t("automationPausedBannerTitle")}
                      </p>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
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
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t("resumeAutomationBtn")}</span>
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

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
