"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { I18N, Lang } from "@/lib/i18n";
import { Lock, User, LogIn, AlertCircle, Globe, ShieldCheck } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";

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
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-purple-500/30 selection:text-purple-200"
    >
      {/* Top Header with Language Selector */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <InstagramIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {t.platformName}
          </span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 mx-1" />
          <button
            type="button"
            onClick={() => handleLangChange("fa")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              lang === "fa"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            فارسی
          </button>
          <button
            type="button"
            onClick={() => handleLangChange("ar")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              lang === "ar"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => handleLangChange("en")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              lang === "en"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-purple-950/20 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              {t.loginTitle}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-start">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 text-start">
                {t.usernameLabel}
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 ${
                    isRtl ? "right-0 pr-3.5" : "left-0 pl-3.5"
                  } flex items-center pointer-events-none text-slate-400`}
                >
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.usernamePlaceholder}
                  className={`w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2.5 ${
                    isRtl ? "pr-10 pl-3" : "pl-10 pr-3"
                  } text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 text-start">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 ${
                    isRtl ? "right-0 pr-3.5" : "left-0 pl-3.5"
                  } flex items-center pointer-events-none text-slate-400`}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className={`w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2.5 ${
                    isRtl ? "pr-10 pl-3" : "pl-10 pr-3"
                  } text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>{t.loggingIn}</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t.loginButton}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        inFlow &copy; 2026 &bull; Instagram Automation Control Plane
      </footer>
    </div>
  );
}
