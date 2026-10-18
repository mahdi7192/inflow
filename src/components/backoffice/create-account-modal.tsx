"use client";

import React, { useState } from "react";
import { X, AlertCircle, Sparkles } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { I18N, Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateAccountModalProps {
  lang: Lang;
  availableUsers: { id: number; username: string; display_name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAccountModal({
  lang,
  availableUsers,
  onClose,
  onSuccess,
}: CreateAccountModalProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  const [username, setUsername] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!cleanUsername) {
      setError(t("pageUsernameLabel"));
      return;
    }

    if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleanUsername)) {
      setError(
        lang === "fa"
          ? "شناسه اینستاگرام باید ۱ تا ۳۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد، نقطه و زیرخط باشد."
          : "Instagram handle must be 1-30 characters containing only letters, numbers, dots, and underscores."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/backoffice/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          user_id: selectedUserId ? Number(selectedUserId) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to register page");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Network error");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card
        className="w-full max-w-lg overflow-hidden border-zinc-200 bg-white shadow-2xl rounded-2xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 text-white shadow-sm">
              <InstagramIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 font-sans tracking-tight">
                {t("createPageTitle")}
              </h2>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                {t("createPageSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Minimalist Tip Box */}
          <div className="flex items-start gap-2.5 p-3.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/70 rounded-xl">
            <Sparkles className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {lang === "fa"
                ? "هویت پیج صرفاً بر اساس شناسه است. اطلاعاتی مانند بیو، عکس پروفایل و تعداد فالوور به شکل خودکار توسط ایجنت در اولین گردش استخراج خواهند شد."
                : "Page identity is established by handle alone. Bio, avatar, and follower metrics are lazily enriched by the agent on its first run."}
            </span>
          </div>

          {/* Instagram Handle Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              {t("pageUsernameLabel")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span
                className={`absolute top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-mono ${
                  isRtl ? "right-3" : "left-3"
                }`}
              >
                @
              </span>
              <Input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="r9spoort1"
                className={`h-10 text-sm font-mono border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 ${
                  isRtl ? "pr-8 text-right" : "pl-8 text-left"
                }`}
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              {t("pageUsernamePlaceholder")}
            </p>
          </div>

          {/* Optional User Assignment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              {t("assignOwnerLabel")}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-shadow"
            >
              <option value="">{t("unassignedOption")}</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-xs font-medium text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            >
              {t("cancelBtn")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-4 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm"
            >
              {loading ? t("syncing") : t("registerPageSubmit")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
