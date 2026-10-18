"use client";

import React, { useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateUserModalProps {
  lang: Lang;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ lang, onClose, onSuccess }: CreateUserModalProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"tenant" | "superadmin">("tenant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError(t("loginErrorRequired"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordPlaceholder"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/backoffice/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim() || username.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create user");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <Card
        dir={isRtl ? "rtl" : "ltr"}
        className="w-full max-w-md p-6 shadow-lg relative text-foreground rounded-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-secondary text-foreground border border-border flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{t("createUserBtn")}</h2>
            <p className="text-xs text-muted-foreground">{t("backofficeSubtitle")}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-medium text-foreground text-start">
              {t("usernameLabel")} *
            </label>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. client_sport"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-foreground text-start">
              {t("displayNameLabel")}
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-foreground text-start">
              {t("passwordLabel")} * (min 6)
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-foreground text-start">
              {t("roleLabel")}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "tenant" | "superadmin")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-2xs focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
            >
              <option value="tenant">{t("roleTenant")}</option>
              <option value="superadmin">{t("roleSuperadmin")}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
            >
              {loading ? "..." : t("saveUser")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
