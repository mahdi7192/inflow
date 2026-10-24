"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MaterialSymbol } from "@/components/ui/material-symbol";
import { type AccountPersona } from "@/lib/playbooks";
import { formatNumber as formatNumberI18n } from "@/lib/i18n";
import { useWorkspace } from "@/components/layout/workspace-context";
import { EngineBadge, LinkButtonField, SnippetChips, appendSnippet } from "@/components/playbook-fields";
import { M3TextField } from "@/components/material/m3";
import {
  M3Card,
  M3ModalSheet,
  M3SectionHeader,
  M3SegmentedButtons,
  M3SwitchRow,
} from "@/components/material/m3-layout";
import { cn } from "@/lib/utils";

export interface DrawerPostData {
  id: number;
  account_username: string;
  shortcode: string;
  media_id: string;
  url: string;
  post_type: "reel" | "post";
  thumbnail_url: string;
  caption: string;
  auto_reply: number;
  trigger_type: "all" | "ai_context" | "keywords";
  trigger_context: string;
  trigger_keywords: string;
  comment_action_type: "none" | "direct" | "ai";
  comment_action_text: string;
  dm_action_type: "none" | "direct" | "ai";
  dm_action_text: string;
  dm_require_follow: number;
  playbook_id?: string;
  cheat_sheet?: string;
  target_url?: string;
  target_button_text?: string;
  smart_moderation?: number;
  metrics_json?: string | null;
  logs_count?: number;
  dms_count?: number;
  replies_count?: number;
}

interface PostPlaybookDrawerProps {
  post: DrawerPostData | null;
  persona?: AccountPersona;
  accountUsername?: string;
  postMetrics?: Record<string, unknown>;
  onClose: () => void;
  onSaved: (updatedPost: DrawerPostData) => void;
}

function getProxiedImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const TRIGGERS: { id: DrawerPostData["trigger_type"]; label: string; icon: string }[] = [
  { id: "all", label: "همه کامنت‌ها", icon: "select_all" },
  { id: "keywords", label: "کلمات کلیدی", icon: "match_case" },
  { id: "ai_context", label: "تشخیص هوشمند", icon: "auto_awesome" },
];

const COMMENT_ACTIONS: { id: DrawerPostData["comment_action_type"]; label: string; icon: string }[] = [
  { id: "direct", label: "متن ثابت", icon: "chat" },
  { id: "ai", label: "پاسخ AI", icon: "auto_awesome" },
  { id: "none", label: "بدون پاسخ", icon: "block" },
];

const DM_ACTIONS: { id: DrawerPostData["dm_action_type"]; label: string; icon: string }[] = [
  { id: "direct", label: "پیام ثابت", icon: "send" },
  { id: "ai", label: "دستیار AI", icon: "neurology" },
  { id: "none", label: "بدون دایرکت", icon: "block" },
];

const COMMENT_AI_CHIPS = [
  { label: "+ تشکر و اعلام دایرکت", snippet: "از کاربر تشکر کن و بگو جزئیات را در دایرکت برایش فرستادیم." },
  { label: "+ فقط ایموجی تشویقی", snippet: "فقط با یک یا دو ایموجی تشویقی و صمیمی جواب بده، بدون متن." },
  { label: "+ دعوت به استوری", snippet: "کاربر را دعوت کن استوری‌های پیج را هم دنبال کند." },
];

const DM_AI_CHIPS = [
  { label: "+ قیمت و جزئیات محصول", snippet: "قیمت و مشخصات کامل محصول این پست را بگو." },
  { label: "+ مشاوره و سوال از نیاز", snippet: "اول درباره نیاز کاربر سوال بپرس و بعد مناسب‌ترین گزینه را پیشنهاد بده." },
  { label: "+ شخصی‌سازی پیشنهاد", snippet: "پیام را با نام کاربر و بر اساس کامنتش شخصی‌سازی کن." },
];

