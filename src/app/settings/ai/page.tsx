"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "@/components/ui/sonner";

export default function AiSettingsPage() {
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [model, setModel] = useState("gemini-1.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch current AI settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/ai");
        const data = await res.json();
        if (data.success) {
          setProvider(data.provider || "gemini");
          setModel(
            data.model ||
              (data.provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini")
          );
          setHasExistingKey(data.hasKey);
          setMaskedKey(data.maskedKey || "");
        }
      } catch (e) {
        console.error("Error loading AI settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleProviderChange = (newProvider: "gemini" | "openai") => {
    setProvider(newProvider);
    setTestResult(null);
    if (newProvider === "gemini") {
      setModel("gemini-1.5-flash");
    } else {
      setModel("gpt-4o-mini");
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider,
          apiKey: apiKey || undefined,
          model,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      setTestResult({
        success: false,
        message: "خطای شبکه هنگام تست اتصال به هوش مصنوعی",
      });
      toast.error("خطای شبکه هنگام تست اتصال");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          provider,
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تنظیمات هوش مصنوعی با موفقیت ذخیره شد");
        setHasExistingKey(true);
        if (apiKey) {
          setMaskedKey(apiKey.slice(0, 4) + "..." + apiKey.slice(-4));
          setApiKey("");
        }
      } else {
        toast.error(data.error || "خطا در ذخیره تنظیمات");
      }
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-vazir antialiased" dir="rtl">
      <Toaster />
      <header className="sticky top-0 z-20 h-14 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="بازگشت"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-foreground">
              تنظیمات کلید هوش مصنوعی
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Architecture Notice Banner */}
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-purple-950">
                موتور هوش مصنوعی بدون ایجنت (Direct API First)
              </h3>
              <p className="text-xs text-purple-800 leading-relaxed">
                سامانه inFlow به هیچ ایجنت خارجی یا سرور ثالث وابسته نیست. کامنت‌ها و پیام‌های دایرکت مستقیماً از طریق کلید API اختصاصی شما تحلیل و ارزیابی شده و با مهلت زمانی حداکثر ۴.۵ ثانیه پاسخ داده می‌شوند.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form Card */}
        <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground block">
              انتخاب سرویس‌دهنده هوش مصنوعی
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderChange("gemini")}
                className={`p-4 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                  provider === "gemini"
                    ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block text-foreground">
                    Google Gemini
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    سریع، پایدار، سهمیه رایگان روزانه عالی
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  پیشنهادی
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("openai")}
                className={`p-4 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                  provider === "openai"
                    ? "bg-secondary/70 border-primary text-foreground shadow-2xs"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block text-foreground">
                    OpenAI
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    مدل‌های GPT-4o و GPT-4o-mini
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
              <span>مدل پردازش هوش مصنوعی</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {provider === "gemini" ? (
                <>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (بسیار سریع و بهینه)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash (جدیدترین نسخه پرسرعت)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (دقت عمیق و تحلیلی)</option>
                </>
              ) : (
                <>
                  <option value="gpt-4o-mini">gpt-4o-mini (اقتصادی و بسیار سریع)</option>
                  <option value="gpt-4o">gpt-4o (بالاترین دقت زبانی)</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo (کلاسیک)</option>
                </>
              )}
            </select>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span>کلید دسترسی (API Key)</span>
              </label>
              {hasExistingKey && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>کلید فعال: {maskedKey}</span>
                </div>
              )}
            </div>

            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={
                  hasExistingKey
                    ? "برای حفظ کلید فعلی خالی بگذارید یا کلید جدید وارد کنید"
                    : provider === "gemini"
                    ? "AIzaSy..."
                    : "sk-proj-..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs ps-3 pe-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 end-0 px-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {provider === "gemini"
                ? "کلید رایگان خود را از Google AI Studio (aistudio.google.com) دریافت نمایید."
                : "کلید API خود را از پلتفرم OpenAI (platform.openai.com) دریافت نمایید."}
            </p>
          </div>

          {/* Test Connection Result */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing || (!apiKey && !hasExistingKey)}
              onClick={handleTestConnection}
              className="text-xs gap-1.5 cursor-pointer"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>تست اتصال به هوش مصنوعی</span>
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="text-xs gap-1.5 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>ذخیره تنظیمات</span>
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
