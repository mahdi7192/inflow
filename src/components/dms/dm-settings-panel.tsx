"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe, Loader2, RefreshCw, ChevronDown, UserCheck, Sparkles, CheckCircle2, Bot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DMAutomationRow } from "@/lib/db";
import { DM_GOALS, DM_TONES, getRecommendedGoals, parseSecondaryGoals, type DmGoal } from "@/lib/dm-goals";

interface CrawlPage {
  url: string;
  title: string;
  kind: string;
  score: number;
  last_crawled_at: string;
}

const KIND_LABEL: Record<string, string> = {
  product: "محصول", service: "خدمت", pricing: "قیمت", contact: "تماس", shipping: "ارسال/پرداخت",
  faq: "سؤالات/قوانین", about: "درباره", blog: "مقاله", other: "سایر",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "موفق", partial: "نیمه‌کامل", failed: "ناموفق", running: "در حال کرال…", skipped: "رد شد", idle: "هنوز کرال نشده", "": "هنوز کرال نشده",
};

interface Props {
  account: string;
  config: DMAutomationRow;
  setConfig: (c: DMAutomationRow) => void;
  onSaveConfig: (overrides?: Partial<DMAutomationRow>) => Promise<void>;
  websiteUrl: string;
  setWebsiteUrl: (v: string) => void;
  brandCheatSheet: string;
  setBrandCheatSheet: (v: string) => void;
  saving: boolean;
  saveSuccess: boolean;
}

