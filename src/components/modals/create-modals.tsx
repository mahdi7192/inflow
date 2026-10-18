"use client";

import React, { useState } from "react";
import { X, Plus, Loader2, Film } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { Button, Input, Textarea } from "@/components/ui/primitives";

export function AddAccountModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [followers, setFollowers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().replace(/^@/, ""),
          display_name: displayName.trim() || username.trim(),
          bio: bio.trim(),
          followers_text: followers.trim() || "1.2K",
        }),
      });
      const data = await res.json();
      if (data.success && data.account) {
        onCreated(data.account.username);
        setUsername("");
        setDisplayName("");
        setBio("");
        setFollowers("");
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-secondary/30">
          <div className="flex items-center gap-2">
            <InstagramIcon className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              افزودن پیج اینستاگرام جدید به پلتفرم inFlow
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-foreground font-medium">
              یوزرنیم پیج اینستاگرام (بدون @) *
            </label>
            <Input
              dir="ltr"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. tehran.style"
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-foreground font-medium">
              نام نمایشی پیج / برند
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثال: فروشگاه تهران استایل"
              className="h-9 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-foreground font-medium">
                تعداد فالوور (اختیاری)
              </label>
              <Input
                dir="ltr"
                type="text"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="e.g. 24.5K"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-foreground font-medium">
                توضیحات کوتاه
              </label>
              <Input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="پوشاک و اکسسوری"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>ثبت پیج در پلتفرم</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddPostModal({
  open,
  accountUsername,
  onClose,
  onCreated,
}: {
  open: boolean;
  accountUsername: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [shortcodeOrUrl, setShortcodeOrUrl] = useState("");
  const [postType, setPostType] = useState<"reel" | "post">("reel");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcodeOrUrl.trim()) return;
    setSubmitting(true);
    try {
      const isUrl = shortcodeOrUrl.includes("instagram.com");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_username: accountUsername,
          shortcode: isUrl ? "" : shortcodeOrUrl.trim(),
          url: isUrl ? shortcodeOrUrl.trim() : "",
          post_type: postType,
          caption: caption.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated();
        setShortcodeOrUrl("");
        setCaption("");
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-secondary/30">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-foreground">
              ثبت پست یا ریلز جدید برای @{accountUsername}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-foreground font-medium">
              لینک پست اینستاگرام یا کد پست (Shortcode) *
            </label>
            <Input
              dir="ltr"
              type="text"
              required
              value={shortcodeOrUrl}
              onChange={(e) => setShortcodeOrUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/DehQhnjoEcr/ or DehQhnjoEcr"
              className="h-9 font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-foreground font-medium">
              نوع محتوا
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostType("reel")}
                className={`h-9 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  postType === "reel"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-secondary/60"
                }`}
              >
                🎬 ریلز (Reel)
              </button>
              <button
                type="button"
                onClick={() => setPostType("post")}
                className={`h-9 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  postType === "post"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-secondary/60"
                }`}
              >
                📷 پست (Post)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-foreground font-medium">
              کپشن پست (کانتکس پایه هوش مصنوعی)
            </label>
            <Textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="متن کپشن پست یا توضیحات محصول را وارد کنید..."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>افزودن پست</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
