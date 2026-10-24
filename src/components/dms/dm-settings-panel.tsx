"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { M3FilterChip, M3Switch, M3TextField } from "@/components/material/m3";
import { DMAutomationRow } from "@/lib/db";
import { DM_GOALS, DM_TONES, getRecommendedGoals, parseSecondaryGoals, type DmGoal } from "@/lib/dm-goals";
import { cn } from "@/lib/utils";

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

/** Capabilities of the agentic assistant, shown in the architecture banner. */
const AGENT_CAPABILITIES: { icon: string; label: string }[] = [
  { icon: "forum", label: "گفتگوی چندمرحله‌ای (RAG)" },
  { icon: "travel_explore", label: "کرال و جستجو در سایت" },
  { icon: "record_voice_over", label: "تطبیق لحن برند" },
  { icon: "contact_phone", label: "شکار سرنخ و شماره تماس" },
];

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
  onOpenTestChat?: () => void;
}

/** M3 filled card section on the settings surface. */
function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-[20px] bg-surface-container-low p-4 sm:p-5 space-y-4", className)}>{children}</section>;
}

function SectionTitle({ icon, title, supporting, trailing }: { icon: string; title: string; supporting?: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <MaterialSymbol name={icon} size={22} className="text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="title-small text-on-surface">{title}</h3>
          {supporting && <p className="body-small text-on-surface-variant mt-0.5 leading-relaxed">{supporting}</p>}
        </div>
      </div>
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

export function DmSettingsPanel(p: Props) {
  const { account, config, setConfig, onSaveConfig, websiteUrl, setWebsiteUrl, brandCheatSheet, setBrandCheatSheet, onOpenTestChat } = p;
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
  const primaryGoal = DM_GOALS.find((g) => g.id === primary);

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
  const footerText = notice?.text || (p.saveSuccess ? "ذخیره شد ✓" : "");
  const footerOk = notice ? notice.ok : true;

  return (
    <div dir="rtl" className="rounded-3xl bg-surface text-on-surface border border-outline-variant p-3 sm:p-4 space-y-3">
      {/* Architecture banner: Agentic AI DM Assistant vs deterministic trigger replies */}
      <section className="rounded-[20px] bg-primary-container text-on-primary-container p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
            <MaterialSymbol name="smart_toy" size={22} fill />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="title-medium">
              دستیار هوشمند و مشاوره خودکار دایرکت{" "}
              <bdi dir="ltr" className="label-medium opacity-80 whitespace-nowrap">(Agentic AI DM Assistant)</bdi>
            </h2>
            <p className="body-small opacity-90 leading-relaxed">
              یک ایجنت مکالمه‌محور که دایرکت‌های مستقیم را در چند مرحله پاسخ می‌دهد: صفحات سایت شما را کرال و جستجو می‌کند
              (RAG)، با لحن برند صحبت می‌کند و در صورت تمایل مشتری، شماره تماس و اطلاعاتش را ثبت می‌کند.
            </p>
          </div>
        </div>

        <ul className="flex flex-wrap gap-2">
          {AGENT_CAPABILITIES.map((c) => (
            <li key={c.icon} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-container-lowest/70 text-on-surface label-medium">
              <MaterialSymbol name={c.icon} size={18} className="text-primary" />
              {c.label}
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2.5 rounded-2xl bg-surface-container-lowest/60 px-3.5 py-3 text-on-surface-variant">
          <MaterialSymbol name="alt_route" size={20} className="text-on-surface-variant shrink-0 mt-px" />
          <p className="body-small leading-relaxed">
            <b className="text-on-surface">جدا از پاسخ‌های خودکار ثابت (Non-Agentic):</b> پاسخ‌های قطعی و مبتنی بر تریگر پست‌ها و
            استوری‌ها (کلمه کلیدی، متن آماده، لینک) در سناریوی هر پست یا استوری تنظیم می‌شوند و از این دستیار مستقل‌اند.
            تنظیمات این صفحه فقط روی دایرکت‌های مستقیم اثر می‌گذارد.
          </p>
        </div>
      </section>

      {/* Test chat entry */}
      {onOpenTestChat && (
        <Section className="bg-surface-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <SectionTitle
              icon="science"
              title="شبیه‌ساز و تست زنده دایرکت"
              supporting="پاسخ‌های ایجنت، جستجو در صفحات سایت و تست لحن را بدون ارسال پیام واقعی امتحان کنید."
            />
            <md-filled-tonal-button onClick={onOpenTestChat} className="shrink-0">
              <MaterialSymbol name="chat" size={18} slot="icon" />
              ورود به محیط تست چت
            </md-filled-tonal-button>
          </div>
        </Section>
      )}

      {/* Enabled */}
      <Section>
        <SectionTitle
          icon="smart_toy"
          title="فعال‌سازی دستیار هوشمند دایرکت"
          supporting="وقتی روشن باشد، دستیار با جستجو در سایت شما به پیام‌های دایرکت مستقیم پاسخ می‌دهد."
          trailing={
            <>
              <span
                className={cn(
                  "label-medium px-2.5 py-1 rounded-lg",
                  isEnabled ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant"
                )}
              >
                {isEnabled ? "فعال" : "غیرفعال"}
              </span>
              <M3Switch
                selected={isEnabled}
                onChange={(c) => onSaveConfig({ enabled: c ? 1 : 0 })}
                ariaLabel="فعال‌سازی دستیار هوشمند دایرکت"
              />
            </>
          }
        />
      </Section>

      {/* Website + crawl */}
      <Section>
        <SectionTitle
          icon="language"
          title="وب‌سایت شما (منبع دانش دستیار)"
          supporting="دستیار برای پاسخ به سوالات دایرکت، تا سقف ۵۰۰ صفحه از این وب‌سایت را کرال و نمایه می‌کند (به‌روزرسانی خودکار هر ۱۵ دقیقه)."
        />
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <M3TextField
            label="آدرس وب‌سایت"
            type="url"
            dir="ltr"
            value={websiteUrl}
            onValueChange={setWebsiteUrl}
            placeholder="https://myshop.ir"
            leadingIcon={<MaterialSymbol name="link" size={20} />}
            className="flex-1"
          />
          <md-outlined-button onClick={crawlNow} disabled={crawling || !websiteUrl.trim()} className="shrink-0 sm:mt-2">
            {crawling ? (
              <md-circular-progress indeterminate slot="icon" className="[--md-circular-progress-size:18px]" />
            ) : (
              <MaterialSymbol name="sync" size={18} slot="icon" />
            )}
            کرال همین حالا
          </md-outlined-button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { icon: "monitor_heart", label: "وضعیت", value: STATUS_LABEL[status] ?? status },
            {
              icon: "description",
              label: "صفحه‌های یافت‌شده (سقف ۵۰۰)",
              value: Number(config.crawl_pages_count || pages.length || 0).toLocaleString("fa-IR"),
            },
            {
              icon: "schedule",
              label: "آخرین کرال",
              value: lastAt ? new Date(lastAt.replace(" ", "T") + "Z").toLocaleString("fa-IR") : "—",
            },
          ].map((s) => (
            <div key={s.icon} className="rounded-2xl bg-surface-container-high px-3.5 py-2.5 flex items-center gap-2.5 min-w-0">
              <MaterialSymbol name={s.icon} size={20} className="text-on-surface-variant shrink-0" />
              <div className="min-w-0">
                <dt className="label-small text-on-surface-variant">{s.label}</dt>
                <dd className="body-medium text-on-surface truncate">{s.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        {pages.length > 0 && (
          <div>
            <md-text-button onClick={() => setShowPages(!showPages)}>
              <MaterialSymbol name={showPages ? "expand_less" : "expand_more"} size={18} slot="icon" />
              {showPages ? "پنهان کردن صفحات" : `نمایش صفحات کشف‌شده (${pages.length.toLocaleString("fa-IR")})`}
            </md-text-button>
            {showPages && (
              <ul className="mt-2 max-h-64 overflow-auto rounded-2xl bg-surface-container-high divide-y divide-outline-variant">
                {pages.map((pg) => (
                  <li key={pg.url} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="label-large text-on-surface truncate">{pg.title || pg.url}</div>
                      <div dir="ltr" className="body-small text-on-surface-variant truncate text-left">{pg.url}</div>
                    </div>
                    <span className="shrink-0 label-small px-2 py-0.5 rounded-lg bg-secondary-container text-on-secondary-container">
                      {KIND_LABEL[pg.kind] || pg.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      {/* Tone */}
      <Section>
        <SectionTitle icon="record_voice_over" title="لحن دستیار" supporting="لحن پایه را انتخاب کنید؛ نمونه جمله به دستیار کمک می‌کند دقیق‌تر شبیه شما بنویسد." />
        <md-chip-set aria-label="لحن دستیار">
          {DM_TONES.map((t) => (
            <M3FilterChip
              key={t.id}
              label={t.label}
              selected={tone === t.id}
              onClick={() => setConfig({ ...config, tone: t.id } as DMAutomationRow)}
            />
          ))}
        </md-chip-set>
        <M3TextField
          label="نمونه جمله دلخواه (اختیاری)"
          value={(config.tone_sample as string) || ""}
          onValueChange={(v) => setConfig({ ...config, tone_sample: v } as DMAutomationRow)}
          placeholder="مثلاً «سلام عزیزم! چه کمکی از دستم برمیاد؟ 😍»"
          maxLength={400}
          leadingIcon={<MaterialSymbol name="format_quote" size={20} />}
        />
      </Section>

      {/* Goals */}
      <Section>
        <SectionTitle
          icon="flag"
          title="هدف اصلی دایرکت"
          supporting={
            <>
              اهداف دارای <MaterialSymbol name="star" size={14} fill className="text-primary align-[-2px]" /> برای نوع پیج شما پیشنهاد می‌شوند.
            </>
          }
        />
        <md-chip-set aria-label="هدف اصلی دایرکت">
          {DM_GOALS.map((g) => (
            <M3FilterChip
              key={g.id}
              label={g.label}
              selected={primary === g.id}
              icon={recommended.includes(g.id) ? <MaterialSymbol name="star" size={18} fill /> : undefined}
              onClick={() => setConfig({ ...config, primary_goal: g.id } as DMAutomationRow)}
            />
          ))}
        </md-chip-set>
        {primaryGoal && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-surface-container-high px-3.5 py-3">
            <MaterialSymbol name="info" size={20} className="text-primary shrink-0 mt-px" />
            <p className="body-small text-on-surface-variant leading-relaxed">
              <b className="text-on-surface">{primaryGoal.label}:</b> {primaryGoal.description}
            </p>
          </div>
        )}

        <div className="pt-1 space-y-2">
          <div className="label-large text-on-surface-variant">اهداف فرعی (اختیاری)</div>
          <md-chip-set aria-label="اهداف فرعی">
            {DM_GOALS.filter((g) => g.id !== primary).map((g) => (
              <M3FilterChip key={g.id} label={g.label} selected={secondary.includes(g.id)} onClick={() => toggleSecondary(g.id)} />
            ))}
          </md-chip-set>
        </div>
      </Section>

      {/* Follow gate */}
      <Section>
        <SectionTitle
          icon="how_to_reg"
          title="قفل فالو"
          supporting="پاسخ کامل فقط بعد از فالو کردن پیج ارسال می‌شود."
          trailing={
            <M3Switch
              selected={config.require_follow === 1}
              onChange={(c) => onSaveConfig({ require_follow: c ? 1 : 0 })}
              ariaLabel="قفل فالو"
            />
          }
        />
      </Section>

      {/* Advanced */}
      <Section>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          className="relative w-full flex items-center justify-between gap-3 -m-2 p-2 rounded-xl text-start cursor-pointer"
        >
          <md-ripple />
          <span className="flex items-center gap-3">
            <MaterialSymbol name="tune" size={22} className="text-primary" />
            <span className="title-small text-on-surface">پیشرفته: دانش برند و دستورالعمل ایجنت</span>
          </span>
          <MaterialSymbol name={showAdvanced ? "expand_less" : "expand_more"} size={22} className="text-on-surface-variant" />
        </button>
        {showAdvanced && (
          <div className="space-y-4 pt-1">
            <M3TextField
              label="اطلاعات برند (اختیاری)"
              multiline
              rows={3}
              value={brandCheatSheet}
              onValueChange={setBrandCheatSheet}
              placeholder="مثال: ارسال به سراسر ایران با تیپاکس | تحویل تهران ۲۴ ساعته"
              supportingText="این اطلاعات در همه پاسخ‌های هوشمند (پست، استوری و دایرکت) تزریق می‌شود."
            />
            <M3TextField
              label="دستورالعمل دستی برای دستیار (اختیاری)"
              multiline
              rows={3}
              value={(config.ai_prompt_instructions as string) || ""}
              onValueChange={(v) => setConfig({ ...config, ai_prompt_instructions: v })}
              placeholder="مثال: در صورت قصد خرید شماره تماس بپرس"
            />
          </div>
        )}
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-1">
        <span role="status" className={cn("label-large", footerOk ? "text-primary" : "text-destructive")}>
          {footerText}
        </span>
        <md-filled-button onClick={saveAll} disabled={savingAll || p.saving}>
          <MaterialSymbol name="save" size={18} slot="icon" />
          {savingAll ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </md-filled-button>
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
