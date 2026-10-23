"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { StoryPlaybookDrawer, type DrawerStoryData } from "@/components/story-playbook-drawer";

type DefaultMode = "auto" | "configured_only" | "ignore";

const MODES: { id: DefaultMode; label: string; hint: string }[] = [
  { id: "auto", label: "پاسخ هوشمند به همه", hint: "استوری‌های بدون تنظیم هم با هوش مصنوعی پاسخ می‌گیرند" },
  { id: "configured_only", label: "فقط استوری‌های تنظیم‌شده", hint: "فقط استوری‌هایی که برایشان پاسخ خودکار روشن کرده‌اید" },
  { id: "ignore", label: "خاموش", hint: "به هیچ ریپلای استوری پاسخ داده نمی‌شود" },
];

function proxied(url: string) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function timeLeft(expiresAt: string | null, now: number): string {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return "منقضی شده";
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h.toLocaleString("fa-IR")} ساعت مانده`;
  const m = Math.max(1, Math.floor(ms / 60000));
  return `${m.toLocaleString("fa-IR")} دقیقه مانده`;
}

export function StoriesSection({ accountUsername }: { accountUsername: string }) {
  const [stories, setStories] = useState<DrawerStoryData[]>([]);
  const [mode, setMode] = useState<DefaultMode>("auto");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<DrawerStoryData | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${accountUsername}/stories${refresh ? "?refresh=1" : ""}`);
        const data = await res.json();
        if (data.success) {
          setStories(data.stories || []);
          setMode(data.story_default_mode || "auto");
        }
      } catch {
        /* keep previous state */
      } finally {
        setLoading(false);
        setNow(Date.now());
      }
    },
    [accountUsername]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const changeMode = async (next: DefaultMode) => {
    const prev = mode;
    setMode(next);
    try {
      const res = await fetch(`/api/accounts/${accountUsername}/dm-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_handling_mode: next }),
      });
      if (!res.ok) setMode(prev);
    } catch {
      setMode(prev);
    }
  };

  const activeStories = stories.filter((s) => s.is_active);
  if (!loading && activeStories.length === 0 && mode === "auto" && stories.length === 0) return null;

  return (
    <section className="space-y-3.5 rounded-2xl bg-[#f8fafd] dark:bg-[#282a2d] p-4 sm:p-5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
          <MaterialSymbol name="local_fire_department" size={20} fill={true} className="text-rose-500" />
          <span>استوری‌های فعال (۲۴ ساعت اخیر)</span>
          <span className="text-[11px] font-normal text-muted-foreground px-2.5 py-0.5 rounded-full bg-white dark:bg-neutral-800 shadow-2xs">
            {activeStories.length.toLocaleString("fa-IR")} استوری
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#444746] dark:text-neutral-400">پیش‌فرض ریپلای استوری:</label>
          <div className="inline-flex items-center gap-1.5">
            <select
              value={mode}
              onChange={(e) => changeMode(e.target.value as DefaultMode)}
              title={MODES.find((m) => m.id === mode)?.hint}
              className="h-8 rounded-full border border-neutral-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs text-[#1f1f1f] dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] cursor-pointer"
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => load(true)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full text-[#444746] hover:bg-[#edf2fa] dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer shrink-0"
              aria-label="بروزرسانی"
            >
              <MaterialSymbol name="refresh" size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {activeStories.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">در حال حاضر استوری فعالی در ۲۴ ساعت گذشته ثبت نشده است.</p>
      ) : (
        <div className="flex flex-wrap gap-4 pt-1">
          {activeStories.map((st) => {
            const on = st.auto_reply === 1;
            const thumb = st.thumbnail_url || st.media_url;
            return (
              <button
                key={st.id}
                onClick={() => setActive(st)}
                className="w-24 flex flex-col items-center gap-1.5 text-center group cursor-pointer"
              >
                <span className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 transition-transform duration-200 group-hover:scale-105">
                  <span className="block w-16 h-16 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface-container-lowest">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxied(thumb)}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                      />
                    )}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">{timeLeft(st.expires_at, now)}</span>
                <span
                  className={`text-[10px] font-semibold ${
                    on
                      ? "text-emerald-700"
                      : mode === "auto"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {on ? "تنظیم اختصاصی فعال" : mode === "auto" ? "پیش‌فرض هوشمند" : mode === "ignore" ? "خاموش" : "بدون تنظیم"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <StoryPlaybookDrawer
        story={active}
        accountUsername={accountUsername}
        onClose={() => setActive(null)}
        onSaved={(updated) => {
          setStories((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          setActive(updated);
        }}
      />
    </section>
  );
}
