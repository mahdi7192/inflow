"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
} from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { BotToolbarButton } from "@/components/bot/bot-toolbar-button";
import { BotMonitorDrawer } from "@/components/bot/bot-monitor-drawer";
import { VncViewerModal } from "@/components/bot/vnc-viewer-modal";
import { Toaster, toast } from "@/components/ui/sonner";
import { UnsavedChangesModal } from "@/components/ui/unsaved-changes-modal";
import { AddAccountModal } from "@/components/modals/create-modals";
import { AgentApiModal } from "@/components/modals/agent-api-modal";
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
    currentUser,
    lang,
    dir,
    setLang,
    t,
    botStatus,
    setBotStatus,
    botDrawerOpen,
    setBotDrawerOpen,
    vncModalOpen,
    setVncModalOpen,
    vncUrl,
    vncExpiresInSec,
    isVncLoading,
    openVncSession,
    isDirty,
    pendingNavigation,
    setPendingNavigation,
    confirmDiscardAndNavigate,
  } = useRequiredWorkspace();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Auxiliary modals
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [agentApiOpen, setAgentApiOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

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
        toast.error(data.error || "خطا در همگام‌سازی با اینستاگرام");
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

  return (
    <div
      className="flex h-screen bg-background text-foreground overflow-hidden font-vazir antialiased select-none"
      dir={dir}
    >
      {/* 1. Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-30 select-none">
        <SidebarNav
          currentAccount={account}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onOpenAddAccount={() => setAddAccountOpen(true)}
          onOpenAgentApi={() => setAgentApiOpen(true)}
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
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-card z-10 shadow-2xl animate-in slide-in-from-start duration-200">
            <SidebarNav
              currentAccount={account}
              accounts={accounts}
              onSelectAccount={(usr) => {
                handleSelectAccount(usr);
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
        {/* Persistent Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
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
          <div className="flex items-center gap-2 shrink-0">
            <BotToolbarButton
              account={account}
              botStatus={botStatus}
              lang={lang}
              onClick={() => setBotDrawerOpen(true)}
            />

            <LanguageDropdown
              currentLang={lang}
              onLangChange={(l) => setLang(l)}
              size="sm"
            />
          </div>
        </header>

        {/* 4. Single Unified Vertical Scroll Container */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-zinc-50/50">
          {children}
        </main>
      </div>

      {/* 5. Persistent Global Modals & Drawers */}
      <BotMonitorDrawer
        isOpen={botDrawerOpen}
        onClose={() => setBotDrawerOpen(false)}
        account={account}
        botStatus={botStatus}
        lang={lang}
        onOpenVnc={openVncSession}
        isVncLoading={isVncLoading}
        onStatusChange={(status) => setBotStatus(status)}
      />

      <VncViewerModal
        isOpen={vncModalOpen}
        onClose={() => setVncModalOpen(false)}
        account={account}
        vncUrl={vncUrl}
        initialExpiresInSeconds={vncExpiresInSec}
        lang={lang}
      />

      <UnsavedChangesModal
        isOpen={pendingNavigation !== null}
        onStay={() => setPendingNavigation(null)}
        onDiscard={confirmDiscardAndNavigate}
        title={t("unsavedChangesTitle")}
        description={t("unsavedChangesDesc")}
        stayLabel={t("stayOnPage")}
        discardLabel={t("discardChanges")}
      />

      {/* Global Toast Provider */}
      <Toaster />

      {/* Account Management Modals */}
      {addAccountOpen && (
        <AddAccountModal
          open={addAccountOpen}
          onClose={() => setAddAccountOpen(false)}
          onCreated={(newUsername) => {
            router.push(`/@${newUsername}/comments`);
            router.refresh();
          }}
        />
      )}

      {agentApiOpen && (
        <AgentApiModal
          open={agentApiOpen}
          onClose={() => setAgentApiOpen(false)}
          accountUsername={account}
        />
      )}

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
