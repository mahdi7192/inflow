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
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button, Input, Card } from "@/components/ui/primitives";
import { I18N, Lang } from "@/lib/i18n";
import { SafeUser } from "@/lib/auth";
import { UserTable, BackofficeUser } from "@/components/backoffice/user-table";
import { CreateUserModal } from "@/components/backoffice/create-user-modal";

interface BackofficeClientViewProps {
  currentUser: SafeUser;
}

export function BackofficeClientView({ currentUser }: BackofficeClientViewProps) {
  const [lang, setLang] = useState<Lang>("fa");
  const [users, setUsers] = useState<BackofficeUser[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<
    { username: string; display_name: string; avatar_url: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createUserOpen, setCreateUserOpen] = useState(false);

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
    setLoading(true);
    try {
      const res = await fetch("/api/backoffice/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setAvailableAccounts(data.available_accounts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const totalTenants = users.filter((u) => u.role === "tenant").length;
  const activeCount = users.filter((u) => u.status === "active").length;

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
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-secondary text-xs">
            {(["fa", "en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleSetLang(l)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  lang === l
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

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
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
              <span>{t("totalUsers")}</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
              <span>{t("roleTenant")}</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalTenants}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
              <span>{t("userStatusActive")}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
              <span>پیج‌های متصل</span>
              <InstagramIcon className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {availableAccounts.length}
            </div>
          </Card>
        </div>

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام کاربری، عنوان یا پیج تخصیص‌یافته..."
              icon={<Search className="w-4 h-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={fetchUsers}
              disabled={loading}
              title="بروزرسانی"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              type="button"
              variant="brand"
              onClick={() => setCreateUserOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              <span>{t("createUserBtn")}</span>
            </Button>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            در حال بارگذاری کاربران...
          </div>
        ) : (
          <UserTable
            users={filteredUsers}
            availableAccounts={availableAccounts}
            currentUserId={currentUser.id}
            lang={lang}
            onRefresh={fetchUsers}
          />
        )}
      </main>

      {/* Create User Modal */}
      {createUserOpen && (
        <CreateUserModal
          lang={lang}
          onClose={() => setCreateUserOpen(false)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
