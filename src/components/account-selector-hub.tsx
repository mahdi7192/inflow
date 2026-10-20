"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Film,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Settings,
  Plus,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstagramIcon } from "@/components/ui/icons";
import type { AccountRow } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";

interface AccountSelectorHubProps {
  user: SafeUser;
  accounts: AccountRow[];
}

export function AccountSelectorHub({ user, accounts }: AccountSelectorHubProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const getBotStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] gap-1 px-2 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ربات آنلاین</span>
          </Badge>
        );
      case "login_required":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] gap-1 px-2 py-0.5"
          >
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>نیاز به ورود</span>
          </Badge>
        );
      case "provisioning":
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 border-sky-200 text-[11px] gap-1 px-2 py-0.5"
          >
            <Clock className="w-3 h-3 text-sky-600" />
            <span>در حال آماده‌سازی</span>
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] gap-1 px-2 py-0.5"
          >
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>خطا در ربات</span>
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[11px] gap-1 px-2 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>راه‌اندازی نشده</span>
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 font-vazir text-foreground flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="default" />
          <span className="text-xs text-muted-foreground border-s border-border ps-3 hidden sm:inline">
            مرکز مدیریت پیج‌ها
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user.role === "superadmin" && (
            <Link href="/backoffice">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-border bg-card hover:bg-secondary cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">پنل مدیریت سیستم</span>
                <span className="sm:hidden">مدیریت</span>
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/80 text-xs">
            <span className="text-muted-foreground">کاربر:</span>
            <span className="font-mono font-medium text-foreground">@{user.username}</span>
            {user.role === "superadmin" && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-zinc-200 text-zinc-700">
                مدیر کل
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs h-8 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            title="خروج از حساب کاربری"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-start">
        {/* Welcome Section */}
        <div className="mb-8 text-center sm:text-start flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/70 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>پیشخوان پیج‌های اینستاگرام</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              انتخاب پیج جهت ورود به پیشخوان
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              جهت مشاهده آمار، مدیریت اتوماسیون هوشمند کامنت‌ها و رصد دایرکت‌ها، پیج مورد نظر خود را انتخاب نمایید.
            </p>
          </div>

          {user.role === "superadmin" && (
            <Link href="/backoffice" className="shrink-0 self-center sm:self-auto">
              <Button size="sm" variant="secondary" className="text-xs gap-1.5 h-9 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن پیج جدید</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Account Cards Grid */}
        {accounts.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
            <InstagramIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">هیچ پیجی برای شما ثبت نشده است</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              هنوز پیج اینستاگرامی به حساب شما متصل نگردیده است. با مدیر سیستم تماس بگیرید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <Card
                key={acc.username}
                className="group relative flex flex-col justify-between overflow-hidden border border-border bg-card rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-zinc-300 transition-all duration-200"
              >
                <div>
                  {/* Card Header: Avatar & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="relative">
                      {acc.avatar_url ? (
                        <img
                          src={acc.avatar_url}
                          alt={acc.display_name || acc.username}
                          className="w-14 h-14 rounded-full object-cover border border-border ring-2 ring-zinc-100 shadow-2xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border border-border text-muted-foreground font-mono text-base font-bold">
                          {acc.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -end-1 bg-white p-0.5 rounded-full shadow-2xs">
                        <InstagramIcon className="w-4 h-4 text-pink-600" />
                      </div>
                    </div>

                    <div className="text-end">
                      {getBotStatusBadge(acc.bot_status || "unprovisioned")}
                    </div>
                  </div>

                  {/* Account Name & Bio */}
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {acc.display_name || acc.username}
                    </h3>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate dir-ltr text-end inline-block">
                      @{acc.username}
                    </div>

                    {acc.bio ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed h-8">
                        {acc.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic mt-2 h-8">
                        بدون بیوگرافی
                      </p>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border/60 text-xs mb-5">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-muted-foreground block">فالوورها</span>
                        <span className="font-semibold text-foreground">
                          {acc.followers_text || "۰"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-s border-border/80 ps-2.5">
                      <Film className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-muted-foreground block">پست‌ها</span>
                        <span className="font-semibold text-foreground">
                          {acc.posts_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enter Button */}
                <Link href={`/@${acc.username}/comments`} className="w-full">
                  <Button
                    variant="default"
                    className="w-full h-10 text-xs font-medium gap-2 justify-center group-hover:bg-primary/95 cursor-pointer shadow-2xs"
                  >
                    <span>ورود به پیشخوان پیج</span>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        سیستم اتوماسیون اینستاگرام InFlow • تمامی حقوق محفوظ است.
      </footer>
    </div>
  );
}
