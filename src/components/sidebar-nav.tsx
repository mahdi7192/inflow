"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Close account dropdown when clicking outside
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
        "h-full flex flex-col bg-surface-container border-e border-outline-variant/60 select-none transition-all duration-300 ease-in-out",
        isRail ? "w-20" : "w-72"
      )}
    >
      {/* Top Header: Brand Logo & Navigation Toggle (Google Drawer Header) */}
      <div className={cn(
        "h-16 px-4 flex items-center justify-between border-b border-outline-variant/40 shrink-0",
        isRail ? "justify-center px-2" : ""
      )}>
        {!isRail ? (
          <div className="flex items-center gap-3 min-w-0">
            {onToggleRail && (
              <button
                type="button"
                onClick={onToggleRail}
                className="hidden lg:flex p-2 rounded-full text-foreground/80 hover:bg-surface-container-high transition-colors cursor-pointer"
                title="تغییر حالت سایدبار"
                aria-label="Toggle rail"
              >
                <MaterialSymbol name="menu" size={22} />
              </button>
            )}
            <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity" title="مرکز انتخاب پیج‌ها">
              <BrandLogo size="default" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {onToggleRail && (
              <button
                type="button"
                onClick={onToggleRail}
                className="hidden lg:flex p-2 rounded-full text-foreground/80 hover:bg-surface-container-high transition-colors cursor-pointer"
                title="باز کردن منو"
                aria-label="Expand sidebar"
              >
                <MaterialSymbol name="menu_open" size={22} rtlMirror={true} />
              </button>
            )}
          </div>
        )}

        {/* Mobile Close Button */}
        {onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="lg:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label={t("closeMenu")}
          >
            <MaterialSymbol name="close" size={20} />
          </button>
        )}
      </div>

      {/* Account Switcher Section (M3 Compact/Expanded Card) */}
      <div className={cn("p-3 shrink-0", isRail ? "px-2" : "")}>
        <div className="relative" ref={dropdownRef}>
          {!isRail ? (
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/60 text-xs font-medium text-foreground transition-all cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                  <MaterialSymbol name="photo_camera" size={13} fill={true} />
                </div>
                <span className="truncate font-mono font-medium tracking-tight text-foreground">
                  <bdi>@{currentAccount || "---"}</bdi>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest",
                    isCurrentPaused ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  title={isCurrentPaused ? "اتوماسیون متوقف (پاز)" : "اتوماسیون فعال"}
                />
                <MaterialSymbol
                  name="expand_more"
                  size={18}
                  className={cn(
                    "text-muted-foreground transition-transform duration-200",
                    accountDropdownOpen && "rotate-180"
                  )}
                />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="w-12 h-12 mx-auto flex items-center justify-center rounded-2xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/60 transition-all cursor-pointer relative shadow-xs"
              title={`@${currentAccount}`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-2xs">
                <MaterialSymbol name="photo_camera" size={15} fill={true} />
              </div>
              <span
                className={cn(
                  "absolute bottom-1 end-1 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest",
                  isCurrentPaused ? "bg-amber-500" : "bg-emerald-500"
                )}
              />
            </button>
          )}

          {/* Account Dropdown Popover */}
          {accountDropdownOpen && (
            <div className={cn(
              "absolute top-full mt-2 rounded-3xl border border-outline-variant/70 bg-surface-container-lowest shadow-lg p-2 z-50 animate-in fade-in zoom-in-95",
              isRail ? "start-14 w-64" : "start-0 w-full"
            )}>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>{t("connectedAccounts") || "پیج‌های متصل"}</span>
                <span className="text-[10px] tabular-nums bg-surface-container px-2 py-0.5 rounded-full font-bold">
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
                        "w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs transition-all cursor-pointer text-start",
                        isSelected
                          ? "bg-primary-container text-on-primary-container font-semibold"
                          : "text-foreground/80 hover:bg-surface-container-high"
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
                        {acc.status === "paused" && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-medium">
                            متوقف
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <MaterialSymbol name="check" size={18} className="text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-px bg-outline-variant/50 my-1.5" />
              <Link
                href="/"
                onClick={() => setAccountDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs text-foreground/80 hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <MaterialSymbol name="grid_view" size={18} className="text-muted-foreground" />
                <span>همه پیج‌ها</span>
              </Link>
              {currentUser?.role === "superadmin" && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    onOpenAddAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs text-primary font-medium hover:bg-primary-container/40 transition-colors cursor-pointer"
                >
                  <MaterialSymbol name="add_circle" size={18} className="text-primary" />
                  <span>{t("addAccount")}</span>
                </button>
              )}
              {currentAccount && onOpenDeleteAccount && (
                <>
                  <div className="h-px bg-outline-variant/50 my-1.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onOpenDeleteAccount();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-start"
                  >
                    <MaterialSymbol name="delete" size={18} className="text-destructive" />
                    <span>حذف حساب از سامانه</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Items (M3 Navigation Rail or M3 Navigation Drawer) */}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
        {/* Comment Automation Destination */}
        {!isRail ? (
          <Link
            href={`/@${currentAccount}/comments`}
            onClick={() => {
              if (onNavigateCatalog) onNavigateCatalog();
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-full text-xs font-medium transition-all cursor-pointer text-start group",
              activePlugin === "comments"
                ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                : "text-foreground/80 hover:bg-surface-container-high"
            )}
          >
            <div className={cn(
              "w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-110",
              activePlugin === "comments" ? "text-primary" : "text-muted-foreground"
            )}>
              <MaterialSymbol name="forum" size={20} fill={activePlugin === "comments"} />
            </div>
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
            <div className={cn(
              "w-14 h-8 rounded-full flex items-center justify-center transition-all",
              activePlugin === "comments"
                ? "bg-primary-container text-on-primary-container"
                : "text-muted-foreground group-hover:bg-surface-container-high"
            )}>
              <MaterialSymbol name="forum" size={20} fill={activePlugin === "comments"} />
            </div>
            <span className={cn(
              "text-[10px] mt-1 transition-colors truncate max-w-full px-1",
              activePlugin === "comments" ? "font-bold text-primary" : "text-muted-foreground"
            )}>
              کامنت‌ها
            </span>
          </Link>
        )}

        {/* DM Automation Destination */}
        {!isRail ? (
          <Link
            href={`/@${currentAccount}/dms`}
            onClick={() => {
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-full text-xs font-medium transition-all cursor-pointer text-start group",
              activePlugin === "dms"
                ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                : "text-foreground/80 hover:bg-surface-container-high"
            )}
          >
            <div className={cn(
              "w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-110",
              activePlugin === "dms" ? "text-primary" : "text-muted-foreground"
            )}>
              <MaterialSymbol name="chat_bubble" size={20} fill={activePlugin === "dms"} />
            </div>
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
            <div className={cn(
              "w-14 h-8 rounded-full flex items-center justify-center transition-all",
              activePlugin === "dms"
                ? "bg-primary-container text-on-primary-container"
                : "text-muted-foreground group-hover:bg-surface-container-high"
            )}>
              <MaterialSymbol name="chat_bubble" size={20} fill={activePlugin === "dms"} />
            </div>
            <span className={cn(
              "text-[10px] mt-1 transition-colors truncate max-w-full px-1",
              activePlugin === "dms" ? "font-bold text-primary" : "text-muted-foreground"
            )}>
              دایرکت
            </span>
          </Link>
        )}

        <div className="h-px bg-outline-variant/40 my-3 mx-2" />

        {/* Back-Office Link (Superadmin Only) */}
        {currentUser?.role === "superadmin" && (
          !isRail ? (
            <Link
              href="/backoffice"
              onClick={() => {
                if (onCloseMobileDrawer) onCloseMobileDrawer();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-xs font-medium text-foreground/80 hover:bg-surface-container-high transition-all text-start group"
            >
              <div className="w-6 h-6 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                <MaterialSymbol name="admin_panel_settings" size={20} />
              </div>
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
              <div className="w-14 h-8 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-surface-container-high transition-all">
                <MaterialSymbol name="admin_panel_settings" size={20} />
              </div>
              <span className="text-[10px] mt-1 text-muted-foreground transition-colors truncate max-w-full px-1">
                بک‌آفیس
              </span>
            </Link>
          )
        )}
      </div>

      {/* Sync Button & System Actions */}
      <div className={cn("p-3 border-t border-outline-variant/40 shrink-0 space-y-2", isRail ? "px-2" : "")}>
        {!isRail ? (
          <Button
            variant="tonal"
            size="default"
            disabled={syncing}
            onClick={onSync}
            className="w-full justify-center gap-2 cursor-pointer rounded-full"
          >
            <MaterialSymbol
              name="sync"
              size={18}
              className={cn(syncing && "animate-spin")}
            />
            <span>{syncing ? t("syncing") : t("navSync")}</span>
          </Button>
        ) : (
          <button
            type="button"
            disabled={syncing}
            onClick={onSync}
            className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title={t("navSync")}
          >
            <MaterialSymbol
              name="sync"
              size={20}
              className={cn(syncing && "animate-spin")}
            />
          </button>
        )}
      </div>

      {/* Bottom User Profile & Logout Footer */}
      {currentUser && (
        <div className={cn(
          "p-3 border-t border-outline-variant/40 shrink-0 bg-surface-container-high/40",
          isRail ? "p-2 flex flex-col items-center" : ""
        )}>
          {!isRail ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0 uppercase border border-outline-variant/50">
                  {(currentUser.display_name || currentUser.username).slice(0, 1)}
                </div>
                <div className="flex flex-col min-w-0 text-start leading-tight">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {currentUser.display_name || currentUser.username}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
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
                className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
              >
                <MaterialSymbol name="logout" size={18} rtlMirror={true} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              title={t("logoutButton")}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <MaterialSymbol name="logout" size={20} rtlMirror={true} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
