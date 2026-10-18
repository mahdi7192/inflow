import React from "react";
import { InstagramIcon } from "./icons";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "default",
  showText = true,
  className,
}: BrandLogoProps) {
  const sizeStyles = {
    sm: {
      container: "w-6 h-6 rounded-lg",
      icon: "w-3.5 h-3.5",
      text: "text-sm",
    },
    default: {
      container: "w-9 h-9 rounded-xl",
      icon: "w-5 h-5",
      text: "text-xl",
    },
    lg: {
      container: "w-12 h-12 rounded-2xl",
      icon: "w-6 h-6",
      text: "text-2xl",
    },
  };

  const current = sizeStyles[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0",
          current.container
        )}
      >
        <InstagramIcon className={cn("text-white", current.icon)} />
      </div>
      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight text-zinc-950",
            current.text
          )}
        >
          inFlow
        </span>
      )}
    </div>
  );
}
