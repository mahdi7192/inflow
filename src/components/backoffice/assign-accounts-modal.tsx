"use client";

import React, { useState } from "react";
import { X, Check, Link2, AlertCircle } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <Card
        dir={isRtl ? "rtl" : "ltr"}
        className="w-full max-w-lg p-6 shadow-lg relative text-foreground rounded-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-secondary text-foreground border border-border flex items-center justify-center">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {t("assignAccountsBtn")} &bull; @{user.username}
            </h2>
            <p className="text-xs text-muted-foreground">
              {user.display_name || user.username}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-muted-foreground mb-2">
            {t("selectAccountsLabel")}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {availableAccounts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground bg-secondary/50 rounded-xl border border-border">
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
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-start cursor-pointer ${
                      isChecked
                        ? "bg-secondary border-primary/50 text-foreground"
                        : "bg-card border-border text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-mono">
                        @{acc.username.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          @{acc.username}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {acc.display_name || acc.username}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })
            )}
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
