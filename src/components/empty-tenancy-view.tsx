"use client";

import React from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { I18N, Lang } from "@/lib/i18n";
import { SafeUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      <Card className="max-w-md w-full p-8 shadow-xs border border-outline-variant/80 bg-surface-container-lowest rounded-3xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
          <MaterialSymbol name="gpp_maybe" size={32} fill />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          {t("noAccountsAssignedTitle")}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {t("noAccountsAssignedBody")}
        </p>

        <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-2xl mb-6 text-xs text-muted-foreground text-start space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t("usernameLabel")}:</span>
            <span className="font-mono font-bold text-foreground">@{user.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t("roleLabel")}:</span>
            <span className="text-foreground font-medium">
              {user.role === "superadmin" ? t("roleSuperadmin") : t("roleTenant")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <Button
            type="button"
            variant="tonal"
            onClick={onLogout}
            className="w-full sm:w-auto rounded-full gap-2 px-6"
          >
            <MaterialSymbol name="logout" size={18} rtlMirror />
            <span>{t("logoutButton")}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}