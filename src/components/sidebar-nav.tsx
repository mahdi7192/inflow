"use client";

import React from "react";
import Link from "next/link";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { BrandLogo } from "@/components/ui/brand-logo";
import { I18N, Lang } from "@/lib/i18n";
import type { SafeUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type NavDestinationId = "comments" | "dms" | "backoffice";

export interface SidebarNavProps {
  /** `rail`: docked desktop navigation rail. `drawer`: modal navigation drawer (mobile). */
  variant: "rail" | "drawer";
  /** Rail only: expanded (labelled, 280px) vs compact (80px). */
  expanded?: boolean;
  currentAccount: string;
  onSync: () => Promise<void>;
  syncing: boolean;
  currentUser?: SafeUser | null;
  onLogout: () => void;
  lang: Lang;
  activePlugin?: "comments" | "dms";
  onNavigate?: () => void;
  onClose?: () => void;
}

interface Destination {
  id: NavDestinationId;
  href: string;
  icon: string;
  label: string;
  shortLabel: string;
  /** Which engine powers the destination — shown under the label when expanded. */
  engineHint: string;
}

export function SidebarNav({
  variant,
  expanded = false,
  currentAccount,
  onSync,
  syncing,
  currentUser,
  onLogout,
  lang,
  activePlugin = "comments",
  onNavigate,
  onClose,
}: SidebarNavProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isCompact = variant === "rail" && !expanded;

  const destinations: Destination[] = [
    {
      id: "comments",
      href: `/@${currentAccount}/comments`,
      icon: "forum",
      label: t("navComments"),
      shortLabel: "پست‌ها",
      engineHint: "قوانین قطعی پست، ریلز و استوری",
    },
    {
      id: "dms",
      href: `/@${currentAccount}/dms`,
      icon: "neurology",
      label: t("navDms"),
      shortLabel: "دستیار AI",
      engineHint: "دستیار ایجنتیک دایرکت (RAG)",
    },
  ];
  if (currentUser?.role === "superadmin") {
    destinations.push({
      id: "backoffice",
      href: "/backoffice",
      icon: "admin_panel_settings",
      label: t("navBackoffice"),
      shortLabel: "مدیریت",
      engineHint: "مدیریت کاربران و پیج‌ها",
    });
  }

  const syncLabel = syncing ? t("syncing") : "همگام‌سازی پیج";

  return (
    <aside
      className={cn(
        "h-full flex flex-col select-none shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
        variant === "drawer" ? "w-full" : isCompact ? "w-20" : "w-[280px]"
      )}
    >
      {/* Modal drawer headline */}
      {variant === "drawer" && (
        <div className="h-16 ps-6 pe-3 flex items-center justify-between shrink-0">
          <Link href="/" onClick={onClose} className="flex items-center gap-2" title="مرکز پیج‌ها">
            <BrandLogo size="default" />
            <span className="title-medium text-on-surface">
              in<span className="text-primary">Flow</span>
            </span>
          </Link>
          <md-icon-button onClick={onClose} aria-label={t("closeMenu")}>
            <MaterialSymbol name="close" size={24} />
          </md-icon-button>
        </div>
      )}

      {/* FAB: sync page (M3 rail places the FAB above destinations) */}
      <div className={cn("shrink-0 pt-2 pb-4", isCompact ? "flex justify-center" : "px-3")}>
        <md-fab
          variant="primary"
          size="medium"
          lowered
          label={isCompact ? undefined : syncLabel}
          aria-label={syncLabel}
          title={syncLabel}
          onClick={syncing ? undefined : onSync}
          className={cn(syncing && "opacity-60 pointer-events-none")}
        >
          <MaterialSymbol name="sync" size={24} slot="icon" className={cn(syncing && "animate-spin")} />
        </md-fab>
      </div>

      {/* Destinations */}
      <nav
        className={cn("flex-1 overflow-y-auto", isCompact ? "px-0 space-y-3" : "px-3 space-y-1")}
        aria-label="ناوبری اصلی"
      >
        {!isCompact && (
          <div className="px-4 pb-2 title-small text-on-surface-variant">{`@${currentAccount}`}</div>
        )}
        {destinations.map((d) => {
          const active = d.id === activePlugin;
          return isCompact ? (
            <Link
              key={d.id}
              href={d.href}
              onClick={onNavigate}
              title={d.label}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center gap-1 cursor-pointer"
            >
              <span
                className={cn(
                  "relative w-14 h-8 rounded-full flex items-center justify-center m3-active-indicator",
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant group-hover:bg-on-surface/8"
                )}
              >
                <MaterialSymbol name={d.icon} size={24} fill={active} />
              </span>
              <span className={cn("label-medium", active ? "text-on-surface" : "text-on-surface-variant")}>
                {d.shortLabel}
              </span>
            </Link>
          ) : (
            <Link
              key={d.id}
              href={d.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full min-h-14 ps-4 pe-6 py-2 rounded-full flex items-center gap-3 m3-active-indicator cursor-pointer",
                active
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-on-surface/8"
              )}
            >
              <MaterialSymbol name={d.icon} size={24} fill={active} className="shrink-0" />
              <span className="flex flex-col min-w-0">
                <span className={cn("label-large truncate", active ? "text-on-secondary-container" : "text-on-surface")}>
                  {d.label}
                </span>
                <span className="label-small font-normal truncate opacity-80">{d.engineHint}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: signed-in user + sign out */}
      {currentUser && (
        <div className={cn("shrink-0 p-3", isCompact && "flex justify-center")}>
          {isCompact ? (
            <md-icon-button onClick={onLogout} title={t("logoutButton")} aria-label={t("logoutButton")}>
              <MaterialSymbol name="logout" size={24} />
            </md-icon-button>
          ) : (
            <div className="flex items-center justify-between gap-2 ps-3 pe-1 py-2 rounded-2xl bg-surface-container">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center title-small uppercase shrink-0">
                  {(currentUser.display_name || currentUser.username).slice(0, 1)}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="label-large text-on-surface truncate">
                    {currentUser.display_name || currentUser.username}
                  </span>
                  <span className="label-small font-normal text-on-surface-variant truncate">
                    {currentUser.role === "superadmin" ? t("roleSuperadmin") : t("roleTenant")}
                  </span>
                </span>
              </div>
              <md-icon-button onClick={onLogout} title={t("logoutButton")} aria-label={t("logoutButton")}>
                <MaterialSymbol name="logout" size={22} />
              </md-icon-button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
