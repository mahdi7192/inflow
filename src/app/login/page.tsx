"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { I18N, Lang } from "@/lib/i18n";
import { MaterialSymbol } from "@/components/ui/material-symbol";
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
      className="min-h-screen bg-surface text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary"
    >
      {/* Top Header with Language Selector */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md">
        <BrandLogo size="default" />

        {/* Language Switcher */}
        <LanguageDropdown
          currentLang={lang}
          onLangChange={handleLangChange}
          size="sm"
        />
      </header>

      {/* Main Login Card (M3 Elevated Card) */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-xs border border-outline-variant/80 bg-surface-container-lowest rounded-3xl">
          {/* Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-3 shadow-2xs">
              <MaterialSymbol name="verified_user" size={24} fill />
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
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-xs flex items-start gap-2.5">
              <MaterialSymbol name="error" size={18} fill className="shrink-0 mt-0.5" />
              <div className="flex-1 text-start font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground text-start">
                {t.usernameLabel}
              </label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                icon={<MaterialSymbol name="person" size={18} className="text-muted-foreground" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground text-start">
                {t.passwordLabel}
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                icon={<MaterialSymbol name="lock" size={18} className="text-muted-foreground" />}
              />
            </div>

            <Button
              type="submit"
              variant="filled"
              size="lg"
              disabled={loading}
              className="w-full mt-4 h-11 font-bold rounded-full shadow-2xs gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <MaterialSymbol name="progress_activity" size={18} className="animate-spin" />
                  <span>{t.loggingIn}</span>
                </div>
              ) : (
                <>
                  <MaterialSymbol name="login" size={18} rtlMirror />
                  <span>{t.loginButton}</span>
                </>
              )}
            </Button>
          </form>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-muted-foreground border-t border-outline-variant/60">
        inFlow &copy; 2026 &bull; Instagram Automation Control Plane
      </footer>
    </div>
  );
}