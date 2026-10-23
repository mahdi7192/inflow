"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { BrandLogo } from "@/components/ui/brand-logo";
import { I18N, Lang } from "@/lib/i18n";
import type { AccountRow } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface SidebarNavProps {
  currentAccount: string;
  accounts: AccountRow[];
  onSelectAccount: (username: string) => void;
  onOpenAddAccount: () => void;
  onSync: () => Promise<void>;
  syncing: boolean;
  currentUser?: SafeUser | null;
  onLogout: () => void;
  lang: Lang;
  onCloseMobileDrawer?: () => void;
  activePlugin?: "comments" | "dms";
  isCatalogActive?: boolean;
  onNavigateCatalog?: () => void;
  onOpenDeleteAccount?: () => void;
  isRail?: boolean;
  onToggleRail?: () => void;
}

export function SidebarNav({
  currentAccount,
  accounts,
  onSelectAccount,
  onOpenAddAccount,
  onSync,
  syncing,
  currentUser,
  onLogout,
  lang,
  onCloseMobileDrawer,
  activePlugin = "comments",
  onNavigateCatalog,
  onOpenDeleteAccount,
  isRail = false,
  onToggleRail,
}: SidebarNavProps) {
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setAccountDropdownOpen(false);
      }
    }
    if (accountDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountDropdownOpen]);

  const handleSelectAccount = (username: string) => {
    onSelectAccount(username);
    setAccountDropdownOpen(false);
  };

  const currentAccObj = accounts.find((a) => a.username === currentAccount);
  const isCurrentPaused = currentAccObj?.status === "paused";

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-transparent select-none transition-all duration-300 ease-in-out shrink-0",
        isRail ? "w-20" : "w-64 xl:w-72"
      )}
    >
      {/* 1. Header: Logo & Rail Toggle (Google Drive Clean Style) */}
      <div
        className={cn(
          "h-16 px-4 flex items-center justify-between shrink-0",
          isRail ? "justify-center px-2" : ""
        )}
      >
        {!isRail ? (
          <div className="flex items-center gap-2 min-w-0">
            {onToggleRail && (
              <button
                type="button"
                onClick={onToggleRail}
                className="hidden lg:inline-flex p-2 rounded-full text-[#444746] hover:bg-[#e9eef6] dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="تغییر ابعاد منو"
                aria-label="Toggle rail"
              >
                <MaterialSymbol name="menu" size={22} />
              </button>
            )}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              title="مرکز پیج‌ها"
            >
              <BrandLogo size="default" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {onToggleRail && (
              <button
                type="button"
                onClick={onToggleRail}
                className="hidden lg:inline-flex p-2 rounded-full text-[#444746] hover:bg-[#e9eef6] dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="گسترش منو"
                aria-label="Expand sidebar"
              >
                <MaterialSymbol name="menu" size={22} />
              </button>
            )}
          </div>
        )}

        {/* Mobile Close Button */}
        {onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="lg:hidden p-2 rounded-full text-[#444746] hover:bg-[#e9eef6] dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label={t("closeMenu")}
          >
            <MaterialSymbol name="close" size={22} />
          </button>
        )}
      </div>

      {/* 2. Google Drive Iconic "+ New" Elevated Action Button */}
      <div className={cn("px-4 py-2 shrink-0", isRail ? "px-2 flex justify-center" : "")}>
        {!isRail ? (
          <button
            type="button"
            disabled={syncing}
            onClick={onSync}
            className="w-full h-13 px-5 rounded-2xl bg-white dark:bg-[#282a2d] hover:bg-[#f8fafd] dark:hover:bg-[#333538] text-[#1f1f1f] dark:text-[#e2e2e6] shadow-[0_1px_3px_0_rgba(60,64,67,0.25),0_3px_8px_2px_rgba(60,64,67,0.12)] hover:shadow-[0_2px_6px_0_rgba(60,64,67,0.25),0_6px_14px_3px_rgba(60,64,67,0.12)] transition-all flex items-center gap-3.5 text-sm font-bold cursor-pointer select-none active:scale-[0.98] disabled:opacity-60"
          >
            <MaterialSymbol
              name="sync"
              size={22}
              className={cn("text-[#0b57d0] dark:text-[#a8c7fa] shrink-0", syncing && "animate-spin")}
            />
            <span className="truncate">{syncing ? t("syncing") : "همگام‌سازی پیج"}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={syncing}
            onClick={onSync}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#282a2d] hover:bg-[#f8fafd] dark:hover:bg-[#333538] text-[#1f1f1f] dark:text-[#e2e2e6] shadow-[0_1px_3px_0_rgba(60,64,67,0.25),0_3px_8px_2px_rgba(60,64,67,0.12)] hover:shadow-md transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 disabled:opacity-60"
            title="همگام‌سازی پیج"
          >
            <MaterialSymbol
              name="sync"
              size={22}
              className={cn("text-[#0b57d0] dark:text-[#a8c7fa]", syncing && "animate-spin")}
            />
          </button>
        )}
      </div>

      {/* 3. Account Switcher (Google Drive Folder Pill Style) */}
      <div className={cn("px-3 py-1.5 shrink-0", isRail ? "px-2" : "")} ref={dropdownRef}>
        <div className="relative">
          {!isRail ? (
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-full hover:bg-[#e9eef6]/70 dark:hover:bg-neutral-800 text-start transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                  <MaterialSymbol name="photo_camera" size={15} fill />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-mono font-bold text-xs text-[#1f1f1f] dark:text-[#e2e2e6]">
                    <bdi>@{currentAccount || "---"}</bdi>
                  </span>
                  <span className="text-[10px] text-[#444746] dark:text-neutral-400 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isCurrentPaused ? "bg-amber-500" : "bg-emerald-500"
                      )}
                    />
                    <span>{isCurrentPaused ? "متوقف" : "متصل"}</span>
                  </span>
                </div>
              </div>
              <MaterialSymbol
                name="arrow_drop_down"
                size={22}
                className={cn(
                  "text-[#444746] dark:text-neutral-400 transition-transform duration-200 shrink-0",
                  accountDropdownOpen && "rotate-180"
                )}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-full hover:bg-[#e9eef6] dark:hover:bg-neutral-800 transition-colors cursor-pointer relative"
              title={`@${currentAccount}`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white">
                <MaterialSymbol name="photo_camera" size={15} fill />
              </div>
              <span
                className={cn(
                  "absolute bottom-0 end-0 w-2 h-2 rounded-full ring-2 ring-white dark:ring-neutral-900",
                  isCurrentPaused ? "bg-amber-500" : "bg-emerald-500"
                )}
              />
            </button>
          )}

          {/* Account Dropdown Popover */}
          {accountDropdownOpen && (
            <div
              className={cn(
                "absolute top-full mt-1.5 rounded-2xl bg-white dark:bg-[#1e1f20] shadow-[0_4px_16px_rgba(0,0,0,0.14)] border border-[#e0e3e8]/70 dark:border-neutral-800 p-2 z-50 animate-in fade-in zoom-in-95",
                isRail ? "start-12 w-64" : "start-0 w-full"
              )}
            >
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#444746] dark:text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>پیج‌های متصل</span>
                <span className="text-[10px] tabular-nums bg-[#e9eef6] dark:bg-neutral-800 px-2 py-0.5 rounded-full font-bold">
                  {accounts.length}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 p-0.5">
                {accounts.map((acc) => {
                  const isSelected = acc.username === currentAccount;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleSelectAccount(acc.username)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-colors cursor-pointer text-start",
                        isSelected
                          ? "bg-[#c2e7ff] text-[#001d35] font-bold dark:bg-[#004a77] dark:text-[#c2e7ff]"
                          : "text-[#1f1f1f] dark:text-neutral-200 hover:bg-[#e9eef6] dark:hover:bg-neutral-800"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            acc.status === "paused" ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                        <span className="truncate font-mono"><bdi>@{acc.username}</bdi></span>
                      </div>
                      {isSelected && (
                        <MaterialSymbol name="check" size={18} className="text-[#001d35] dark:text-[#c2e7ff] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-[#e0e3e8]/70 dark:bg-neutral-800 my-1.5" />

              <Link
                href="/"
                onClick={() => setAccountDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs text-[#1f1f1f] dark:text-neutral-200 hover:bg-[#e9eef6] dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <MaterialSymbol name="grid_view" size={18} className="text-[#444746] dark:text-neutral-400" />
                <span>همه پیج‌ها</span>
              </Link>

              {currentUser?.role === "superadmin" && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    onOpenAddAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs text-[#0b57d0] dark:text-[#a8c7fa] font-bold hover:bg-[#c2e7ff]/40 transition-colors cursor-pointer"
                >
                  <MaterialSymbol name="add" size={18} />
                  <span>{t("addAccount")}</span>
                </button>
              )}

              {currentAccount && onOpenDeleteAccount && (
                <>
                  <div className="h-px bg-[#e0e3e8]/70 dark:bg-neutral-800 my-1.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onOpenDeleteAccount();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-start font-medium"
                  >
                    <MaterialSymbol name="delete" size={18} />
                    <span>حذف حساب از سامانه</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Google Drive Navigation Links (Rounded-full Horizontal Pills) */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="سایدبار اصلی">
        {/* Comments Destination */}
        {!isRail ? (
          <Link
            href={`/@${currentAccount}/comments`}
            onClick={() => {
              if (onNavigateCatalog) onNavigateCatalog();
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className={cn(
              "w-full h-11 px-4 rounded-full flex items-center gap-3.5 text-xs transition-colors cursor-pointer text-start",
              activePlugin === "comments"
                ? "bg-[#c2e7ff] text-[#001d35] font-bold dark:bg-[#004a77] dark:text-[#c2e7ff]"
                : "text-[#444746] dark:text-neutral-300 hover:bg-[#e9eef6]/70 dark:hover:bg-neutral-800 font-medium"
            )}
          >
            <MaterialSymbol
              name="forum"
              size={20}
              fill={activePlugin === "comments"}
              className={activePlugin === "comments" ? "text-[#001d35] dark:text-[#c2e7ff]" : "text-[#444746] dark:text-neutral-400"}
            />
            <span className="flex-1 truncate">{t("navComments")}</span>
          </Link>
        ) : (
          <Link
            href={`/@${currentAccount}/comments`}
            onClick={() => {
              if (onNavigateCatalog) onNavigateCatalog();
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            title={t("navComments")}
            className="flex flex-col items-center py-2 text-center group cursor-pointer"
          >
            <div
              className={cn(
                "w-12 h-8 rounded-full flex items-center justify-center transition-colors",
                activePlugin === "comments"
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]"
                  : "text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6] dark:group-hover:bg-neutral-800"
              )}
            >
              <MaterialSymbol name="forum" size={20} fill={activePlugin === "comments"} />
            </div>
            <span className="text-[10px] mt-1 transition-colors truncate max-w-full px-1">
              کامنت‌ها
            </span>
          </Link>
        )}

        {/* DMs Destination */}
        {!isRail ? (
          <Link
            href={`/@${currentAccount}/dms`}
            onClick={() => {
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className={cn(
              "w-full h-11 px-4 rounded-full flex items-center gap-3.5 text-xs transition-colors cursor-pointer text-start",
              activePlugin === "dms"
                ? "bg-[#c2e7ff] text-[#001d35] font-bold dark:bg-[#004a77] dark:text-[#c2e7ff]"
                : "text-[#444746] dark:text-neutral-300 hover:bg-[#e9eef6]/70 dark:hover:bg-neutral-800 font-medium"
            )}
          >
            <MaterialSymbol
              name="chat_bubble"
              size={20}
              fill={activePlugin === "dms"}
              className={activePlugin === "dms" ? "text-[#001d35] dark:text-[#c2e7ff]" : "text-[#444746] dark:text-neutral-400"}
            />
            <span className="flex-1 truncate">{t("navDms")}</span>
          </Link>
        ) : (
          <Link
            href={`/@${currentAccount}/dms`}
            onClick={() => {
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            title={t("navDms")}
            className="flex flex-col items-center py-2 text-center group cursor-pointer"
          >
            <div
              className={cn(
                "w-12 h-8 rounded-full flex items-center justify-center transition-colors",
                activePlugin === "dms"
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]"
                  : "text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6] dark:group-hover:bg-neutral-800"
              )}
            >
              <MaterialSymbol name="chat_bubble" size={20} fill={activePlugin === "dms"} />
            </div>
            <span className="text-[10px] mt-1 transition-colors truncate max-w-full px-1">
              دایرکت
            </span>
          </Link>
        )}

        {/* Superadmin Backoffice */}
        {currentUser?.role === "superadmin" && (
          <>
            <div className="h-px bg-[#e0e3e8]/70 dark:bg-neutral-800 my-2 mx-2" />
            {!isRail ? (
              <Link
                href="/backoffice"
                onClick={() => {
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className="w-full h-11 px-4 rounded-full flex items-center gap-3.5 text-xs text-[#444746] dark:text-neutral-300 hover:bg-[#e9eef6]/70 dark:hover:bg-neutral-800 transition-colors text-start"
              >
                <MaterialSymbol name="admin_panel_settings" size={20} className="text-[#444746] dark:text-neutral-400" />
                <span className="flex-1 truncate">{t("navBackoffice")}</span>
              </Link>
            ) : (
              <Link
                href="/backoffice"
                onClick={() => {
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                title={t("navBackoffice")}
                className="flex flex-col items-center py-2 text-center group cursor-pointer"
              >
                <div className="w-12 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-neutral-400 group-hover:bg-[#e9eef6] dark:group-hover:bg-neutral-800">
                  <MaterialSymbol name="admin_panel_settings" size={20} />
                </div>
                <span className="text-[10px] mt-1 transition-colors truncate max-w-full px-1">
                  مدیریت
                </span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* 5. Clean User Profile Footer (No harsh borders) */}
      {currentUser && (
        <div
          className={cn(
            "p-3 shrink-0",
            isRail ? "p-2 flex flex-col items-center" : ""
          )}
        >
          {!isRail ? (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-full hover:bg-[#e9eef6]/50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff] flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                  {(currentUser.display_name || currentUser.username).slice(0, 1)}
                </div>
                <div className="flex flex-col min-w-0 text-start leading-tight">
                  <span className="text-xs font-bold text-[#1f1f1f] dark:text-[#e2e2e6] truncate">
                    {currentUser.display_name || currentUser.username}
                  </span>
                  <span className="text-[10px] text-[#444746] dark:text-neutral-400 truncate">
                    {currentUser.role === "superadmin"
                      ? t("roleSuperadmin")
                      : t("roleTenant")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title={t("logoutButton")}
                className="p-1.5 rounded-full text-[#444746] hover:text-rose-600 hover:bg-rose-50 dark:text-neutral-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              >
                <MaterialSymbol name="logout" size={18} rtlMirror />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              title={t("logoutButton")}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#444746] hover:text-rose-600 hover:bg-rose-50 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <MaterialSymbol name="logout" size={20} rtlMirror />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
