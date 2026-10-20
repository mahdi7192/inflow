"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, AlertCircle } from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";

interface DmHeaderToggleProps {
  enabled: boolean;
  onToggle: (nextState: boolean) => Promise<boolean | void>;
  lang?: Lang;
  disabled?: boolean;
}

export function DmHeaderToggle({
  enabled,
  onToggle,
  lang = "fa",
  disabled = false,
}: DmHeaderToggleProps) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const handleCheckedChange = async (checked: boolean) => {
    const previous = localEnabled;
    setLocalEnabled(checked);
    setIsUpdating(true);

    try {
      const res = await onToggle(checked);
      if (res === false) {
        setLocalEnabled(previous);
        showToast("خطا در تغییر وضعیت اتوماسیون", "error");
      } else {
        showToast(
          checked
            ? t("dmMasterToggleToastOn")
            : t("dmMasterToggleToastOff"),
          "success"
        );
      }
    } catch (err) {
      console.error("Toggle error:", err);
      setLocalEnabled(previous);
      showToast("خطا در برقراری ارتباط با سرور", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Sync if prop updates from outside
  React.useEffect(() => {
    setLocalEnabled(enabled);
  }, [enabled]);

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 end-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-xs shadow-xl animate-in fade-in slide-in-from-bottom-3 ${
            toastMsg.type === "success"
              ? "bg-zinc-900 text-white border border-zinc-700"
              : "bg-rose-600 text-white border border-rose-500"
          }`}
        >
          {toastMsg.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Main Switch Card */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                localEnabled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {t("dmPluginTitle")}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    localEnabled
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-zinc-600 bg-zinc-100 border-zinc-200"
                  }`}
                >
                  {localEnabled ? t("dmMasterToggleActive") : t("dmMasterToggleInactive")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("dmPluginSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-medium text-muted-foreground select-none">
              {localEnabled ? t("statusOn") : t("statusOff")}
            </span>
            <Switch
              checked={localEnabled}
              onCheckedChange={handleCheckedChange}
              disabled={disabled || isUpdating}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>
    </>
  );
}
