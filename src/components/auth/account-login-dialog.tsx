"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

interface RemoteSocialAccount {
  id: string;
  platform: string;
  username?: string;
  handle?: string;
  display_name?: string;
  name?: string;
  status?: string;
}

interface AccountLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUsername?: string;
  lockUsername?: boolean;
  onSuccess?: (username: string) => void;
}

export function AccountLoginDialog({
  isOpen,
  onClose,
  defaultUsername = "",
  lockUsername = false,
  onSuccess,
}: AccountLoginDialogProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [remoteAccounts, setRemoteAccounts] = useState<RemoteSocialAccount[]>([]);
  const [selectedSocialId, setSelectedSocialId] = useState<string>("");
  const [manualSocialId, setManualSocialId] = useState<string>("");
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [defaultUsername]);

  const fetchConnectedSocialAccounts = async () => {
    setLoadingRemote(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/accounts/connect");
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setRemoteAccounts(data.accounts);
        const cleanUser = (defaultUsername || username).trim().toLowerCase().replace(/^@/, "");
        const matched = data.accounts.find(
          (a: RemoteSocialAccount) =>
            a.username?.toLowerCase() === cleanUser ||
            a.handle?.toLowerCase().replace(/^@/, "") === cleanUser
        );
        if (matched) {
          setSelectedSocialId(matched.id);
        } else if (data.accounts.length > 0) {
          setSelectedSocialId(data.accounts[0].id);
        }
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch {
      // Non-blocking on initial open
    } finally {
      setLoadingRemote(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConnectedSocialAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInitiateOAuth = async () => {
    setConnectingOAuth(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          username: username.trim().replace(/^@/, ""),
        }),
      });
      const data = await res.json();
      if (data.success && data.auth_url) {
        window.open(data.auth_url, "_blank", "noopener,noreferrer");
        toast.info(
          "پنجره احراز هویت رسمی باز شد. پس از تکمیل اتصال در SocialAPI، دکمه «تایید و همگام‌سازی اتصال» را بزنید."
        );
      } else {
        setErrorMsg(data.error || "لینک اتصال OAuth از سرویس SocialAPI.ai دریافت نشد.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "خطای شبکه");
    } finally {
      setConnectingOAuth(false);
    }
  };

  const handleSyncAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUsername = username.trim().replace(/^@/, "");
    const targetSocialId = manualSocialId.trim() || selectedSocialId;

    if (!targetUsername && !targetSocialId) {
      setErrorMsg("نام کاربری پیج یا شناسه اکانت SocialAPI الزامی است.");
      return;
    }

    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          username: targetUsername,
          social_account_id: targetSocialId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const resolvedUsername = data.account?.username || targetUsername;
        toast.success(data.message || `اکانت @${resolvedUsername} با موفقیت متصل شد.`);
        onSuccess?.(resolvedUsername);
        onClose();
      } else {
        setErrorMsg(data.error || "خطا در همگام‌سازی اکانت با SocialAPI.ai");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "خطای شبکه");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden p-6 text-zinc-900 font-vazir"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900">
              اتصال رسمی اینستاگرام (SocialAPI OAuth)
            </h3>
            <p className="text-xs text-zinc-500">
              احراز هویت امن از طریق API رسمی بدون نیاز به رمز عبور اینستاگرام
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSyncAndLink} className="mt-4 space-y-4">
          {/* Target Username */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              نام کاربری پیج اینستاگرام
            </label>
            {lockUsername || Boolean(defaultUsername) ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-100 border border-zinc-200 text-xs">
                <span className="font-mono font-bold text-zinc-900" dir="ltr">
                  @{username || defaultUsername}
                </span>
                <span className="text-[10px] text-zinc-500 bg-zinc-200/80 px-2 py-0.5 rounded font-medium">
                  پیج انتخاب‌شده
                </span>
              </div>
            ) : (
              <Input
                type="text"
                placeholder="مثال: r9spoort1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={syncing}
                dir="ltr"
                className="text-left font-mono text-xs"
              />
            )}
          </div>

          {/* Step 1: OAuth Authorization Redirect */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                گام اول: صدور مجوز رسمی OAuth
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                POST /v1/accounts/connect
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              با کلیک بر روی دکمه زیر، لینک رسمی اتصال اینستاگرام باز می‌شود تا بدون وارد کردن پسورد در سامانه، دسترسی استاندارد را تایید فرمایید.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleInitiateOAuth}
              disabled={connectingOAuth || syncing}
              className="w-full text-xs gap-2 cursor-pointer bg-white"
            >
              {connectingOAuth ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              <span>باز کردن درگاه اتصال رسمی اینستاگرام (OAuth)</span>
            </Button>
          </div>

          {/* Step 2: Select or Sync Connected Account from GET /v1/accounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800">
                گام دوم: انتخاب اکانت متصل‌شده در SocialAPI
              </label>
              <button
                type="button"
                onClick={fetchConnectedSocialAccounts}
                disabled={loadingRemote}
                className="text-[11px] text-zinc-600 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingRemote ? "animate-spin" : ""}`} />
                <span>بروزرسانی لیست</span>
              </button>
            </div>

            {remoteAccounts.length > 0 ? (
              <select
                value={selectedSocialId}
                onChange={(e) => setSelectedSocialId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-xs font-mono"
                dir="ltr"
              >
                {remoteAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.username || acc.handle || acc.display_name || acc.id} ({acc.id})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="text"
                placeholder="شناسه اکانت اختیاری (مثال: acc_01HZ9...)"
                value={manualSocialId}
                onChange={(e) => setManualSocialId(e.target.value)}
                dir="ltr"
                className="text-left font-mono text-xs"
              />
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              تمامی تعاملات کامنت، دایرکت و وب‌هوک‌ها از طریق زیرساخت رسمی SocialAPI.ai انجام می‌شوند.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={syncing}
              className="text-xs cursor-pointer"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={syncing}
              className="text-xs bg-zinc-900 text-white hover:bg-zinc-800 gap-1.5 cursor-pointer"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال همگام‌سازی...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تایید و همگام‌سازی اتصال</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
