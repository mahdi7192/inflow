"use client";

import React, { useState } from "react";
import { X, Check, Link2, AlertCircle } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";

interface AccountOption {
  username: string;
  display_name: string;
  avatar_url: string;
}

interface UserSummary {
  id: number;
  username: string;
  display_name: string;
  assigned_accounts: string[];
}

interface AssignAccountsModalProps {
  user: UserSummary;
  availableAccounts: AccountOption[];
  lang: Lang;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignAccountsModal({
  user,
  availableAccounts,
  lang,
  onClose,
  onSuccess,
}: AssignAccountsModalProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  const [selected, setSelected] = useState<string[]>(user.assigned_accounts || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAccount = (username: string) => {
    setSelected((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/backoffice/users/${user.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_usernames: selected }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update assignments");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Network error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-slate-100"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {t("assignAccountsBtn")} &bull; @{user.username}
            </h2>
            <p className="text-xs text-slate-400">
              {user.display_name || user.username}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-slate-400 mb-2">
            {t("selectAccountsLabel")}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {availableAccounts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                هیچ پیج اینستاگرامی ثبت نشده است.
              </div>
            ) : (
              availableAccounts.map((acc) => {
                const isChecked = selected.includes(acc.username);
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => toggleAccount(acc.username)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-start cursor-pointer ${
                      isChecked
                        ? "bg-purple-600/15 border-purple-500/40 text-white"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono">
                        @{acc.username.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          @{acc.username}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {acc.display_name || acc.username}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              {t("cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "..." : t("saveUser")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
