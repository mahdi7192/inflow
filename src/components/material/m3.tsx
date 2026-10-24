"use client";

/**
 * Thin, fully-controlled React bindings for @material/web custom elements.
 *
 * Material web components own their internal state (a switch flips itself on
 * click, a filter chip toggles `selected`, a text field keeps its own value).
 * These wrappers listen to the native events, report the requested value to
 * React, and immediately re-sync the element from props so React state stays
 * the single source of truth — including when a parent rejects the change.
 */

import React, { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SwitchElement = HTMLElement & { selected: boolean; disabled: boolean };
type TextFieldElement = HTMLElement & { value: string };
type ChipElement = HTMLElement & { selected: boolean };
type TabsElement = HTMLElement & { activeTabIndex: number };

/** Keeps a ref pointed at the latest value for use inside native listeners. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/* -------------------------------------------------------------------------- */
/* Switch                                                                      */
/* -------------------------------------------------------------------------- */

export function M3Switch({
  selected,
  onChange,
  disabled = false,
  icons = true,
  ariaLabel,
  className,
}: {
  selected: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  icons?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<SwitchElement>(null);
  const selectedRef = useLatest(selected);
  const onChangeRef = useLatest(onChange);

  useLayoutEffect(() => {
    if (ref.current && ref.current.selected !== selected) ref.current.selected = selected;
  }, [selected]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => {
      const next = Boolean(el.selected);
      el.selected = selectedRef.current;
      onChangeRef.current(next);
    };
    el.addEventListener("change", handle);
    return () => el.removeEventListener("change", handle);
  }, [selectedRef, onChangeRef]);

  return (
    <md-switch
      ref={ref}
      selected={selected}
      disabled={disabled}
      icons={icons}
      show-only-selected-icon={icons}
      aria-label={ariaLabel}
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Outlined text field                                                         */
/* -------------------------------------------------------------------------- */

export function M3TextField({
  label,
  value,
  onValueChange,
  multiline = false,
  rows = 3,
  type = "text",
  placeholder,
  supportingText,
  maxLength,
  dir,
  leadingIcon,
  disabled = false,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "url" | "email" | "tel" | "search";
  placeholder?: string;
  supportingText?: string;
  maxLength?: number;
  dir?: "ltr" | "rtl";
  leadingIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<TextFieldElement>(null);
  const onValueChangeRef = useLatest(onValueChange);

  useLayoutEffect(() => {
    if (ref.current && ref.current.value !== value) ref.current.value = value;
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => onValueChangeRef.current(el.value ?? "");
    el.addEventListener("input", handle);
    return () => el.removeEventListener("input", handle);
  }, [onValueChangeRef]);

  return (
    <md-outlined-text-field
      ref={ref}
      label={label}
      value={value}
      type={multiline ? "textarea" : type}
      rows={multiline ? rows : undefined}
      placeholder={placeholder}
      supporting-text={supportingText}
      maxlength={maxLength}
      dir={dir}
      disabled={disabled}
      className={cn("w-full", className)}
    >
      {leadingIcon && <span slot="leading-icon">{leadingIcon}</span>}
    </md-outlined-text-field>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter chip                                                                 */
/* -------------------------------------------------------------------------- */

export function M3FilterChip({
  label,
  selected,
  onClick,
  elevated = false,
  disabled = false,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  elevated?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const ref = useRef<ChipElement>(null);
  const onClickRef = useLatest(onClick);

  useLayoutEffect(() => {
    if (ref.current && ref.current.selected !== selected) ref.current.selected = selected;
  }, [selected]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = (e: Event) => {
      // Cancel the chip's self-toggle; React props decide the selected state.
      e.preventDefault();
      onClickRef.current();
    };
    el.addEventListener("click", handle);
    return () => el.removeEventListener("click", handle);
  }, [onClickRef]);

  return (
    <md-filter-chip ref={ref} label={label} selected={selected} elevated={elevated} disabled={disabled}>
      {icon && <span slot="icon">{icon}</span>}
    </md-filter-chip>
  );
}

/** Simple assist chip that appends a snippet (prompt helpers, presets). */
export function M3AssistChip({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <md-assist-chip label={label} onClick={onClick}>
      {icon && <span slot="icon">{icon}</span>}
    </md-assist-chip>
  );
}

/* -------------------------------------------------------------------------- */
/* Primary tabs                                                                */
/* -------------------------------------------------------------------------- */

export interface M3TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function M3Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: M3TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<TabsElement>(null);
  const tabsRef = useLatest(tabs);
  const onChangeRef = useLatest(onChange);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === value)
  );

  useLayoutEffect(() => {
    if (ref.current && ref.current.activeTabIndex !== activeIndex) {
      ref.current.activeTabIndex = activeIndex;
    }
  }, [activeIndex]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => {
      const next = tabsRef.current[el.activeTabIndex];
      if (next) onChangeRef.current(next.id);
    };
    el.addEventListener("change", handle);
    return () => el.removeEventListener("change", handle);
  }, [tabsRef, onChangeRef]);

  return (
    <md-tabs ref={ref} aria-label={ariaLabel} className={className}>
      {tabs.map((t, i) => (
        <md-primary-tab key={t.id} active={i === activeIndex} inline-icon={Boolean(t.icon)}>
          {t.icon && <span slot="icon">{t.icon}</span>}
          <span className="inline-flex items-center gap-2">
            {t.label}
            {t.badge}
          </span>
        </md-primary-tab>
      ))}
    </md-tabs>
  );
}
