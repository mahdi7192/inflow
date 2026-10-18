"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Search,
  LogOut,
  Bot,
  Plus,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { Button, Input, Card } from "@/components/ui/primitives";
import { I18N, Lang } from "@/lib/i18n";
import { SafeUser } from "@/lib/auth";
import { BackofficeAccountItem } from "@/lib/db";
import { UserTable, BackofficeUser } from "@/components/backoffice/user-table";
import { CreateUserModal } from "@/components/backoffice/create-user-modal";
import { AccountTable } from "@/components/backoffice/account-table";
import { CreateAccountModal } from "@/components/backoffice/create-account-modal";

interface BackofficeClientViewProps {
  currentUser: SafeUser;
}

export function BackofficeClientView({ currentUser }: BackofficeClientViewProps) {
  const [lang, setLang] = useState<Lang>("fa");
  const [activeTab, setActiveTab] = useState<"pages" | "users">("pages");

  const [users, setUsers] = useState<BackofficeUser[]>([]);
  const [accounts, setAccounts] = useState<BackofficeAccountItem[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<
    { username: string; display_name: string; avatar_url: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  // Sync saved language
  useEffect(() => {
    const saved = localStorage.getItem("inflow_lang") as Lang | null;
    if (saved && (saved === "fa" || saved === "en" || saved === "ar")) {
      setLang(saved);
      if (typeof document !== "undefined") {
        document.documentElement.dir = saved === "en" ? "ltr" : "rtl";
        document.documentElement.lang = saved;
      }
    }
  }, []);

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("inflow_lang", l);
    if (typeof document !== "undefined") {
      document.documentElement.dir = l === "en" ? "ltr" : "rtl";
      document.documentElement.lang = l;
    }
  };

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setAvailableAccounts(data.available_accounts || []);
      }
    } catch (e) {
      console.error("fetchUsers error:", e);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error("fetchAccounts error:", e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchAccounts()]);
    setLoading(false);
  }, [fetchUsers, fetchAccounts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q) ||
        u.assigned_accounts.some((acc) => acc.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        a.display_name.toLowerCase().includes(q) ||
        (a.assigned_user?.username || "").toLowerCase().includes(q) ||
        (a.assigned_user?.display_name || "").toLowerCase().includes(q) ||
        (a.bot_binding?.bot_profile_id || "").toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  // Stats
  const totalTenants = users.filter((u) => u.role === "tenant").length;
  const activeUsersCount = users.filter((u) => u.status === "active").length;
  const assignedPagesCount = accounts.filter((a) => a.assigned_user !== null).length;
  const unassignedPagesCount = accounts.filter((a) => a.assigned_user === null).length;
  const activeBotsCount = accounts.filter((a) => a.bot_binding?.last_heartbeat_at !== null).length;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col bg-background text-foreground"
    >
      {/* Backoffice Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {isRtl ? (
              <ArrowRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5" />
            )}
            <span>{t("backToDashboard")}</span>
          </Link>

          <span className="text-zinc-600">/</span>

          <BrandLogo size="sm" />

          <span className="text-zinc-600">/</span>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground tracking-wide">
              {t("backofficeTitle")}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageDropdown
            currentLang={lang}
            onLangChange={handleSetLang}
            size="sm"
          />

          {/* User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-border rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
            <div className="hidden sm:flex flex-col text-end rtl:text-start leading-tight">
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {currentUser.display_name || currentUser.username}
              </span>
              <span className="text-[10px] text-primary">
                {t("roleSuperadmin")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={t("logoutButton")}
              className="p-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* KPI Strip (Dynamic based on Tab) */}
        {activeTab === "pages" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("totalPages")}</span>
                <InstagramIcon className="w-4 h-4 text-pink-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {accounts.length}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("assignedPages")}</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {assignedPagesCount}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("unassignedPages")}</span>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {unassignedPagesCount}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("activeBots")}</span>
                <Bot className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {activeBotsCount}
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("totalUsers")}</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {users.length}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("roleTenant")}</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {totalTenants}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("userStatusActive")}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-500">
                {activeUsersCount}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
                <span>{t("totalPages")}</span>
                <InstagramIcon className="w-4 h-4 text-pink-400" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {accounts.length}
              </div>
            </Card>
          </div>
        )}

        {/* Tab Selector & Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pages");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pages"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <InstagramIcon className="w-3.5 h-3.5 text-zinc-800" />
              <span>{t("tabPages")}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-100 text-zinc-600 font-mono">
                {accounts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("users");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-zinc-800" />
              <span>{t("tabUsers")}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-100 text-zinc-600 font-mono">
                {users.length}
              </span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "pages"
                    ? (lang === "fa" ? "جستجو در پیج‌ها، مالکان یا هرمس..." : "Search pages, owners...")
                    : (lang === "fa" ? "جستجو در کاربران..." : "Search users...")
                }
                icon={<Search className="w-4 h-4" />}
                className="h-9 text-xs"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={refreshAll}
              disabled={loading}
              title="بروزرسانی"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            {activeTab === "pages" ? (
              <Button
                type="button"
                variant="brand"
                onClick={() => setCreateAccountOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t("addPageBtn")}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="brand"
                onClick={() => setCreateUserOpen(true)}
                className="gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t("createUserBtn")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab Content Display */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
            <span>{t("syncing")}</span>
          </div>
        ) : activeTab === "pages" ? (
          <AccountTable
            accounts={filteredAccounts}
            availableUsers={users}
            lang={lang}
            onRefresh={refreshAll}
          />
        ) : (
          <UserTable
            users={filteredUsers}
            availableAccounts={availableAccounts}
            currentUserId={currentUser.id}
            lang={lang}
            onRefresh={refreshAll}
          />
        )}
      </main>

      {/* Create Account Modal */}
      {createAccountOpen && (
        <CreateAccountModal
          lang={lang}
          availableUsers={users}
          onClose={() => setCreateAccountOpen(false)}
          onSuccess={refreshAll}
        />
      )}

      {/* Create User Modal */}
      {createUserOpen && (
        <CreateUserModal
          lang={lang}
          onClose={() => setCreateUserOpen(false)}
          onSuccess={refreshAll}
        />
      )}
    </div>
  );
}
