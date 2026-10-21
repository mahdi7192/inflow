"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertCircle,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { I18N, Lang } from "@/lib/i18n";
import { BackofficeAccountItem } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface AccountTableProps {
  accounts: BackofficeAccountItem[];
  availableUsers: { id: number; username: string; display_name: string }[];
  lang: Lang;
  onRefresh: () => void;
}

export function AccountTable({
  accounts,
  availableUsers,
  lang,
  onRefresh,
}: AccountTableProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [assigningAccount, setAssigningAccount] = useState<string | null>(null);

  const handleQuickAssign = async (accountUsername: string, userIdStr: string) => {
    setAssigningAccount(accountUsername);
    try {
      const userId = userIdStr ? Number(userIdStr) : null;
      const res = await fetch(
        `/api/backoffice/accounts/${accountUsername}/assignment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setAssigningAccount(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/backoffice/accounts/${deleteTarget}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        onRefresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="py-16 text-center bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-zinc-100 text-zinc-400 mb-3">
          <InstagramIcon className="w-6 h-6 text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900">
          {lang === "fa" ? "هیچ پیجی در سامانه ثبت نشده است" : t("noPostsMatch")}
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          {lang === "fa"
            ? "برای اتصال پیج جدید، روی دکمه «ثبت پیج جدید» کلیک کنید."
            : t("createPageSubtitle")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" dir={isRtl ? "rtl" : "ltr"}>
            <thead className="bg-zinc-50/80 text-zinc-500 font-medium border-b border-zinc-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{t("colPage")}</th>
                <th className="py-3 px-4">{t("colOwner")}</th>
                <th className="py-3 px-4">{lang === "fa" ? "وضعیت نشست اکانت" : "Session Status"}</th>
                <th className="py-3 px-4">{lang === "fa" ? "تاریخ ثبت" : "Created At"}</th>
                <th className="py-3 px-4 text-center">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {accounts.map((acc) => {
                const isHealthy = acc.session_status === "active";

                return (
                  <tr
                    key={acc.id}
                    className="hover:bg-zinc-50/50 transition-colors group"
                  >
                    {/* Page Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 shrink-0 overflow-hidden shadow-2xs">
                          {acc.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={acc.avatar_url}
                              alt={acc.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <InstagramIcon className="w-4 h-4 text-zinc-700" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-zinc-900 truncate">
                              @{acc.username}
                            </span>
                            {!acc.display_name && (
                              <span
                                className="px-1.5 py-0.2 text-[10px] font-sans rounded bg-amber-50 text-amber-700 border border-amber-200/70"
                                title="Minimalist - Profile metadata will be synced directly"
                              >
                                {lang === "fa" ? "مینیمال" : "Minimal"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                            {acc.display_name && (
                              <span className="truncate max-w-[140px] text-zinc-600">
                                {acc.display_name}
                              </span>
                            )}
                            {acc.followers_text && (
                              <span>• {acc.followers_text} followers</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner Column (with quick assignment dropdown) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={acc.assigned_user?.id || ""}
                          disabled={assigningAccount === acc.username}
                          onChange={(e) =>
                            handleQuickAssign(acc.username, e.target.value)
                          }
                          className={`text-xs h-8 px-2.5 rounded-lg border focus:ring-1 focus:ring-zinc-900 transition-all ${
                            acc.assigned_user
                              ? "bg-zinc-50 border-zinc-200 text-zinc-800 font-medium"
                              : "bg-amber-50/50 border-amber-200 text-amber-800 font-normal"
                          }`}
                        >
                          <option value="">{t("unassignedOption")}</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.display_name} (@{u.username})
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Session Health Column */}
                    <td className="py-3.5 px-4">
                      {isHealthy ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{lang === "fa" ? "نشست فعال" : "Active"}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 ms-0.5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>{lang === "fa" ? "نیاز به ورود" : "Login Required"}</span>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 ms-0.5" />
                        </span>
                      )}
                    </td>

                    {/* Created Date Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>{acc.created_at || "—"}</span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/@${acc.username}/comments`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-medium border-zinc-200 hover:bg-zinc-100 text-zinc-800 shadow-2xs gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                            <span>{lang === "fa" ? "ورود به پیشخوان" : "Open Workspace"}</span>
                          </Button>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(acc.username)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={t("deletePageBtn")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Alert Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md p-6 bg-white border border-zinc-200 rounded-2xl shadow-2xl space-y-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 font-sans">
                {t("deletePageConfirmTitle")}
              </h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              {t("deletePageConfirmBody")} (
              <span className="font-mono font-semibold text-zinc-900">
                @{deleteTarget}
              </span>
              )
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-8 px-4 text-xs border-zinc-200 text-zinc-700"
              >
                {t("cancelBtn")}
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 px-4 text-xs bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs"
              >
                {deleting ? t("syncing") : t("deletePageBtn")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
