"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { SidebarNav } from "@/components/sidebar-nav";
import { I18N, Lang } from "@/lib/i18n";
import type { AccountRow, DMLogRow, BotStatus } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { BotToolbarButton } from "@/components/bot/bot-toolbar-button";
import { BotMonitorDrawer } from "@/components/bot/bot-monitor-drawer";
import { VncViewerModal } from "@/components/bot/vnc-viewer-modal";
import { DmLogsTable } from "./dm-logs-table";

interface DmLogsPageViewProps {
  currentUser?: SafeUser | null;
  account: string;
  profile: AccountRow;
  accounts: AccountRow[];
  initialLogs: DMLogRow[];
}

export function DmLogsPageView({
  currentUser,
  account,
  profile,
  accounts,
  initialLogs,
}: DmLogsPageViewProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fa");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Bot Drawer & VNC States
  const [botDrawerOpen, setBotDrawerOpen] = useState(false);
  const [vncModalOpen, setVncModalOpen] = useState(false);
  const [vncUrl, setVncUrl] = useState("");
  const [vncExpiresInSec, setVncExpiresInSec] = useState(600);
  const [isVncLoading, setIsVncLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus>(profile.bot_status || "unprovisioned");

  const [logs, setLogs] = useState<DMLogRow[]>(initialLogs);
  const [logsLoading, setLogsLoading] = useState(false);

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const handleOpenVnc = async () => {
    setIsVncLoading(true);
    try {
      const res = await fetch("/api/bot/vnc-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json();
      if (data.success) {
        setVncUrl(data.vnc_url);
        setVncExpiresInSec(data.timeout_seconds || 600);
        setVncModalOpen(true);
      } else {
        alert("خطا در باز کردن نشست مانیتور: " + data.error);
      }
    } catch (err) {
      console.error("VNC launch error:", err);
    } finally {
      setIsVncLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account}/dm-logs?limit=100`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to refresh logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSelectAccount = (username: string) => {
    router.push(`/@${username}/dms/logs`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div
      dir={lang === "fa" || lang === "ar" ? "rtl" : "ltr"}
      className="flex h-screen bg-zinc-50 overflow-hidden font-vazir"
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <SidebarNav
          currentAccount={account}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onOpenAddAccount={() => {}}
          onOpenAgentApi={() => {}}
          onSync={async () => {}}
          syncing={false}
          currentUser={currentUser}
          onLogout={handleLogout}
          lang={lang}
          activePlugin="dms"
        />
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-card z-10 shadow-2xl animate-in slide-in-from-start">
            <SidebarNav
              currentAccount={account}
              accounts={accounts}
              onSelectAccount={(usr) => {
                handleSelectAccount(usr);
                setMobileDrawerOpen(false);
              }}
              onOpenAddAccount={() => {}}
              onOpenAgentApi={() => {}}
              onSync={async () => {}}
              syncing={false}
              currentUser={currentUser}
              onLogout={handleLogout}
              lang={lang}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              activePlugin="dms"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-border bg-white/80 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label={t("openMenu")}
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <Link href={`/@${account}/dms`} className="text-muted-foreground hover:text-foreground">
                {t("navDms")}
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="font-semibold text-foreground">
                {t("dmLogsTitle")}
              </span>
              <span className="text-zinc-300">/</span>
              <span className="font-mono text-muted-foreground">
                @{account}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Page Body */}
        <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link href={`/@${account}/dms`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs cursor-pointer">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span>بازگشت به تنظیمات دایرکت</span>
              </Button>
            </Link>

            <Badge variant="outline" className="text-xs font-mono font-medium">
              @{account}
            </Badge>
          </div>

          {/* Full DM Logs Table */}
          <DmLogsTable
            logs={logs}
            onRefresh={handleRefreshLogs}
            loading={logsLoading}
            lang={lang}
          />
        </main>
      </div>

      {/* Bot Monitor Drawer */}
      <BotMonitorDrawer
        isOpen={botDrawerOpen}
        onClose={() => setBotDrawerOpen(false)}
        account={account}
        botStatus={botStatus}
        lang={lang}
        onOpenVnc={handleOpenVnc}
        isVncLoading={isVncLoading}
        onStatusChange={(status) => setBotStatus(status)}
      />

      {/* VNC Viewer Modal */}
      <VncViewerModal
        isOpen={vncModalOpen}
        onClose={() => setVncModalOpen(false)}
        account={account}
        vncUrl={vncUrl}
        initialExpiresInSeconds={vncExpiresInSec}
        lang={lang}
      />
    </div>
  );
}
