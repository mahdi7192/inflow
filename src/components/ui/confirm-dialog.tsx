"use client";

import React, { useState, useEffect } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "تایید و ادامه",
  cancelText = "انصراف",
  variant = "destructive",
  loading = false,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !loading && !internalLoading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, internalLoading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const isSpinning = loading || internalLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!isSpinning) onClose();
        }}
      />

      {/* Dialog (M3 Alert Dialog) */}
      <div className="relative w-full max-w-md bg-surface-container-high border border-outline-variant/80 rounded-3xl p-6 shadow-xl z-10 animate-in fade-in zoom-in-95 duration-150 space-y-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
              variant === "destructive"
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-primary/10 text-primary border-primary/20"
            )}
          >
            <MaterialSymbol
              name={variant === "destructive" ? "warning" : "info"}
              size={24}
              fill
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-bold text-foreground">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={isSpinning}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container-highest transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <MaterialSymbol name="close" size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
          <Button
            type="button"
            variant="text"
            size="sm"
            disabled={isSpinning}
            onClick={onClose}
            className="text-xs cursor-pointer rounded-full"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "filled"}
            size="sm"
            disabled={isSpinning}
            onClick={handleConfirm}
            className="text-xs cursor-pointer shadow-xs gap-1.5 rounded-full"
          >
            {isSpinning && <MaterialSymbol name="progress_activity" size={16} className="animate-spin" />}
            <span>{confirmText}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}