export function DmSettingsPanel(p: Props) {
  const { account, config, setConfig, onSaveConfig, websiteUrl, setWebsiteUrl, brandCheatSheet, setBrandCheatSheet } = p;
  const [persona, setPersona] = useState("business");
  const [pages, setPages] = useState<CrawlPage[]>([]);
  const [showPages, setShowPages] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const base = `/api/accounts/${encodeURIComponent(account)}/dm-automation`;
  const recommended = getRecommendedGoals(persona);
  const tone = (config.tone as string) || "friendly";
  const primary = (config.primary_goal as DmGoal) || recommended[0];
  const secondary = parseSecondaryGoals(config.secondary_goals, primary);

  const loadCrawl = useCallback(async () => {
    try {
      const res = await fetch(base);
      if (!res.ok) return;
      const data = await res.json();
      if (data.crawl) {
        setPages(data.crawl.pages || []);
        setPersona(data.crawl.account_persona || "business");
      }
      if (data.automation) setConfig({ ...config, ...pickCrawl(data.automation), primary_goal: config.primary_goal || data.automation.primary_goal });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => { loadCrawl(); }, [loadCrawl]);

  const saveAll = async () => {
    setSavingAll(true);
    setNotice(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone, tone_sample: config.tone_sample || "", primary_goal: primary, secondary_goals: secondary,
          require_follow: config.require_follow, follow_prompt_text: config.follow_prompt_text,
          ai_prompt_instructions: config.ai_prompt_instructions || "",
          website_url: websiteUrl, brand_cheat_sheet: brandCheatSheet,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "خطا در ذخیره");
      setConfig({ ...config, ...data.automation });
      if (data.crawl) setPages(data.crawl.pages || []);
      setNotice({ ok: true, text: "ذخیره شد ✓" });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "خطا در ذخیره" });
    } finally {
      setSavingAll(false);
    }
  };

  const crawlNow = async () => {
    setCrawling(true);
    setNotice(null);
    try {
      // Persist the URL first so the crawler uses what is typed.
      await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ website_url: websiteUrl }) });
      const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "crawl_now" }) });
      const data = await res.json();
      if (data.automation) setConfig({ ...config, ...pickCrawl(data.automation) });
      if (data.crawl) setPages(data.crawl.pages || []);
      setNotice(data.success ? { ok: true, text: `کرال کامل شد: ${data.result?.pages ?? 0} صفحه` } : { ok: false, text: data.error || "کرال ناموفق بود" });
    } catch {
      setNotice({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setCrawling(false);
    }
  };

  const toggleSecondary = (g: DmGoal) => {
    const next = secondary.includes(g) ? secondary.filter((x) => x !== g) : [...secondary, g];
    setConfig({ ...config, secondary_goals: JSON.stringify(next) } as DMAutomationRow);
  };

  const status = (config.crawl_last_status as string) || "";
  const lastAt = config.crawl_last_at as string | null | undefined;
  const isEnabled = config.enabled === 1;

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100">
      {/* Enabled */}
      <div className="p-6 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">دستیار هوشمند دایرکت</h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              وقتی روشن باشد، دستیار با جستجو در سایت شما به پیام‌های دایرکت مستقیم پاسخ می‌دهد.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
            {isEnabled ? "فعال" : "غیرفعال"}
          </span>
          <Switch checked={isEnabled} onCheckedChange={(c) => onSaveConfig({ enabled: c ? 1 : 0 })} className="cursor-pointer" />
        </div>
      </div>

      {/* Website + crawl */}
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>وب‌سایت شما (منبع اطلاعات دستیار)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text" dir="ltr" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://myshop.ir"
            className="flex-1 rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button" onClick={crawlNow} disabled={crawling || !websiteUrl.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {crawling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            کرال همین حالا
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span>وضعیت: <b className="text-slate-700">{STATUS_LABEL[status] ?? status}</b></span>
          <span>صفحه‌های یافت‌شده: <b className="text-slate-700">{Number(config.crawl_pages_count || pages.length || 0).toLocaleString("fa-IR")}</b></span>
          <span>آخرین کرال: <b className="text-slate-700">{lastAt ? new Date(lastAt.replace(" ", "T") + "Z").toLocaleString("fa-IR") : "—"}</b></span>
        </div>
        <p className="text-[11px] text-slate-400">فقط صفحات همین دامنه خوانده می‌شود و هر ۱۵ دقیقه خودکار به‌روز می‌شود.</p>
        {pages.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowPages(!showPages)} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 cursor-pointer">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPages ? "rotate-180" : ""}`} />
              {showPages ? "پنهان کردن صفحات" : `نمایش صفحات کشف‌شده (${pages.length.toLocaleString("fa-IR")})`}
            </button>
            {showPages && (
              <ul className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-100 divide-y divide-slate-100 text-[11px]">
                {pages.map((pg) => (
                  <li key={pg.url} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 truncate">{pg.title || pg.url}</div>
                      <div dir="ltr" className="text-slate-400 truncate text-left">{pg.url}</div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{KIND_LABEL[pg.kind] || pg.kind}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Tone */}
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>لحن دستیار</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DM_TONES.map((t) => (
            <button
              key={t.id} type="button" onClick={() => setConfig({ ...config, tone: t.id } as DMAutomationRow)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${tone === t.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text" value={(config.tone_sample as string) || ""} maxLength={400}
          onChange={(e) => setConfig({ ...config, tone_sample: e.target.value } as DMAutomationRow)}
          placeholder="نمونه جمله دلخواه (اختیاری): مثلاً «سلام عزیزم! چه کمکی از دستم برمیاد؟ 😍»"
          className="w-full rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Goals */}
      <div className="p-6 space-y-3">
        <div className="text-xs font-bold text-slate-800">هدف اصلی دایرکت</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {DM_GOALS.map((g) => {
            const rec = recommended.includes(g.id);
            const active = primary === g.id;
            return (
              <button
                key={g.id} type="button" onClick={() => setConfig({ ...config, primary_goal: g.id } as DMAutomationRow)}
                className={`relative text-right rounded-xl border p-3 cursor-pointer transition-all ${active ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500" : "border-slate-200 hover:border-indigo-300"}`}
              >
                {rec && (
                  <span className="absolute -top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    پیشنهاد برای پیج شما
                  </span>
                )}
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  {g.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{g.description}</div>
              </button>
            );
          })}
        </div>
        <div className="pt-1">
          <div className="text-[11px] font-bold text-slate-600 mb-1.5">اهداف فرعی (اختیاری)</div>
          <div className="flex flex-wrap gap-2">
            {DM_GOALS.filter((g) => g.id !== primary).map((g) => (
              <button
                key={g.id} type="button" onClick={() => toggleSecondary(g.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${secondary.includes(g.id) ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-600"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Follow gate */}
      <div className="p-6 flex items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-900">قفل فالو</div>
            <div className="text-[11px] text-slate-500 mt-0.5">پاسخ کامل فقط بعد از فالو کردن پیج ارسال می‌شود.</div>
          </div>
        </div>
        <Switch checked={config.require_follow === 1} onCheckedChange={(c) => onSaveConfig({ require_follow: c ? 1 : 0 })} className="cursor-pointer" />
      </div>

      {/* Advanced */}
      <div className="p-6 space-y-3">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          پیشرفته
        </button>
        {showAdvanced && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">اطلاعات برند (اختیاری)</label>
              <textarea
                rows={3} value={brandCheatSheet} onChange={(e) => setBrandCheatSheet(e.target.value)}
                placeholder="مثال: ارسال به سراسر ایران با تیپاکس | تحویل تهران ۲۴ ساعته"
                className="w-full rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">دستورالعمل دستی برای دستیار (اختیاری)</label>
              <textarea
                rows={3} value={(config.ai_prompt_instructions as string) || ""}
                onChange={(e) => setConfig({ ...config, ai_prompt_instructions: e.target.value })}
                placeholder="مثال: در صورت قصد خرید شماره تماس بپرس"
                className="w-full rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 flex items-center justify-between gap-3">
        <span className={`text-xs font-bold ${notice?.ok ? "text-emerald-600" : "text-rose-600"}`}>{notice?.text || (p.saveSuccess ? "ذخیره شد ✓" : "")}</span>
        <button
          type="button" onClick={saveAll} disabled={savingAll || p.saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
        >
          {savingAll ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
      </div>
    </div>
  );
}

function pickCrawl(a: DMAutomationRow) {
  return {
    crawl_last_status: a.crawl_last_status, crawl_last_at: a.crawl_last_at, crawl_pages_count: a.crawl_pages_count,
    tone: a.tone, tone_sample: a.tone_sample, primary_goal: a.primary_goal, secondary_goals: a.secondary_goals,
  } as Partial<DMAutomationRow>;
}
