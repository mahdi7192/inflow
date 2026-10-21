"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Globe,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

export function AiSettingsPanel() {
  // SocialAPI.ai state
  const [socialApiKey, setSocialApiKey] = useState("");
  const [hasSocialKey, setHasSocialKey] = useState(false);
  const [maskedSocialKey, setMaskedSocialKey] = useState("");
  const [showSocialKey, setShowSocialKey] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [maskedWebhookSecret, setMaskedWebhookSecret] = useState("");
  const [webhookId, setWebhookId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);
  const [testingSocial, setTestingSocial] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [socialTestResult, setSocialTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // AI Provider state
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/webhooks/social-api`);
    }
    async function loadAllSettings() {
      try {
        const [aiRes, socialRes] = await Promise.all([
          fetch("/api/settings/ai"),
          fetch("/api/settings/social-api"),
        ]);
        const aiData = await aiRes.json();
        if (aiData.success) {
          setProvider(aiData.provider || "gemini");
          setModel(
            aiData.model ||
              (aiData.provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini")
          );
          setHasExistingKey(aiData.hasKey);
          setMaskedKey(aiData.maskedKey || "");
        }

        const socialData = await socialRes.json();
        if (socialData.success) {
          setHasSocialKey(socialData.hasKey);
          setMaskedSocialKey(socialData.maskedKey || "");
          setHasWebhookSecret(socialData.hasWebhookSecret);
          setMaskedWebhookSecret(socialData.maskedWebhookSecret || "");
          setWebhookId(socialData.webhookId || "");
        }
      } catch (e) {
        console.error("Error loading settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadAllSettings();
  }, []);

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocial(true);
    try {
      const res = await fetch("/api/settings/social-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          apiKey: socialApiKey.trim() || undefined,
          webhookSecret: webhookSecret.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "تنظیمات SocialAPI.ai ذخیره شد");
        if (socialApiKey.trim()) {
          setHasSocialKey(true);
          setMaskedSocialKey(
            socialApiKey.slice(0, 9) + "..." + socialApiKey.slice(-4)
          );
          setSocialApiKey("");
        }
        if (webhookSecret.trim()) {
          setHasWebhookSecret(true);
          setMaskedWebhookSecret(
            webhookSecret.slice(0, 6) + "..." + webhookSecret.slice(-4)
          );
          setWebhookSecret("");
        }
      } else {
        toast.error(data.error || "خطا در ذخیره تنظیمات SocialAPI");
      }
    } catch {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setSavingSocial(false);
    }
  };

  const handleTestSocial = async () => {
    setTestingSocial(true);
    setSocialTestResult(null);
    try {
      const res = await fetch("/api/settings/social-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          apiKey: socialApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      setSocialTestResult({
        success: Boolean(data.success),
        message: data.message || data.error || "خطا در تست اتصال",
      });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "خطا در تست اتصال");
      }
    } catch {
      toast.error("خطای شبکه در تست اتصال SocialAPI");
    } finally {
      setTestingSocial(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("آدرس وب‌هوک الزامی است");
      return;
    }
    setRegisteringWebhook(true);
    try {
      const res = await fetch("/api/settings/social-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_webhook",
          apiKey: socialApiKey.trim() || undefined,
          webhookUrl: webhookUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (data.webhookId) setWebhookId(data.webhookId);
        if (data.hasWebhookSecret) setHasWebhookSecret(true);
      } else {
        toast.error(data.message || "خطا در ثبت وب‌هوک");
      }
    } catch {
      toast.error("خطای شبکه در ثبت وب‌هوک");
    } finally {
      setRegisteringWebhook(false);
    }
  };

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

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <span>در حال بارگذاری تنظیمات زیرساخت و هوش مصنوعی...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* SECTION 1: SocialAPI.ai Unified Instagram Configuration */}
      <form
        onSubmit={handleSaveSocial}
        className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                تنظیمات درگاه رسمی اینستاگرام (SocialAPI.ai)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تمامی عملیات اتصال اکانت (`OAuth`)، خواندن و پاسخ به کامنت‌ها، دایرکت‌ها و وب‌هوک‌ها از طریق `https://api.social-api.ai/v1` انجام می‌شود.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
            api.social-api.ai/v1
          </Badge>
        </div>

        {/* SocialAPI Bearer Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <span>کلید دسترسی SocialAPI (`Authorization: Bearer sapi_key_...`)</span>
            </label>
            {hasSocialKey && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>کلید فعال: {maskedSocialKey}</span>
              </div>
            )}
          </div>

          <div className="relative">
            <Input
              type={showSocialKey ? "text" : "password"}
              placeholder={
                hasSocialKey
                  ? "برای حفظ کلید فعلی خالی بگذارید یا کلید جدید وارد کنید"
                  : "sapi_key_..."
              }
              value={socialApiKey}
              onChange={(e) => setSocialApiKey(e.target.value)}
              dir="ltr"
              className="font-mono text-xs text-left ps-3 pe-10"
            />
            <button
              type="button"
              onClick={() => setShowSocialKey(!showSocialKey)}
              className="absolute inset-y-0 end-0 px-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showSocialKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Webhook className="w-3.5 h-3.5 text-muted-foreground" />
                <span>کلید امضای وب‌هوک (`X-SocialAPI-Signature`)</span>
              </label>
              {hasWebhookSecret && (
                <span className="text-[10px] font-mono text-emerald-600">
                  {maskedWebhookSecret}
                </span>
              )}
            </div>
            <Input
              type="password"
              placeholder={hasWebhookSecret ? "تنظیم شده (اختیاری)" : "whsec_..."}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              dir="ltr"
              className="font-mono text-xs text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              آدرس دریافت وب‌هوک (`comment.received`, `dm.received`)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                dir="ltr"
                className="font-mono text-xs text-left flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegisterWebhook}
                disabled={registeringWebhook || (!socialApiKey && !hasSocialKey)}
                className="text-xs shrink-0 cursor-pointer"
              >
                {registeringWebhook ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "ثبت وب‌هوک"
                )}
              </Button>
            </div>
            {webhookId && (
              <p className="text-[10px] font-mono text-emerald-700">
                شناسه وب‌هوک ثبت‌شده: {webhookId}
              </p>
            )}
          </div>
        </div>

        {socialTestResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              socialTestResult.success
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            {socialTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
            )}
            <div className="leading-relaxed">{socialTestResult.message}</div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testingSocial || (!socialApiKey && !hasSocialKey)}
            onClick={handleTestSocial}
            className="text-xs gap-1.5 cursor-pointer"
          >
            {testingSocial ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>تست اتصال به SocialAPI.ai</span>
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={savingSocial}
            className="text-xs gap-1.5 cursor-pointer"
          >
            {savingSocial ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>ذخیره تنظیمات SocialAPI</span>
          </Button>
        </div>
      </form>

      {/* SECTION 2: AI Provider Settings */}
      <form
        onSubmit={handleSave}
        className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-6"
      >
        <div className="flex items-start gap-3.5 border-b border-border pb-4">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              مدیریت کلید هوش مصنوعی پلتفرم (Platform AI Settings)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              این کلید برای تشخیص هوشمند نیت مخاطبان در کامنت‌ها و نگارش پاسخ‌های دایرکت استفاده می‌شود.
            </p>
          </div>
        </div>

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
                  سریع، پایدار، سهمیه روزانه عالی
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
                <option value="gemini-1.5-pro">gemini-1.5-pro (تحلیلی و عمیق)</option>
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
              <span>کلید دسترسی هوش مصنوعی (AI API Key)</span>
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
            <span>ذخیره تنظیمات هوش مصنوعی</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
