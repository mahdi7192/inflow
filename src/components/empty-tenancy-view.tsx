"use client";

import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
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
      <Card className="max-w-md w-full p-8 shadow-sm border border-border bg-card rounded-xl">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          {t("noAccountsAssignedTitle")}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {t("noAccountsAssignedBody")}
        </p>

        <div className="p-3.5 bg-secondary/40 border border-border rounded-lg mb-6 text-xs text-muted-foreground text-start">
          <div className="flex justify-between items-center mb-1">
            <span className="text-muted-foreground">{t("usernameLabel")}:</span>
            <span className="font-mono text-foreground">@{user.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t("roleLabel")}:</span>
            <span className="text-foreground">
              {user.role === "superadmin" ? t("roleSuperadmin") : t("roleTenant")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={onLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
            <span>{t("logoutButton")}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
