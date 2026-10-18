"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  RotateCw,
  Terminal,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Check,
  Plus,
  LayoutGrid,
  X,
  Radio,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
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
  onOpenAgentApi: () => void;
  onSync: () => Promise<void>;
  syncing: boolean;
  currentUser?: SafeUser | null;
  onLogout: () => void;
  lang: Lang;
  onCloseMobileDrawer?: () => void;
  isCatalogActive?: boolean;
  onNavigateCatalog?: () => void;
}

export function SidebarNav({
  currentAccount,
  accounts,
  onSelectAccount,
  onOpenAddAccount,
  onOpenAgentApi,
  onSync,
  syncing,
  currentUser,
  onLogout,
  lang,
  onCloseMobileDrawer,
  isCatalogActive = true,
  onNavigateCatalog,
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

  return (
    <aside className="w-64 h-full flex flex-col bg-card border-e border-border select-none">
      {/* Top Header: Brand Logo & Mobile Close */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity" title="مرکز انتخاب پیج‌ها">
          <BrandLogo size="default" />
        </Link>
        {onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label={t("closeMenu")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Account Switcher Section */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/70 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 truncate">
              <InstagramIcon className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <span className="truncate">@{currentAccount || "---"}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-muted-foreground transition-transform duration-150",
                  accountDropdownOpen && "rotate-180"
                )}
              />
            </div>
          </button>

          {/* Account Dropdown Popover */}
          {accountDropdownOpen && (
            <div className="absolute top-full start-0 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("connectedAccounts") || "پیج‌های متصل"}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {accounts.map((acc) => {
                  const isSelected = acc.username === currentAccount;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleSelectAccount(acc.username)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-start",
                        isSelected
                          ? "bg-secondary text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate font-mono">@{acc.username}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-px bg-border my-1" />
              <Link
                href="/"
                onClick={() => setAccountDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>همه پیج‌ها</span>
              </Link>
              {currentUser?.role === "superadmin" && (
                <>
                  <div className="h-px bg-border my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onOpenAddAccount();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("addAccount")}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Catalog Navigation Link */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateCatalog) onNavigateCatalog();
            if (onCloseMobileDrawer) onCloseMobileDrawer();
          }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-start",
            isCatalogActive
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
          )}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span className="flex-1 truncate">{t("navCatalog")}</span>
        </button>

        {/* Hermes Agent API Trigger (Superadmin Only) */}
        {currentUser?.role === "superadmin" && (
          <button
            type="button"
            onClick={() => {
              onOpenAgentApi();
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer text-start"
          >
            <Terminal className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="flex-1 truncate">{t("navAgentApi")}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-emerald-700 bg-emerald-50 border-emerald-200">
              Active
            </Badge>
          </button>
        )}

        {/* Back-Office Link (Superadmin Only) */}
        {currentUser?.role === "superadmin" && (
          <Link
            href="/backoffice"
            onClick={() => {
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors text-start"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-zinc-900" />
            <span className="flex-1 truncate">{t("navBackoffice")}</span>
          </Link>
        )}
      </div>

      {/* Sync Action Area */}
      <div className="p-3 border-t border-border shrink-0">
        <Button
          variant="secondary"
          size="default"
          disabled={syncing}
          onClick={onSync}
          className="w-full justify-center gap-2 border-border hover:bg-secondary"
        >
          <RotateCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          <span>{syncing ? t("syncing") : t("navSync")}</span>
        </Button>
      </div>

      {/* Bottom User Profile & Logout Footer */}
      {currentUser && (
        <div className="p-3 border-t border-border shrink-0 bg-secondary/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-200 border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0 uppercase">
                {(currentUser.display_name || currentUser.username).slice(0, 1)}
              </div>
              <div className="flex flex-col min-w-0 text-start leading-tight">
                <span className="text-xs font-medium text-foreground truncate">
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
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
