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
      className="flex flex-col h-[100dvh] max-h-[100dvh] w-full bg-[#f8fafd] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e2e2e6] overflow-hidden antialiased select-none"
      dir={dir}
    >
      {/* 1. Google Drive Unified Top App Bar (No bottom border, Pill Search, Rounded Chips) */}
      <header className="h-16 shrink-0 px-4 sm:px-6 flex items-center justify-between gap-4 z-30 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-full text-[#444746] hover:bg-[#e9eef6] dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            aria-label={t("openMenu")}
          >
            <MaterialSymbol name="menu" size={24} />
          </button>

          {/* Breadcrumb Context Pill */}
          <nav className="flex items-center gap-2 text-xs truncate" aria-label="Breadcrumb">
            <Link
              href="/"
              className="text-[#444746] hover:text-[#1f1f1f] dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors font-medium truncate"
            >
              {t("allAccounts")}
            </Link>
            <MaterialSymbol name="chevron_left" size={16} className="text-[#74777f] dark:text-neutral-500 shrink-0" />
            <span className="font-mono font-bold text-[#1f1f1f] dark:text-[#e2e2e6] bg-[#e9eef6] dark:bg-neutral-800 px-3 py-1 rounded-full text-xs">
              <bdi>@{account}</bdi>
            </span>
            <MaterialSymbol name="chevron_left" size={16} className="text-[#74777f] dark:text-neutral-500 shrink-0" />
            <span className="text-[#444746] dark:text-neutral-400 font-medium truncate">
              {activePlugin === "dms" ? t("navDms") : t("navComments")}
            </span>
          </nav>
        </div>

        {/* Google Drive Central Search Bar (Pill shaped, soft gray background, seamless focus) */}
        <div className="hidden md:flex items-center flex-1 max-w-2xl mx-4">
          <div className="w-full h-12 px-4 rounded-full bg-[#edf2fa] dark:bg-[#282a2d] hover:bg-[#e9eef6] dark:hover:bg-[#333538] focus-within:bg-white dark:focus-within:bg-[#1e1f20] focus-within:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] transition-all flex items-center gap-3 text-xs">
            <MaterialSymbol name="search" size={22} className="text-[#444746] dark:text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجو در سناریوها، کلمات کلیدی، نام پست‌ها یا دایرکت..."
              className="w-full bg-transparent border-none outline-none text-[#1f1f1f] dark:text-white placeholder:text-[#444746]/70 dark:placeholder:text-neutral-400 text-xs font-sans"
            />
            <span dir="ltr" className="text-[11px] font-mono text-[#74777f] px-2 py-0.5 rounded-md bg-[#e0e3e8]/50 dark:bg-neutral-800 shrink-0">
              ⌘K
            </span>
          </div>
        </div>

        {/* Top Actions & Status Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setUnifiedModalOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98]",
              sessionStatus !== "active"
                ? "bg-rose-100 text-rose-900 hover:bg-rose-200"
                : profile?.status === "paused"
                ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                : !dmAutomationEnabled
                ? "bg-teal-100 text-teal-900 hover:bg-teal-200"
                : "bg-[#edf2fa] dark:bg-neutral-800 text-[#1f1f1f] dark:text-[#e2e2e6] hover:bg-[#e3e8f0]"
            )}
            title="مشاهده وضعیت پیج، نشست اینستاگرام و تفکیک ماژول‌ها"
          >
            {sessionStatus !== "active" ? (
              <>
                <MaterialSymbol name="warning" size={16} className="text-rose-600 shrink-0" fill />
                <span className="hidden sm:inline">اتصال نامعتبر</span>
              </>
            ) : profile?.status === "paused" ? (
              <>
                <MaterialSymbol name="pause_circle" size={16} className="text-amber-600 shrink-0" fill />
                <span className="hidden sm:inline">اتوماسیون متوقف</span>
              </>
            ) : !dmAutomationEnabled ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="hidden sm:inline">دایرکت آفلاین</span>
                <MaterialSymbol name="tune" size={16} className="text-[#444746] dark:text-neutral-400 shrink-0" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="hidden sm:inline">وضعیت هوشمند</span>
                <MaterialSymbol name="tune" size={16} className="text-[#444746] dark:text-neutral-400 shrink-0" />
              </>
            )}
          </button>

          <LanguageDropdown
            currentLang={lang}
            onLangChange={(l) => setLang(l)}
          />
        </div>
      </header>

      {/* 2. Google Drive Workspace Body: Clean Sidebar + Floating Main Pane Container */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Desktop Sidebar (No border, transparent on canvas) */}
        <div className="hidden lg:block shrink-0 h-full select-none">
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

        {/* Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex overflow-hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] h-full bg-[#f8fafd] dark:bg-[#131314] z-10 shadow-2xl animate-in slide-in-from-start duration-200 flex flex-col overflow-hidden rounded-e-[28px]">
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

        {/* 3. Google Drive Iconic Floating White Main Container (rounded-[24px] floating pane on all 4 sides) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden m-2 sm:m-3 lg:m-4 mt-0 sm:mt-1 rounded-[20px] sm:rounded-[24px] bg-white dark:bg-[#1e1f20] shadow-[0_1px_3px_0_rgba(60,64,67,0.1),0_1px_2px_0_rgba(60,64,67,0.06)] dark:shadow-none transition-all">
          {/* Banner if session requires re-login */}
          {sessionStatus === "reauth_required" && (
            <SessionExpiryBanner
              account={account}
              onReLogin={() => setLoginModalOpen(true)}
            />
          )}

          {/* Inner Scrollable Workspace Canvas */}
          <main className="flex-1 overflow-y-auto overscroll-contain min-w-0 p-4 sm:p-6 lg:p-7 pb-20 sm:pb-6">
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
        className="lg:hidden fixed bottom-0 start-0 end-0 h-16 bg-[#f8fafd] dark:bg-[#131314] border-t border-[#e0e3e8]/70 dark:border-neutral-800 flex items-center justify-around px-2 z-40 select-none"
      >
        <Link
          href={`/@${account}/comments`}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div
            className={cn(
              "w-12 h-8 rounded-full flex items-center justify-center transition-colors",
              activePlugin === "comments"
                ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]"
                : "text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6]"
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
                ? "font-bold text-[#001d35] dark:text-[#c2e7ff]"
                : "text-[#444746] dark:text-neutral-400"
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
                ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]"
                : "text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6]"
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
                ? "font-bold text-[#001d35] dark:text-[#c2e7ff]"
                : "text-[#444746] dark:text-neutral-400"
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
          <div className="w-12 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6] dark:group-hover:bg-neutral-800 transition-colors">
            <MaterialSymbol name="tune" size={20} />
          </div>
          <span className="text-[10px] mt-0.5 text-[#444746] dark:text-neutral-400 transition-colors truncate">
            وضعیت
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer"
        >
          <div className="w-12 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6] dark:group-hover:bg-neutral-800 transition-colors">
            <MaterialSymbol name="menu" size={20} />
          </div>
          <span className="text-[10px] mt-0.5 text-[#444746] dark:text-neutral-400 transition-colors truncate">
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
