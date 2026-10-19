"use client";

import React, { useState } from "react";
import { X, Trash2, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-vazir"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                حذف حساب و پاک‌سازی کامل ردپای ربات
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                @{cleanAccount}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleDelete} className="p-5 space-y-4">
          {/* Explicit Guarantee Box: Instagram App Is Completely Safe */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>پیج و اکانت اینستاگرام شما کاملاً امن و دست‌نخورده باقی می‌ماند</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-300/90">
              این عملیات هیچ‌گونه تاثیری بر روی اپلیکیشن اینستاگرام، پست‌ها، استوری‌ها، فالوورها و پیام‌های اکانت اصلی شما ندارد. ما هیچ تغییری در اینستاگرام ایجاد نمی‌کنیم.
            </p>
          </div>

          {/* What Gets Permanently Wiped From inFlow Server */}
          <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
              <span>مواردی که بدون ذره‌ای ردپا از روی این سرور حذف می‌شوند:</span>
            </div>
            <ul className="text-[11px] text-muted-foreground list-disc list-inside space-y-1 leading-relaxed">
              <li>
                <strong className="text-foreground">پروفایل ربات و فایل‌های مرورگر:</strong> پوشه ایزوله اختصاصی هرمس روی سرور، نشست‌ها، کوکی‌ها و توکن‌ها کاملاً پاک می‌شوند.
              </li>
              <li>
                <strong className="text-foreground">سرویس پس‌زمینه (ورکر):</strong> پردازش پایش خودکار کامنت‌ها در پس‌زمینه متوقف و غیرفعال می‌گردد.
              </li>
              <li>
                <strong className="text-foreground">داده‌ها و لاگ‌ها در دیتابیس:</strong> تمامی تنظیمات پست‌ها، قوانین هوش مصنوعی، تاریخچه کامنت‌ها و پیام‌های دایرکت ثبت‌شده در سامانه حذف اتمیک خواهند شد.
              </li>
            </ul>
          </div>

          {/* Confirmation Input Field */}
          <div className="space-y-2 pt-1">
            <label className="text-xs text-muted-foreground block">
              جهت تایید نهایی، عبارت <span className="font-mono font-bold text-destructive select-all">{cleanAccount}</span> را در کادر زیر وارد کنید:
            </label>
            <Input
              type="text"
              placeholder={cleanAccount}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={deleting}
              dir="ltr"
              className="font-mono text-center text-sm border-border focus-visible:ring-destructive"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
              disabled={deleting}
              className="text-xs"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="default"
              disabled={!isConfirmed || deleting}
              className="gap-2 text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال پاک‌سازی کامل ردپا...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>حذف قطعی حساب و ربات از سرور</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
