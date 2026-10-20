"use client";

import React, { useEffect } from "react";
import { Save, RotateCcw, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StickySaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  dirtyCount?: number;
  onSave: () => Promise<void> | void;
  onReset: () => void;
  saveLabel?: string;
  resetLabel?: string;
  dirtyMessage?: string;
  showSuccessCheck?: boolean;
  className?: string;
}

export function StickySaveBar({
  isDirty,
  isSaving,
  dirtyCount,
  onSave,
  onReset,
  saveLabel = "ذخیره تغییرات",
  resetLabel = "لغو تغییرات",
  dirtyMessage = "تغییرات ذخیره‌نشده دارید",
  showSuccessCheck = false,
  className,
}: StickySaveBarProps) {
  // Global Keyboard Shortcut: Cmd+S / Ctrl+S
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (isDirty && !isSaving) {
          onSave();
        }
      }
    }

    if (isDirty) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDirty, isSaving, onSave]);

  if (!isDirty && !showSuccessCheck) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 sm:bottom-6 inset-x-0 z-40 max-w-xl mx-auto px-4 pointer-events-none animate-in slide-in-from-bottom-5 duration-200",
        className
      )}
    >
      <div className="pointer-events-auto bg-card border border-border shadow-2xl rounded-2xl p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-4 backdrop-blur-md">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>

          <div className="text-xs truncate">
            <span className="font-medium text-foreground">
              {dirtyMessage}
            </span>
            {dirtyCount && dirtyCount > 1 ? (
              <span className="text-muted-foreground ms-1 font-mono text-[11px]">
                ({dirtyCount})
              </span>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer h-8 px-2.5"
          >
            <RotateCcw className="w-3.5 h-3.5 me-1.5" />
            <span>{resetLabel}</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isSaving}
            onClick={onSave}
            className="text-xs shadow-xs cursor-pointer h-8 px-3.5 gap-1.5 font-medium"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : showSuccessCheck ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "در حال ذخیره..." : saveLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
