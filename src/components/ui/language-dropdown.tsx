"use client";

import React, { useState, useRef, useEffect } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface LanguageDropdownProps {
  currentLang: Lang;
  onLangChange: (lang: Lang) => void;
  className?: string;
  size?: "sm" | "default";
}

interface LanguageOption {
  code: Lang;
  label: string;
  nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "fa", label: "فارسی", nativeLabel: "فارسی" },
  { code: "ar", label: "العربية", nativeLabel: "العربية" },
  { code: "en", label: "English", nativeLabel: "English" },
];

export function LanguageDropdown({
  currentLang,
  onLangChange,
  className,
  size = "default",
}: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const activeOption =
    LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const handleSelect = (code: Lang) => {
    onLangChange(code);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("inflow_lang", code);
        document.cookie = `inflow_lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.dir = code === "en" ? "ltr" : "rtl";
        document.documentElement.lang = code;
      } catch {
        // ignore
      }
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-start", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-outline-variant/80 bg-surface text-foreground hover:bg-surface-container font-medium transition-all cursor-pointer shadow-2xs select-none",
          size === "sm"
            ? "h-8 px-2.5 text-[11px]"
            : "h-9 px-3.5 text-xs"
        )}
      >
        <MaterialSymbol name="language" size={16} className="text-muted-foreground shrink-0" />
        <span className="font-semibold">{activeOption.nativeLabel}</span>
        <MaterialSymbol
          name="arrow_drop_down"
          size={18}
          className={cn(
            "text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full end-0 mt-1.5 w-36 rounded-2xl border border-outline-variant/80 bg-surface-container-high shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer select-none text-start",
                  isSelected
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-surface-container-highest"
                )}
              >
                <span>{lang.nativeLabel}</span>
                {isSelected && (
                  <MaterialSymbol name="check" size={16} className="text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}