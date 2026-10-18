"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { I18N, Lang } from "@/lib/i18n";
import { Lock, User, LogIn, AlertCircle, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fa");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync saved language from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem("inflow_lang") as Lang | null;
    if (saved && (saved === "fa" || saved === "en" || saved === "ar")) {
      setLang(saved);
    }
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("inflow_lang", newLang);
  };

  const t = I18N[lang];
  const isRtl = lang === "fa" || lang === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError(t.loginErrorRequired);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 403) {
          setError(t.loginErrorSuspended);
        } else {
          setError(t.loginErrorInvalid);
        }
        setLoading(false);
        return;
      }

      // Login successful: redirect to home or backoffice
      if (data.user?.role === "superadmin") {
        router.push("/backoffice");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      console.error("Login request failed:", err);
      setError(t.loginErrorInvalid);
      setLoading(false);
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-zinc-50/50 text-foreground flex flex-col justify-between selection:bg-zinc-200 selection:text-zinc-900"
    >
      {/* Top Header with Language Selector */}
      <header className="w-full px-6 py-3.5 flex items-center justify-between border-b border-border bg-white/80 backdrop-blur-md">
        <BrandLogo size="default" />

        {/* Language Switcher */}
        <LanguageDropdown
          currentLang={lang}
          onLangChange={handleLangChange}
          size="sm"
        />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-sm border border-border bg-card rounded-xl">
          {/* Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-foreground border border-border mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mb-1.5">
              {t.loginTitle}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-start">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground text-start">
                {t.usernameLabel}
              </label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                icon={<User className="w-4 h-4 text-muted-foreground" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground text-start">
                {t.passwordLabel}
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                icon={<Lock className="w-4 h-4 text-muted-foreground" />}
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={loading}
              className="w-full mt-3 h-10 font-medium"
            >
              {loading ? (
                <span>{t.loggingIn}</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t.loginButton}</span>
                </>
              )}
            </Button>
          </form>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-muted-foreground border-t border-border">
        inFlow &copy; 2026 &bull; Instagram Automation Control Plane
      </footer>
    </div>
  );
}
