"use client";

import React, { useEffect, useRef } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { M3Switch } from "@/components/material/m3";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Modal side sheet (desktop) / bottom sheet (mobile)                          */
/* -------------------------------------------------------------------------- */

export function M3ModalSheet({
  open,
  onClose,
  dir,
  labelledBy,
  header,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  dir: "rtl" | "ltr";
  labelledBy: string;
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end overflow-hidden">
      {/* M3 scrim: 32% black */}
      <div
        className="fixed inset-0 bg-black/32 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        dir={dir}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 w-full md:max-w-xl lg:max-w-2xl bg-surface-container-low text-on-surface elevation-1 flex flex-col overflow-hidden",
          "h-[92dvh] md:h-full",
          "rounded-t-[28px] md:rounded-none md:rounded-s-[28px]",
          "animate-in slide-in-from-bottom md:slide-in-from-end duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
        )}
      >
        {/* Bottom-sheet drag handle (mobile only) */}
        <div className="md:hidden pt-4 pb-1 flex justify-center shrink-0">
          <div className="w-8 h-1 rounded-full bg-on-surface-variant/40" />
        </div>

        <header className="px-4 sm:px-6 pt-3 md:pt-6 pb-4 flex items-center justify-between gap-3 shrink-0">
          {header}
          <md-icon-button onClick={onClose} aria-label="بستن">
            <MaterialSymbol name="close" size={24} />
          </md-icon-button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-8 space-y-3">{children}</div>

        <footer className="px-4 sm:px-6 py-4 border-t border-outline-variant flex items-center justify-between gap-3 shrink-0 bg-surface-container-low">
          {footer}
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cards & rows                                                                */
/* -------------------------------------------------------------------------- */

/** M3 filled card. `tone` maps to the surface-container role. */
export function M3Card({
  tone = "default",
  className,
  children,
}: {
  tone?: "lowest" | "low" | "default" | "high" | "highest";
  className?: string;
  children: React.ReactNode;
}) {
  const bg = {
    lowest: "bg-surface-container-lowest",
    low: "bg-surface-container-low",
    default: "bg-surface-container",
    high: "bg-surface-container-high",
    highest: "bg-surface-container-highest",
  }[tone];
  return <section className={cn("rounded-2xl p-4 sm:p-5", bg, className)}>{children}</section>;
}

/** Leading icon + title/supporting text, with an optional trailing slot. */
export function M3SectionHeader({
  icon,
  title,
  supporting,
  trailing,
  iconClassName,
}: {
  icon: string;
  title: React.ReactNode;
  supporting?: React.ReactNode;
  trailing?: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <MaterialSymbol name={icon} size={22} className={cn("text-primary shrink-0 mt-0.5", iconClassName)} />
        <div className="min-w-0">
          <h3 className="title-small text-on-surface">{title}</h3>
          {supporting && <p className="body-small text-on-surface-variant mt-0.5">{supporting}</p>}
        </div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

/** List-item style row with a trailing M3 switch. */
export function M3SwitchRow({
  icon,
  title,
  supporting,
  selected,
  onChange,
  disabled,
  iconClassName,
}: {
  icon: string;
  title: React.ReactNode;
  supporting?: React.ReactNode;
  selected: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  iconClassName?: string;
}) {
  return (
    <M3SectionHeader
      icon={icon}
      title={title}
      supporting={supporting}
      iconClassName={iconClassName}
      trailing={
        <M3Switch
          selected={selected}
          onChange={onChange}
          disabled={disabled}
          ariaLabel={typeof title === "string" ? title : undefined}
        />
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Segmented buttons (single-select)                                           */
/* -------------------------------------------------------------------------- */

/**
 * M3 single-select segmented buttons (40dp, full-round ends, outline dividers,
 * secondary-container selection with a check icon). @material/web ships these
 * only in labs, so they're built from tokens here.
 */
export function M3SegmentedButtons<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string; icon?: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-full rounded-full border border-outline overflow-hidden divide-x divide-outline"
    >
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative flex-1 min-w-0 h-10 px-3 inline-flex items-center justify-center gap-1.5 label-large transition-colors cursor-pointer select-none",
              selected
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface hover:bg-on-surface/8"
            )}
          >
            <MaterialSymbol
              name={selected ? "check" : o.icon || "radio_button_unchecked"}
              size={18}
              className={cn("shrink-0", !selected && !o.icon && "hidden")}
            />
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
