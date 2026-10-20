"use client";

import { Toaster as Sonner, toast } from "sonner";
import { useWorkspace } from "@/components/layout/workspace-context";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const ws = useWorkspace();
  const dir: "rtl" | "ltr" =
    ws?.dir ||
    (typeof document !== "undefined" && document.documentElement.dir === "ltr"
      ? "ltr"
      : "rtl");

  return (
    <Sonner
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      className="toaster group font-vazir"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-950 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl text-xs",
          description: "group-[.toast]:text-zinc-500 text-[11px]",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-50 text-xs font-medium rounded-lg",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500 text-xs rounded-lg",
        },
      }}
      {...props}
    />
  );
}

export { toast };
