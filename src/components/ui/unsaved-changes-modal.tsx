"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
  title?: string;
  description?: string;
  stayLabel?: string;
  discardLabel?: string;
}

export function UnsavedChangesModal({
  isOpen,
  onStay,
  onDiscard,
  title = "تغییرات ذخیره‌نشده دارید",
  description = "در صورت ترک صفحه، تغییراتی که اعمال کرده‌اید ذخیره نخواهند شد. آیا مطمئنید که می‌خواهید خارج شوید؟",
  stayLabel = "ماندن در صفحه",
  discardLabel = "خروج بدون ذخیره",
}: UnsavedChangesModalProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onStay();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onStay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onStay}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onStay}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStay}
            className="text-xs cursor-pointer"
          >
            {stayLabel}
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDiscard}
            className="text-xs cursor-pointer shadow-xs"
          >
            {discardLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
