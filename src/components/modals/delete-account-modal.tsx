"use client";

import React, { useState } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DeleteAccountModalProps {
  open: boolean;
  account: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({
  open,
  account,
  onClose,
  onDeleted,
}: DeleteAccountModalProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const cleanAccount = account.replace(/^@/, "").trim().toLowerCase();
  const isConfirmed = confirmInput.replace(/^@/, "").trim().toLowerCase() === cleanAccount;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${cleanAccount}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "خطا در حذف اکانت از سامانه");
      }

      onDeleted();
    } catch (err: unknown) {
      setError((err as Error).message || "خطای ناشناخته رخ داد.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans text-foreground"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-outline-variant bg-surface-container-high shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/60 px-6 py-4 bg-rose-500/10">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <div className="p-2 rounded-2xl bg-rose-500/15">
              <MaterialSymbol name="delete" size={24} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                حذف حساب و پاک‌سازی کامل ردپای ربات
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                @{cleanAccount}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <MaterialSymbol name="close" size={20} />
          </button>
        </div>

        <form onSubmit={handleDelete} className="p-6 space-y-4">
          {/* Explicit Guarantee Box */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-xs text-emerald-700 dark:text-emerald-400">
              <MaterialSymbol name="verified_user" size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>پیج و اکانت اینستاگرام شما کاملاً امن و دست‌نخورده باقی می‌ماند</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-300/90">
              این عملیات هیچ‌گونه تاثیری بر روی اپلیکیشن اینستاگرام، پست‌ها، استوری‌ها، فالوورها و پیام‌های اکانت اصلی شما ندارد. ما هیچ تغییری در اینستاگرام ایجاد نمی‌کنیم.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <MaterialSymbol name="warning" size={16} className="text-amber-500" />
              <span>موارد زیر از سرور InFlow کاملاً حذف و پاک‌سازی می‌شوند:</span>
            </div>
            <ul className="space-y-1 list-disc list-inside ps-1 text-[11px]">
              <li>نشست امنیتی و سشن اتصال ربات به اینستاگرام</li>
              <li>تاریخچه کامنت‌ها و گزارش دایرکت‌های ثبت‌شده در این پنل</li>
              <li>سناریوها، تقلب‌نامه‌ها و پرامپت‌های اختصاصی این پیج</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="text-xs font-medium text-foreground block">
              جهت تایید نهایی، نام کاربری <span className="font-mono font-bold text-rose-600">@{cleanAccount}</span> را تایپ کنید:
            </label>
            <Input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`@${cleanAccount}`}
              className="font-mono text-xs text-center"
              dir="ltr"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline-variant/60">
            <Button
              type="button"
              variant="text"
              onClick={onClose}
              disabled={deleting}
              className="text-xs"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={!isConfirmed || deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-2"
            >
              {deleting ? (
                <>
                  <MaterialSymbol name="progress_activity" size={18} className="animate-spin" />
                  <span>در حال پاک‌سازی...</span>
                </>
              ) : (
                <>
                  <MaterialSymbol name="delete_forever" size={18} />
                  <span>تایید و حذف کامل اکانت</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
