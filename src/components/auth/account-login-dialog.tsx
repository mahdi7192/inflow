"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
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
  onSuccess,
}: AccountLoginDialogProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWaitingOAuth, setIsWaitingOAuth] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanUser = (username || defaultUsername).trim().toLowerCase().replace(/^@/, "");

  useEffect(() => {
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [defaultUsername]);

  const handleFinalizeSync = useCallback(async () => {
    if (!cleanUser) return;
    setIsSyncing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          username: cleanUser,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || `پیج @${cleanUser} با موفقیت فعال شد.`);
        onSuccess?.(cleanUser);
        onClose();
      } else {
        setErrorMsg(data.error || "تایید اتصال انجام نشد. آیا لاگین اینستاگرام را با موفقیت تمام کردید؟");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "خطای ارتباط با سرور");
    } finally {
      setIsSyncing(false);
    }
  }, [cleanUser, onSuccess, onClose]);

  const checkStatus = useCallback(async (silent = false) => {
    if (!cleanUser) return;
    if (!silent) setIsChecking(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/accounts/connect?username=${encodeURIComponent(cleanUser)}`);
      const data = await res.json();

      if (data.success) {
        if (data.connected && data.account) {
          setAlreadyConnected(true);
          // If we were waiting for oauth, auto-sync and finalize!
          if (isWaitingOAuth) {
            handleFinalizeSync();
          }
        } else {
          setAlreadyConnected(false);
          if (data.auth_url) {
            setAuthUrl(data.auth_url);
          }
        }
      } else if (data.error && !silent) {
        setErrorMsg(data.error);
      }
    } catch {
      if (!silent) {
        setErrorMsg("امکان بررسی وضعیت اتصال با سرور وجود ندارد.");
      }
    } finally {
      if (!silent) setIsChecking(false);
    }
  }, [cleanUser, isWaitingOAuth, handleFinalizeSync]);

  useEffect(() => {
    if (isOpen && cleanUser) {
      setIsWaitingOAuth(false);
      setCopied(false);
      checkStatus();
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, cleanUser, checkStatus]);

  // Polling when waiting for OAuth to complete
  useEffect(() => {
    if (isWaitingOAuth && isOpen) {
      pollTimerRef.current = setInterval(() => {
        checkStatus(true);
      }, 4000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isWaitingOAuth, isOpen, checkStatus]);

  const handleCopyLink = () => {
    if (!authUrl) return;
    navigator.clipboard.writeText(authUrl);
    setCopied(true);
    toast.success("لینک اتصال اینستاگرام کپی شد.");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStartConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          username: cleanUser,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.already_connected) {
          toast.success(data.message || `پیج @${cleanUser} با موفقیت متصل شد.`);
          onSuccess?.(cleanUser);
          onClose();
          return;
        }

        if (data.auth_url) {
          setAuthUrl(data.auth_url);
          setIsWaitingOAuth(true);
        } else {
          setErrorMsg("لینک احراز هویت اینستاگرام دریافت نشد.");
        }
      } else {
        setErrorMsg(data.error || "خطا در برقراری ارتباط با سرویس ابری SocialAPI");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "خطای شبکه");
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden p-6 text-zinc-900 font-vazir max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <InstagramIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900">
              اتصال پیج اینستاگرام
            </h3>
            <p className="text-xs text-zinc-500">
              اتصال رسمی و ایمن از طریق SocialAPI بدون ذخیره رمز عبور
            </p>
          </div>
        </div>

        {/* Account Badge */}
        <div className="mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
          <span className="text-xs font-semibold text-zinc-600">پیج هدف:</span>
          <span className="font-mono font-bold text-sm text-zinc-900" dir="ltr">
            @{cleanUser}
          </span>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Body content based on state */}
        <div className="mt-4 space-y-4">
          {isChecking ? (
            <div className="p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-zinc-400 animate-spin" />
              <p className="text-xs text-zinc-500">
                در حال آماده‌سازی لینک اتصال پیج در سرویس ابری...
              </p>
            </div>
          ) : alreadyConnected ? (
            /* State: Already connected in SocialAPI */
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>پیج شما در سرویس رسمی متصل و آماده است!</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                احراز هویت اکانت <strong>@{cleanUser}</strong> قبلاً انجام شده است. برای فعال‌سازی کامل و اتصال اینفلو، کافیست روی دکمه زیر کلیک کنید.
              </p>
              <Button
                type="button"
                onClick={handleFinalizeSync}
                disabled={isSyncing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 gap-2 cursor-pointer shadow-sm"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>فعال‌سازی و اتصال به اینفلو</span>
              </Button>
            </div>
          ) : isWaitingOAuth ? (
            /* State: Waiting for OAuth completion */
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-3">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
                <span>در انتظار تایید ورود در صفحه اینستاگرام...</span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                لطفاً در تب بازشده، وارد اکانت <strong>@{cleanUser}</strong> شوید و دکمه تایید مجوز را بزنید. به محض تایید، این پنجره به طور خودکار فعال خواهد شد.
              </p>

              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  onClick={handleFinalizeSync}
                  disabled={isSyncing}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2.5 gap-2 cursor-pointer shadow-sm"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>ورود انجام شد، بررسی وضعیت اتصال</span>
                </Button>

                {authUrl && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-700 hover:text-sky-900 underline text-center inline-flex items-center justify-center gap-1.5 py-1"
                    >
                      <span>تب باز نشد؟ کلیک کنید تا مجدداً باز شود</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-200 bg-white"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">لینک اتصال کپی شد!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          <span>کپی لینک اتصال (جهت باز کردن در مرورگر دیگر یا گوشی)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* State: Ready to launch OAuth */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                <p className="text-xs text-zinc-700 leading-relaxed">
                  برند اختصاصی <strong>@{cleanUser}</strong> در سرویس SocialAPI پیکربندی شد. با کلیک روی دکمه زیر، صفحه رسمی ورود اینستاگرام در یک <strong>برگه جدید</strong> باز می‌شود.
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  💡 اگر در مرورگر دیگری (یا روی گوشی) به اینستاگرام لاگین هستید، می‌توانید با دکمه کپی، لینک را در همان مرورگر باز کنید تا نیازی به ورود مجدد رمز نباشد.
                </p>
              </div>

              {authUrl ? (
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setIsWaitingOAuth(true);
                    toast.info("صفحه ورود رسمی اینستاگرام در برگه جدید باز شد.");
                  }}
                  className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ورود به اینستاگرام و اتصال پیج (تب جدید)</span>
                </a>
              ) : (
                <Button
                  type="button"
                  onClick={handleStartConnect}
                  disabled={isConnecting}
                  className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold gap-2 cursor-pointer shadow-md"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  <span>ورود به اینستاگرام و اتصال پیج</span>
                </Button>
              )}

              {authUrl && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2 px-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs text-zinc-700 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">لینک با موفقیت کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      <span>کپی لینک اتصال اینستاگرام</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Security & Architecture Notice */}
          <div className="p-3 rounded-xl bg-zinc-100/80 border border-zinc-200 text-[11px] text-zinc-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>استاندارد امنیتی Meta OAuth 2.0</span>
            </div>
            <p className="leading-relaxed">
              طبق قوانین امنیتی متا، احراز هویت سرویس‌های رسمی الزاماً از طریق مرورگر امن وب انجام می‌شود تا هیچ برنامه‌ای نتواند رمز اکانت شما را ذخیره کند.
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => checkStatus()}
              disabled={isChecking || isConnecting || isSyncing}
              className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>بروزرسانی وضعیت</span>
            </button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isConnecting || isSyncing}
              className="text-xs cursor-pointer"
            >
              بستن
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
