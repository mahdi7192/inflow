"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Copy,
  Check,
  RotateCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Bot,
  Activity,
  Terminal,
  Globe,
} from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HermesMcpModalProps {
  lang: Lang;
  accountUsername: string;
  onClose: () => void;
  onTokenRotated?: () => void;
}

export function HermesMcpModal({
  lang,
  accountUsername,
  onClose,
  onTokenRotated,
}: HermesMcpModalProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;
  const isRtl = lang === "fa" || lang === "ar";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    bot_profile_id: string;
    api_token: string;
    last_heartbeat_at: string | null;
    hermes_mcp_config: {
      http_sse: Record<string, unknown>;
      stdio: Record<string, unknown>;
    };
  } | null>(null);

  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<"http" | "stdio">("http");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backoffice/accounts/${accountUsername}/token`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load token details");
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to fetch details");
    } finally {
      setLoading(false);
    }
  }, [accountUsername]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = (text: string, type: "token" | "config") => {
    navigator.clipboard.writeText(text);
    if (type === "token") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setRotating(true);
    setError(null);
    try {
      const res = await fetch(`/api/backoffice/accounts/${accountUsername}/token`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setConfirmRotate(false);
        await fetchData();
        if (onTokenRotated) onTokenRotated();
      } else {
        setError(json.error || "Failed to regenerate token");
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to regenerate token");
    } finally {
      setRotating(false);
    }
  };

  const currentConfigJson = data
    ? JSON.stringify(
        activeTab === "http"
          ? data.hermes_mcp_config.http_sse
          : data.hermes_mcp_config.stdio,
        null,
        2
      )
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card
        className="w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border-zinc-200 bg-white shadow-2xl rounded-2xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 text-white shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 font-sans tracking-tight">
                  {t("mcpModalTitle")}
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  @{accountUsername}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                {t("mcpModalSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-xs">
              <RotateCw className="w-4 h-4 animate-spin mr-2" />
              {t("syncing")}
            </div>
          ) : data ? (
            <>
              {/* Bot Profile & Heartbeat Meta */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px] mb-0.5">
                    {t("botProfileLabel")}
                  </span>
                  <span className="font-mono font-semibold text-zinc-800">
                    {data.bot_profile_id}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px] mb-0.5">
                    {t("lastHeartbeatLabel")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Activity
                      className={`w-3.5 h-3.5 ${
                        data.last_heartbeat_at ? "text-emerald-600" : "text-zinc-300"
                      }`}
                    />
                    <span className="font-mono text-zinc-700">
                      {data.last_heartbeat_at || t("neverHeartbeat")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated Bearer Token Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800">
                    {t("pageDedicatedTokenLabel")}
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Per-Page Scoped
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showToken ? "text" : "password"}
                      readOnly
                      dir="ltr"
                      value={data.api_token}
                      className="w-full h-10 px-3 pr-10 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                      title={showToken ? "Hide token" : "Show token"}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy(data.api_token, "token")}
                    className="h-10 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                        {t("copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />
                        {t("copyTokenBtn")}
                      </>
                    )}
                  </Button>
                </div>

                {/* Token Rotation Warning & Button */}
                <div className="pt-1">
                  {!confirmRotate ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRotate(true)}
                      className="text-[11px] text-zinc-500 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>{t("regenerateTokenBtn")}</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-red-700">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">
                          {t("regenerateConfirmBody")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setConfirmRotate(false)}
                          className="px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 rounded-md"
                        >
                          {t("cancelBtn")}
                        </button>
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          disabled={rotating}
                          className="px-2.5 py-1 text-[11px] font-medium bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"
                        >
                          {rotating ? t("syncing") : t("regenerateTokenBtn")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ready-to-copy Hermes MCP Configuration Block */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 p-0.5 bg-zinc-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveTab("http")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                        activeTab === "http"
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t("mcpConfigTabHttp")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("stdio")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                        activeTab === "stdio"
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      {t("mcpConfigTabStdio")}
                    </button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleCopy(currentConfigJson, "config")}
                    className="h-8 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs"
                  >
                    {copiedConfig ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                        {t("configCopied")}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {t("copyConfigBtn")}
                      </>
                    )}
                  </Button>
                </div>

                {/* Preformatted Config Container (Enforce LTR) */}
                <div dir="ltr" className="relative group">
                  <pre className="p-4 text-xs font-mono bg-zinc-950 text-zinc-100 rounded-xl overflow-x-auto border border-zinc-800 leading-relaxed max-h-52">
                    <code>{currentConfigJson}</code>
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/50 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium border-zinc-200 text-zinc-700 hover:bg-zinc-100"
          >
            {t("closeMenu")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