const CHEAT_SHEET_CHIPS = [
  { label: "+ قیمت و موجودی", snippet: "قیمت: … تومان | موجودی: …" },
  { label: "+ لینک خرید/دانلود", snippet: "لینک خرید/دانلود: https://…" },
  { label: "+ سایز و رنگ‌بندی", snippet: "سایزها: … | رنگ‌ها: …" },
  { label: "+ کد تخفیف", snippet: "کد تخفیف: …" },
];

export function PostPlaybookDrawer({
  post,
  accountUsername,
  postMetrics,
  onClose,
  onSaved,
}: PostPlaybookDrawerProps) {
  const workspace = useWorkspace();
  const lang = workspace?.lang ?? "fa";
  const dir = workspace?.dir ?? "rtl";
  const formatNumber =
    workspace?.formatNumber ?? ((n: number | string | undefined | null) => formatNumberI18n(n, lang));

  const [autoReply, setAutoReply] = useState(false);
  const [triggerType, setTriggerType] = useState<DrawerPostData["trigger_type"]>("all");
  const [triggerKeywords, setTriggerKeywords] = useState("");
  const [triggerContext, setTriggerContext] = useState("");

  const [commentActionType, setCommentActionType] = useState<DrawerPostData["comment_action_type"]>("ai");
  const [commentActionText, setCommentActionText] = useState("");

  const [dmActionType, setDmActionType] = useState<DrawerPostData["dm_action_type"]>("ai");
  const [dmActionText, setDmActionText] = useState("");
  const [dmRequireFollow, setDmRequireFollow] = useState(false);

  const [cheatSheet, setCheatSheet] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetButtonText, setTargetButtonText] = useState("");
  const [smartModeration, setSmartModeration] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!post) return;
    setAutoReply(post.auto_reply === 1);
    setTriggerType(post.trigger_type || "all");
    setTriggerKeywords(post.trigger_keywords || "");
    setTriggerContext(post.trigger_context || "");
    setCommentActionType(post.comment_action_type || "ai");
    setCommentActionText(post.comment_action_text || "");
    setDmActionType(post.dm_action_type || "ai");
    setDmActionText(post.dm_action_text || "");
    setDmRequireFollow(post.dm_require_follow === 1);
    setCheatSheet(post.cheat_sheet || "");
    setTargetUrl(post.target_url || "");
    setTargetButtonText(post.target_button_text || "");
    setSmartModeration(post.smart_moderation === 1);
    setSaved(false);
    setError("");
  }, [post]);

  if (!post) return null;

  const isReel = post.post_type === "reel";
  const contentTypeTitle = isReel ? "ریلز" : "پست";
  const usesAgent = commentActionType === "ai" || dmActionType === "ai" || triggerType === "ai_context";
  const dmSettingsHref = `/@${accountUsername || post.account_username}/dms`;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${post.shortcode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply: autoReply,
          playbook_id: post.playbook_id || "custom",
          cheat_sheet: cheatSheet,
          target_url: targetUrl,
          target_button_text: targetButtonText,
          smart_moderation: smartModeration,
          trigger_type: triggerType,
          trigger_context: triggerContext,
          trigger_keywords: triggerKeywords,
          comment_action_type: commentActionType,
          comment_action_text: commentActionText,
          dm_action_type: dmActionType,
          dm_action_text: dmActionText,
          dm_require_follow: dmRequireFollow,
        }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        onSaved(data.post);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error || "خطا در ذخیره تنظیمات");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  // Metrics extraction
  let metrics: Record<string, unknown> = postMetrics || {};
  if (!postMetrics && post.metrics_json) {
    try {
      metrics = JSON.parse(post.metrics_json);
    } catch {
      metrics = {};
    }
  }
  const views = Number(metrics.views || metrics.plays || 0);
  const follows = Number(metrics.follows || 0);

  const metricChips = [
    views > 0 && { icon: "visibility", label: "بازدید", value: formatNumber(views) },
    (post.logs_count ?? 0) > 0 && { icon: "chat_bubble", label: "کامنت", value: formatNumber(post.logs_count) },
    (post.dms_count ?? 0) > 0 && { icon: "send", label: "دایرکت", value: formatNumber(post.dms_count) },
    follows > 0 && { icon: "person_add", label: "فالوور", value: `+${formatNumber(follows)}` },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <M3ModalSheet
      open
      onClose={onClose}
      dir={dir}
      labelledBy="playbook-drawer-title"
      header={
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-container-highest shrink-0 flex items-center justify-center text-on-surface-variant">
            <MaterialSymbol name={isReel ? "movie" : "image"} size={24} />
            {post.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getProxiedImageUrl(post.thumbnail_url)}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            )}
          </div>
          <div className="min-w-0">
            <h2 id="playbook-drawer-title" className="title-large text-on-surface truncate">
              سناریوی این {contentTypeTitle}
            </h2>
            <p className="body-small text-on-surface-variant truncate">
              {post.caption || `${contentTypeTitle} بدون کپشن`}
            </p>
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
            <md-filled-button onClick={handleSave} disabled={saving}>
              <MaterialSymbol name={saved ? "check" : "save"} size={18} slot="icon" />
              {saved ? "ذخیره شد" : saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
            </md-filled-button>
          </div>
        </>
      }
    >
      {metricChips.length > 0 && (
        <md-chip-set aria-label="آمار این پست">
          {metricChips.map((m) => (
            <md-assist-chip key={m.label} label={`${m.label}: ${m.value}`}>
              <MaterialSymbol name={m.icon} size={18} slot="icon" />
            </md-assist-chip>
          ))}
        </md-chip-set>
      )}

      {/* Master toggle */}
      <M3Card tone="high">
        <M3SwitchRow
          icon={autoReply ? "bolt" : "power_settings_new"}
          title={`اتوماسیون مستقیم این ${contentTypeTitle}`}
          supporting={`فقط کامنت‌های همین ${contentTypeTitle} با قوانین زیر بررسی می‌شوند.`}
          selected={autoReply}
          onChange={setAutoReply}
        />
      </M3Card>

      <div className={cn("space-y-3 transition-opacity", !autoReply && "opacity-38 pointer-events-none")} aria-disabled={!autoReply}>
        <div className="flex items-center justify-between gap-2 pt-3 px-1">
          <h3 className="label-large text-on-surface-variant">قوانین اتوماسیون مستقیم</h3>
          <EngineBadge engine="rules" />
        </div>

        {/* 1. Trigger */}
        <M3Card tone="default" className="space-y-4">
          <M3SectionHeader icon="filter_alt" title="ماشه: چه کامنت‌هایی پاسخ بگیرند؟" />
          <M3SegmentedButtons value={triggerType} options={TRIGGERS} onChange={setTriggerType} ariaLabel="نوع ماشه" />
          {triggerType === "keywords" && (
            <M3TextField
              label="کلمات کلیدی"
              supportingText="با ویرگول جدا کنید؛ مثلاً: قیمت، لینک، خرید"
              value={triggerKeywords}
              onValueChange={setTriggerKeywords}
            />
          )}
          {triggerType === "ai_context" && (
            <M3TextField
              label="شرط هوشمند"
              supportingText="مثلاً: فقط سوالات قیمت یا موجودی"
              value={triggerContext}
              onValueChange={setTriggerContext}
            />
          )}
        </M3Card>

        {/* 2. Public comment reply */}
        <M3Card tone="default" className="space-y-4">
          <M3SectionHeader icon="forum" title="پاسخ عمومی زیر کامنت" />
          <M3SegmentedButtons value={commentActionType} options={COMMENT_ACTIONS} onChange={setCommentActionType} ariaLabel="نوع پاسخ کامنت" />
          {commentActionType === "direct" && (
            <M3TextField
              multiline
              rows={2}
              label="متن پاسخ ثابت"
              value={commentActionText}
              onValueChange={setCommentActionText}
            />
          )}
          {commentActionType === "ai" && (
            <>
              <M3TextField
                multiline
                rows={2}
                label="دستورالعمل اختیاری برای پاسخ AI"
                supportingText="AI متناسب با کامنت و لحن برند، یک پاسخ کوتاه عمومی می‌نویسد."
                value={commentActionText}
                onValueChange={setCommentActionText}
              />
              <SnippetChips
                chips={COMMENT_AI_CHIPS}
                onPick={(snippet) => setCommentActionText((prev) => appendSnippet(prev, snippet))}
              />
            </>
          )}
        </M3Card>

        {/* 3. Direct message */}
        <M3Card tone="default" className="space-y-4">
          <M3SectionHeader icon="send" title="پیام خصوصی در دایرکت" />
          <M3SegmentedButtons value={dmActionType} options={DM_ACTIONS} onChange={setDmActionType} ariaLabel="نوع پیام دایرکت" />
          {dmActionType === "direct" && (
            <M3TextField
              multiline
              rows={3}
              label="متن پیام ثابت"
              supportingText="بلافاصله و بدون AI به دایرکت کاربر ارسال می‌شود."
              value={dmActionText}
              onValueChange={setDmActionText}
            />
          )}
          {dmActionType === "ai" && (
            <>
              <div className="flex items-start gap-3 rounded-xl bg-tertiary-container text-on-tertiary-container p-3">
                <MaterialSymbol name="neurology" size={20} fill className="shrink-0 mt-0.5" />
                <p className="body-small">
                  گفتگو به <b>دستیار ایجنتیک دایرکت</b> سپرده می‌شود: گفتگوی چندمرحله‌ای با دانش سایت (RAG)، لحن و اهداف برند و ثبت شماره مشتری.{" "}
                  <Link href={dmSettingsHref} className="underline underline-offset-2 font-semibold">
                    تنظیمات دستیار
                  </Link>
                </p>
              </div>
              <M3TextField
                multiline
                rows={3}
                label={`دستور اختصاصی دستیار برای این ${contentTypeTitle}`}
                value={dmActionText}
                onValueChange={setDmActionText}
              />
              <SnippetChips
                chips={DM_AI_CHIPS}
                onPick={(snippet) => setDmActionText((prev) => appendSnippet(prev, snippet))}
              />
            </>
          )}
        </M3Card>

        {/* 4. CTA link button */}
        <M3Card tone="default">
          <LinkButtonField
            buttonText={targetButtonText}
            url={targetUrl}
            onButtonTextChange={setTargetButtonText}
            onUrlChange={setTargetUrl}
            fallbackTitle={lang === "en" ? "View & Buy 🛍️" : "مشاهده و خرید 🛍️"}
          />
        </M3Card>

        {/* 5. Follow gate & spam shield */}
        <M3Card tone="default" className="space-y-5">
          <M3SwitchRow
            icon="lock"
            title="قفل فالو (Follow Gate)"
            supporting="پیام دایرکت و لینک فقط پس از فالو کردن پیج ارسال می‌شود."
            selected={dmRequireFollow}
            onChange={setDmRequireFollow}
          />
          <md-divider />
          <M3SwitchRow
            icon="shield"
            title="محافظ اسپم و رقبا"
            supporting="مخفی‌سازی خودکار کامنت‌های تبلیغاتی، توهین‌آمیز و تخریبی."
            selected={smartModeration}
            onChange={setSmartModeration}
          />
        </M3Card>

        {/* 6. Supplemental knowledge for AI steps */}
        {usesAgent && (
          <>
            <div className="flex items-center justify-between gap-2 pt-3 px-1">
              <h3 className="label-large text-on-surface-variant">دانش تکمیلی برای مراحل AI</h3>
              <EngineBadge engine="agentic" />
            </div>
            <M3Card tone="default" className="space-y-4">
              <M3SectionHeader
                icon="sticky_note_2"
                title={`تقلب‌نامه ${contentTypeTitle}`}
                supporting="اطلاعاتی که در کپشن نیست؛ با اولویت بالا به پاسخ‌های AI تزریق می‌شود."
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
