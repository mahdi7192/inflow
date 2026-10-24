"use client";

import React, { useEffect, useState } from "react";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { useWorkspace } from "@/components/layout/workspace-context";
import { EngineBadge, LinkButtonField, SnippetChips, appendSnippet } from "@/components/playbook-fields";
import { M3FilterChip, M3TextField } from "@/components/material/m3";
import {
  M3Card,
  M3ModalSheet,
  M3SectionHeader,
  M3SegmentedButtons,
  M3SwitchRow,
} from "@/components/material/m3-layout";
import { cn } from "@/lib/utils";

export interface DrawerStoryData {
  id: string;
  account_username: string;
  media_type: string;
  thumbnail_url: string;
  media_url: string;
  caption: string;
  created_at: string | null;
  expires_at: string | null;
  is_active?: boolean;
  auto_reply: number;
  trigger_type: "all" | "keywords" | "ai_context";
  trigger_keywords: string;
  reply_mode: "direct" | "ai";
  reply_text: string;
  target_url: string;
  target_button_text?: string;
  cheat_sheet: string;
  require_follow: number;
  emoji_reaction_action: "ignore" | "like" | "quick_reply";
}

interface Props {
  story: DrawerStoryData | null;
  accountUsername: string;
  onClose: () => void;
  onSaved: (story: DrawerStoryData) => void;
}

function proxied(url: string) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const TRIGGERS: { id: DrawerStoryData["trigger_type"]; label: string; icon: string }[] = [
  { id: "all", label: "همه ریپلای‌ها", icon: "select_all" },
  { id: "keywords", label: "کلمات کلیدی", icon: "match_case" },
  { id: "ai_context", label: "تشخیص هوشمند", icon: "auto_awesome" },
];

const REPLY_MODES: { id: DrawerStoryData["reply_mode"]; label: string; icon: string }[] = [
  { id: "direct", label: "پیام ثابت", icon: "send" },
  { id: "ai", label: "پاسخ AI", icon: "neurology" },
];

const EMOJI: { id: DrawerStoryData["emoji_reaction_action"]; label: string }[] = [
  { id: "ignore", label: "نادیده بگیر" },
  { id: "like", label: "فقط ثبت کن" },
  { id: "quick_reply", label: "پاسخ کوتاه تشکر" },
];

const AI_CHIPS = [
  { label: "+ قیمت و جزئیات", snippet: "قیمت و مشخصات محصول این استوری را بگو." },
  { label: "+ دعوت به خرید", snippet: "کاربر را با لحن دوستانه به خرید یا ثبت سفارش دعوت کن." },
  { label: "+ پاسخ کوتاه و صمیمی", snippet: "کوتاه، صمیمی و با یک ایموجی جواب بده." },
];

const CHEAT_SHEET_CHIPS = [
  { label: "+ قیمت و موجودی", snippet: "قیمت: … تومان | موجودی: …" },
  { label: "+ لینک خرید", snippet: "لینک خرید: https://…" },
  { label: "+ کد تخفیف", snippet: "کد تخفیف: …" },
];

