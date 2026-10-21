"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { SidebarNav } from "@/components/sidebar-nav";
import { I18N } from "@/lib/i18n";
import type { AccountRow, DMLogRow } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { PageContainer, PageHeader, PageBody } from "@/components/layout/page-layout";
import { useWorkspace } from "@/components/layout/workspace-context";
import { DmLogsTable } from "./dm-logs-table";

export interface DmLogsPageViewProps {
  currentUser?: SafeUser | null;
  account: string;
  profile?: AccountRow;
  accounts?: AccountRow[];
  initialLogs: DMLogRow[];
  embeddedInShell?: boolean;
}

export function DmLogsPageView({
  account: propAccount,
  initialLogs,
  embeddedInShell = false,
}: DmLogsPageViewProps) {
  const router = useRouter();
  const workspace = useWorkspace();

  const account = workspace ? workspace.account : propAccount;
  const lang = workspace ? workspace.lang : "fa";
  const t = (key: string) => (workspace ? workspace.t(key) : I18N[lang]?.[key] || I18N.fa[key] || key);

  const [logs, setLogs] = useState<DMLogRow[]>(initialLogs);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleRefreshLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account}/dm-logs?limit=100`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error refreshing logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  if (embeddedInShell) {
    return (
      <PageContainer maxWidth="5xl">
        <PageHeader
          title={t("dmLogsTitle") || "سجل و تاریخچه دایرکت‌ها"}
          subtitle="مشاهده و پایش کلیه پیام‌ها، ریپلای‌ها و تعاملات ارسال‌شده از طریق ایجنت"
          badge={
            <Badge variant="outline" className="text-xs font-mono font-normal">
              <bdi>@{account}</bdi>
            </Badge>
          }
          actions={
            <Link href={`/@${account}/dms`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs cursor-pointer shadow-2xs">
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>بازگشت به تنظیمات دایرکت</span>
              </Button>
            </Link>
          }
        />

        <PageBody>
          <DmLogsTable
            logs={logs}
            onRefresh={handleRefreshLogs}
            loading={logsLoading}
            lang={lang}
          />
        </PageBody>
      </PageContainer>
    );
  }

  // Fallback standalone rendering
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-vazir" dir={lang === "en" ? "ltr" : "rtl"}>
      <PageContainer maxWidth="5xl">
        <DmLogsTable
          logs={logs}
          onRefresh={handleRefreshLogs}
          loading={logsLoading}
          lang={lang}
        />
      </PageContainer>
    </div>
  );
}
