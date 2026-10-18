"use client";

import React, { useState, useEffect } from "react";
import { Monitor, X, Maximize2, Minimize2, Clock, ShieldCheck, CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { I18N, Lang, isRTL } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VncViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  vncUrl: string;
  initialExpiresInSeconds?: number;
  lang: Lang;
  onSessionVerified?: () => void;
}

export function VncViewerModal({
  isOpen,
  onClose,
  account,
  vncUrl,
  initialExpiresInSeconds = 600,
  lang,
  onSessionVerified,
}: VncViewerModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialExpiresInSeconds);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const rtl = isRTL(lang);
  const t = I18N[lang];

  useEffect(() => {
    setSecondsRemaining(initialExpiresInSeconds);
    setIframeLoaded(false);
    setIframeError(false);
  }, [initialExpiresInSeconds, vncUrl, isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, secondsRemaining]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/bot/vnc-session?account=${encodeURIComponent(account)}`, {
        method: "DELETE",
      });
    } catch {
      // Ignored
    }
    onClose();
  };

  const handleVerifyLogin = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/bot/session-harvested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, verified: true }),
      });
      const data = await res.json();
      if (data.success) {
        if (onSessionVerified) onSessionVerified();
        onClose();
      } else {
        alert(data.message || "ورود هنوز در مرورگر تکمیل نشده است.");
      }
    } catch (err: unknown) {
      alert("خطا در بررسی نشست اینستاگرام: " + (err as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
      <div
        className={`bg-card border border-border shadow-2xl rounded-2xl flex flex-col transition-all overflow-hidden ${
          isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[85vh]"
        }`}
        dir={rtl ? "rtl" : "ltr"}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">{t.vncModalTitle}</h3>
                <Badge variant="outline" className="font-mono text-xs">
                  @{account}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
                secondsRemaining < 120
                  ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                  : "bg-zinc-100 text-zinc-800 border-zinc-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            {/* Verify Login Button */}
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium"
              onClick={handleVerifyLogin}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin me-1.5" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 me-1.5" />
              )}
              تایید ورود موفق
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 hidden sm:flex"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            {/* Disconnect Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              onClick={handleDisconnect}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modal Main Screen Body */}
        <div className="flex-1 bg-zinc-950 relative flex items-center justify-center overflow-hidden">
          {secondsRemaining <= 0 ? (
            <div className="text-center p-8 space-y-4 max-w-md">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <h4 className="text-white font-bold text-base">نشست امن منقضی شد</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">{t.vncSessionExpired}</p>
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-white border-zinc-700">
                بستن پنجره
              </Button>
            </div>
          ) : (
            <>
              {/* Actual noVNC iframe */}
              <iframe
                src={vncUrl}
                className="w-full h-full border-0"
                title="VNC Remote Browser"
                allow="clipboard-read; clipboard-write; fullscreen"
                onLoad={() => setIframeLoaded(true)}
                onError={() => setIframeError(true)}
              />

              {/* Connecting Overlay */}
              {!iframeLoaded && !iframeError && (
                <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-10 pointer-events-none">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-300">در حال برقراری اتصال به دسکتاپ مجازی ربات...</p>
                </div>
              )}

              {/* Error Fallback */}
              {iframeError && (
                <div className="absolute inset-0 bg-zinc-900/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-4 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Monitor className="w-7 h-7 text-rose-400" />
                  </div>
                  <div className="space-y-1 max-w-lg">
                    <h4 className="font-bold text-base">خطا در بارگذاری نمایشگر مجازی</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      بارگذاری صفحه VNC با خطا مواجه شد. می‌توانید مجدداً تلاش کنید یا آن را در تب جدید مرورگر باز نمایید.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      onClick={() => {
                        setIframeError(false);
                        setIframeLoaded(false);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 me-1.5" />
                      تلاش مجدد
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      onClick={() => window.open(vncUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 me-1.5" />
                      باز کردن در تب جدید
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Security Notice */}
        <div className="px-4 sm:px-6 py-2.5 bg-zinc-50 border-t border-border flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{t.vncModalSecurityNotice}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs text-zinc-600 hover:text-foreground" onClick={handleDisconnect}>
            {t.vncDisconnectBtn}
          </Button>
        </div>
      </div>
    </div>
  );
}
