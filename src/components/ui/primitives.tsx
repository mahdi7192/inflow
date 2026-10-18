import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "emerald" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const variants = {
    default:
      "bg-white text-black hover:bg-zinc-200 font-medium shadow-xs",
    secondary:
      "bg-zinc-900 text-zinc-100 border border-white/10 hover:bg-zinc-800 hover:border-white/20",
    outline:
      "bg-transparent text-zinc-200 border border-white/12 hover:bg-white/5 hover:border-white/25",
    ghost:
      "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6",
    emerald:
      "bg-emerald-500 text-black font-semibold hover:bg-emerald-400 shadow-xs",
    danger:
      "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25",
  };

  const sizes = {
    default: "h-9 px-3.5 py-2 text-xs rounded-lg",
    sm: "h-7 px-2.5 text-[11px] rounded-md",
    lg: "h-11 px-5 text-sm rounded-xl",
    icon: "h-8 w-8 rounded-lg flex items-center justify-center",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?:
    | "default"
    | "emerald"
    | "amber"
    | "sky"
    | "purple"
    | "fuchsia"
    | "muted";
}) {
  const variants = {
    default: "bg-zinc-800 text-zinc-200 border-white/10",
    emerald: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/12 text-amber-400 border-amber-500/25",
    sky: "bg-sky-500/12 text-sky-400 border-sky-500/25",
    purple: "bg-purple-500/12 text-purple-400 border-purple-500/25",
    fuchsia: "bg-fuchsia-500/12 text-fuchsia-400 border-fuchsia-500/25",
    muted: "bg-zinc-900/90 text-zinc-400 border-white/8",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none",
        checked
          ? "bg-emerald-500 border-emerald-400"
          : "bg-zinc-800 border-white/15"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked
            ? "ltr:translate-x-5.5 rtl:-translate-x-5.5"
            : "ltr:translate-x-0.5 rtl:-translate-x-0.5"
        )}
      />
    </button>
  );
}
