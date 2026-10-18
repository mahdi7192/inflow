"use client";

import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { SafeUser } from "@/lib/auth";

interface EmptyTenancyViewProps {
  user: SafeUser;
  lang: Lang;
  onLogout: () => void;
}

export function EmptyTenancyView({ user, lang, onLogout }: EmptyTenancyViewProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          {t("noAccountsAssignedTitle")}
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {t("noAccountsAssignedBody")}
        </p>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl mb-6 text-xs text-slate-400 text-start">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500">{t("usernameLabel")}:</span>
            <span className="font-mono text-slate-200">@{user.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">{t("roleLabel")}:</span>
            <span className="text-slate-200">
              {user.role === "superadmin" ? t("roleSuperadmin") : t("roleTenant")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>{t("logoutButton")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
