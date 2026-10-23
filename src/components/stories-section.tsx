"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Flame, RefreshCw } from "lucide-react";
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-rose-500" />
          استوری‌های فعال (۲۴ ساعت)
          <span className="text-xs font-normal text-slate-500">
            {activeStories.length.toLocaleString("fa-IR")} استوری
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">پیش‌فرض ریپلای استوری:</label>
          <select
            value={mode}
            onChange={(e) => changeMode(e.target.value as DefaultMode)}
            title={MODES.find((m) => m.id === mode)?.hint}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="بروزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {activeStories.length === 0 ? (
        <p className="text-xs text-slate-500">در حال حاضر استوری فعالی ندارید.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {activeStories.map((st) => {
            const on = st.auto_reply === 1;
            const thumb = st.thumbnail_url || st.media_url;
            return (
              <button
                key={st.id}
                onClick={() => setActive(st)}
                className="w-24 flex flex-col items-center gap-1.5 text-center group"
              >
                <span className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600">
                  <span className="block w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white">
                    {thumb && (
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
                <span className="text-[11px] text-slate-500">{timeLeft(st.expires_at, now)}</span>
                <span
                  className={`text-[11px] font-semibold ${
                    on
                      ? "text-emerald-700"
                      : mode === "auto"
                      ? "text-indigo-600"
                      : "text-slate-400"
                  }`}
                >
                  {on ? "تنظیم اختصاصی فعال" : mode === "auto" ? "پیش‌فرض: هوشمند" : mode === "ignore" ? "خاموش" : "بدون تنظیم"}
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
