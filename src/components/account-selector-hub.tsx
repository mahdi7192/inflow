"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MaterialSymbol } from "@/components/ui/material-symbol";
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
            className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] gap-1.5 px-2.5 py-0.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ربات فعال</span>
          </Badge>
        );
      case "login_required":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] gap-1 px-2.5 py-0.5"
          >
            <MaterialSymbol name="warning" size={14} className="text-amber-600" />
            <span>نیاز به ورود</span>
          </Badge>
        );
      case "provisioning":
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 text-[11px] gap-1 px-2.5 py-0.5"
          >
            <MaterialSymbol name="schedule" size={14} className="text-sky-600" />
            <span>در حال راه‌اندازی</span>
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] gap-1 px-2.5 py-0.5"
          >
            <MaterialSymbol name="error" size={14} className="text-rose-600" />
            <span>خطای ربات</span>
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-surface-container-high text-muted-foreground border-outline-variant text-[11px] gap-1 px-2.5 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span>راه‌اندازی نشده</span>
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-foreground flex flex-col antialiased">
      {/* Top App Bar M3 */}
      <header className="h-16 border-b border-outline-variant/70 bg-surface-container/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="default" />
          <span className="text-xs text-muted-foreground border-s border-outline-variant ps-3 hidden sm:inline">
            مرکز مدیریت پیج‌ها
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {user.role === "superadmin" && (
            <Link href="/backoffice">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 cursor-pointer"
              >
                <MaterialSymbol name="admin_panel_settings" size={18} />
                <span className="hidden sm:inline">پنل مدیریت سیستم</span>
                <span className="sm:hidden">مدیریت</span>
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant text-xs">
            <span className="text-muted-foreground">کاربر:</span>
            <span className="font-mono font-medium text-foreground">@{user.username}</span>
            {user.role === "superadmin" && (
              <Badge variant="secondary" className="text-[10px] py-0 px-2 rounded-full">
                مدیر کل
              </Badge>
            )}
          </div>

          <Button
            variant="text"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer"
            title="خروج از حساب کاربری"
          >
            <MaterialSymbol name="logout" size={18} />
            <span className="hidden sm:inline ms-1">خروج</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-start">
        {/* Welcome Section */}
        <div className="mb-8 text-center sm:text-start flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium mb-3">
              <MaterialSymbol name="sparkles" size={16} fill={true} />
              <span>پیشخوان مدیریت پیج‌های اینستاگرام</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              انتخاب پیج جهت ورود به پیشخوان
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
              جهت مشاهده آمار، پایش خودکار کامنت‌ها، مشاوره و پاسخ هوشمند به دایرکت‌ها، پیج مورد نظر را انتخاب کنید.
            </p>
          </div>

          {user.role === "superadmin" && (
            <Link href="/backoffice" className="shrink-0 self-center sm:self-auto">
              <Button size="sm" variant="tonal" className="text-xs gap-1.5 h-10 px-5 cursor-pointer">
                <MaterialSymbol name="add" size={18} />
                <span>افزودن پیج جدید</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Account Cards Grid */}
        {accounts.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-outline-variant rounded-3xl bg-surface-container-low">
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
                variant="outlined"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Card Header: Avatar & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="relative">
                      {acc.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={acc.avatar_url}
                          alt={acc.display_name || acc.username}
                          className="w-14 h-14 rounded-2xl object-cover border border-outline-variant shadow-2xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center border border-outline-variant text-muted-foreground font-mono text-base font-bold">
                          {acc.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -end-1 bg-surface-container-lowest p-1 rounded-full shadow-2xs border border-outline-variant/60">
                        <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {getBotStatusBadge(acc.bot_status || "unprovisioned")}
                      {acc.status === "paused" ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] px-2 py-0.5 font-medium"
                        >
                          اتوماسیون متوقف
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] px-2 py-0.5 font-medium"
                        >
                          اتوماسیون فعال
                        </Badge>
                      )}
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
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-surface-container border border-outline-variant/60 text-xs mb-5">
                    <div className="flex items-center gap-2">
                      <MaterialSymbol name="group" size={18} className="text-muted-foreground shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-muted-foreground block">فالوورها</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {acc.followers_text || "۰"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-s border-outline-variant ps-3">
                      <MaterialSymbol name="video_library" size={18} className="text-muted-foreground shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-muted-foreground block">پست‌ها</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {acc.posts_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enter Button */}
                <Link href={`/@${acc.username}/comments`} className="w-full">
                  <Button
                    variant="filled"
                    className="w-full h-11 text-xs font-medium gap-2 justify-center cursor-pointer shadow-2xs"
                  >
                    <span>ورود به پیشخوان پیج</span>
                    <MaterialSymbol name="arrow_back" size={18} className="transition-transform group-hover:-translate-x-1" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/60 py-4 text-center text-xs text-muted-foreground bg-surface-container-low">
        سیستم اتوماسیون اینستاگرام InFlow • تمامی حقوق محفوظ است.
      </footer>
    </div>
  );
}