export function StoryPlaybookDrawer({ story, accountUsername, onClose, onSaved }: Props) {
  const workspace = useWorkspace();
  const dir = workspace?.dir ?? "rtl";
  const lang = workspace?.lang ?? "fa";

  const [autoReply, setAutoReply] = useState(false);
  const [triggerType, setTriggerType] = useState<DrawerStoryData["trigger_type"]>("all");
  const [keywords, setKeywords] = useState("");
  const [replyMode, setReplyMode] = useState<"direct" | "ai">("ai");
  const [replyText, setReplyText] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetButtonText, setTargetButtonText] = useState("");
  const [cheatSheet, setCheatSheet] = useState("");
  const [requireFollow, setRequireFollow] = useState(false);
  const [emoji, setEmoji] = useState<DrawerStoryData["emoji_reaction_action"]>("ignore");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!story) return;
    setAutoReply(story.auto_reply === 1);
    setTriggerType(story.trigger_type || "all");
    setKeywords(story.trigger_keywords || "");
    setReplyMode(story.reply_mode || "ai");
    setReplyText(story.reply_text || "");
    setTargetUrl(story.target_url || "");
    setTargetButtonText(story.target_button_text || "");
    setCheatSheet(story.cheat_sheet || "");
    setRequireFollow(story.require_follow === 1);
    setEmoji(story.emoji_reaction_action || "ignore");
    setSaved(false);
    setError("");
  }, [story]);

  if (!story) return null;

  const isVideo = story.media_type?.toUpperCase() === "VIDEO";
  const usesAgent = replyMode === "ai" || triggerType === "ai_context";

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/accounts/${accountUsername}/stories/${encodeURIComponent(story.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply: autoReply,
          trigger_type: triggerType,
          trigger_keywords: keywords,
          reply_mode: replyMode,
          reply_text: replyText,
          target_url: targetUrl,
          target_button_text: targetButtonText,
          cheat_sheet: cheatSheet,
          require_follow: requireFollow,
          emoji_reaction_action: emoji,
        }),
      });
      const data = await res.json();
      if (data.success && data.story) {
        onSaved({ ...story, ...data.story });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error === "Invalid target_url" ? "لینک باید با http یا https شروع شود" : "ذخیره نشد");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <M3ModalSheet
      open
      onClose={onClose}
      dir={dir}
      labelledBy="story-drawer-title"
      header={
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shrink-0">
            <div className="relative w-full h-full rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center text-on-surface-variant ring-2 ring-surface-container-low">
              <MaterialSymbol name={isVideo ? "movie" : "image"} size={22} />
              {(story.thumbnail_url || story.media_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxied(story.thumbnail_url || story.media_url)}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h2 id="story-drawer-title" className="title-large text-on-surface truncate">
              سناریوی این استوری
            </h2>
            <p className="body-small text-on-surface-variant truncate">{story.caption || "استوری بدون کپشن"}</p>
          </div>
        </div>
      }
      footer={
        <>
          <span className="body-small text-destructive" role="alert">
            {error}
          </span>
          <div className="flex items-center gap-2 ms-auto">
            <md-text-button onClick={onClose} disabled={saving}>
              انصراف
            </md-text-button>
            <md-filled-button onClick={save} disabled={saving}>
              <MaterialSymbol name={saved ? "check" : "save"} size={18} slot="icon" />
              {saved ? "ذخیره شد" : saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
            </md-filled-button>
          </div>
        </>
      }
    >
      <M3Card tone="high">
        <M3SwitchRow
          icon={autoReply ? "bolt" : "power_settings_new"}
          title="پاسخ خودکار به ریپلای‌های این استوری"
          supporting="فقط ریپلای همین استوری با قوانین زیر بررسی می‌شود؛ تنظیمات دایرکت عمومی دخالتی ندارند."
          selected={autoReply}
          onChange={setAutoReply}
        />
      </M3Card>

      <div className={cn("space-y-3 transition-opacity", !autoReply && "opacity-38 pointer-events-none")} aria-disabled={!autoReply}>
        <div className="flex items-center justify-between gap-2 pt-3 px-1">
          <h3 className="label-large text-on-surface-variant">قوانین اتوماسیون مستقیم</h3>
          <EngineBadge engine="rules" />
        </div>

        <M3Card tone="default" className="space-y-4">
          <M3SectionHeader icon="filter_alt" title="ماشه: چه ریپلای‌هایی پاسخ بگیرند؟" />
          <M3SegmentedButtons value={triggerType} options={TRIGGERS} onChange={setTriggerType} ariaLabel="نوع ماشه" />
          {triggerType === "keywords" && (
            <M3TextField
              label="کلمات کلیدی"
              supportingText="با ویرگول جدا کنید؛ مثلاً: قیمت، خرید، لینک"
              value={keywords}
              onValueChange={setKeywords}
            />
          )}
        </M3Card>

        <M3Card tone="default" className="space-y-4">
          <M3SectionHeader icon="send" title="پاسخ در دایرکت" />
          <M3SegmentedButtons value={replyMode} options={REPLY_MODES} onChange={setReplyMode} ariaLabel="نوع پاسخ" />
          {replyMode === "direct" ? (
            <M3TextField
              multiline
              rows={3}
              label="متن پیام ثابت"
              supportingText="بلافاصله و بدون AI ارسال می‌شود."
              value={replyText}
              onValueChange={setReplyText}
            />
          ) : (
            <>
              <M3TextField
                multiline
                rows={3}
                label="دستورالعمل اختیاری برای پاسخ AI"
                supportingText="مثلاً: قیمت را بگو و به خرید دعوت کن"
                value={replyText}
                onValueChange={setReplyText}
              />
              <SnippetChips chips={AI_CHIPS} onPick={(snippet) => setReplyText((prev) => appendSnippet(prev, snippet))} />
            </>
          )}
        </M3Card>

        <M3Card tone="default">
          <LinkButtonField
            buttonText={targetButtonText}
            url={targetUrl}
            onButtonTextChange={setTargetButtonText}
            onUrlChange={setTargetUrl}
            fallbackTitle={lang === "en" ? "Open link 🔗" : "مشاهده لینک 🔗"}
          />
        </M3Card>

        <M3Card tone="default" className="space-y-5">
          <M3SwitchRow
            icon="lock"
            title="قفل فالو (Follow Gate)"
            supporting="پاسخ فقط بعد از فالو کردن پیج ارسال می‌شود."
            selected={requireFollow}
            onChange={setRequireFollow}
          />
          <md-divider />
          <div className="space-y-3">
            <M3SectionHeader
              icon="add_reaction"
              title="ریپلای‌های فقط ایموجی"
              supporting="واکنش‌های ایموجی هرگز به AI ارسال نمی‌شوند."
            />
            <md-chip-set aria-label="واکنش به ایموجی">
              {EMOJI.map((o) => (
                <M3FilterChip key={o.id} label={o.label} selected={emoji === o.id} onClick={() => setEmoji(o.id)} />
              ))}
            </md-chip-set>
          </div>
        </M3Card>

        {usesAgent && (
          <>
            <div className="flex items-center justify-between gap-2 pt-3 px-1">
              <h3 className="label-large text-on-surface-variant">دانش تکمیلی برای پاسخ AI</h3>
              <EngineBadge engine="agentic" />
            </div>
            <M3Card tone="default" className="space-y-4">
              <M3SectionHeader
                icon="sticky_note_2"
                title="تقلب‌نامه استوری"
                supporting="بر تقلب‌نامه برند اولویت دارد و فقط برای ریپلای‌های همین استوری استفاده می‌شود."
              />
              <M3TextField
                multiline
                rows={3}
                label="قیمت، موجودی، لینک، کد تخفیف…"
                value={cheatSheet}
                onValueChange={setCheatSheet}
              />
              <SnippetChips
                chips={CHEAT_SHEET_CHIPS}
                onPick={(snippet) => setCheatSheet((prev) => appendSnippet(prev, snippet))}
              />
            </M3Card>
          </>
        )}
      </div>
    </M3ModalSheet>
  );
}
