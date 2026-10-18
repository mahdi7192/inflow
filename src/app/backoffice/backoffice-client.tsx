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
      className="min-h-screen flex flex-col bg-[#050505] text-[#ededed]"
    >
      {/* Backoffice Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-white/8 bg-black/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-300 text-xs transition-colors"
          >
            {isRtl ? (
              <ArrowRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5" />
            )}
            <span>{t("backToDashboard")}</span>
          </Link>

          <span className="text-zinc-600">/</span>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">
              {t("backofficeTitle")}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-white/10 bg-zinc-950 text-xs">
            {(["fa", "en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleSetLang(l)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  lang === l
                    ? "bg-purple-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
            <div className="hidden sm:flex flex-col text-end rtl:text-start leading-tight">
              <span className="text-xs font-medium text-white truncate max-w-[120px]">
                {currentUser.display_name || currentUser.username}
              </span>
              <span className="text-[10px] text-purple-400">
                {t("roleSuperadmin")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={t("logoutButton")}
              className="p-1.5 rounded-lg border border-white/10 bg-zinc-950 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
          <div className="p-4 rounded-2xl border border-white/8 bg-[#0a0a0d]">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span>{t("totalUsers")}</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{users.length}</div>
          </div>

          <div className="p-4 rounded-2xl border border-white/8 bg-[#0a0a0d]">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span>{t("roleTenant")}</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{totalTenants}</div>
          </div>

          <div className="p-4 rounded-2xl border border-white/8 bg-[#0a0a0d]">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span>{t("userStatusActive")}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          </div>

          <div className="p-4 rounded-2xl border border-white/8 bg-[#0a0a0d]">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span>پیج‌های متصل</span>
              <InstagramIcon className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {availableAccounts.length}
            </div>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute inset-y-0 my-auto start-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام کاربری، عنوان یا پیج تخصیص‌یافته..."
              className="w-full bg-[#0a0a0d] border border-white/10 rounded-xl py-2 ps-9 pe-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              title="بروزرسانی"
              className="p-2 rounded-xl border border-white/10 bg-[#0a0a0d] hover:bg-white/5 text-zinc-300 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setCreateUserOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t("createUserBtn")}</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">
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
