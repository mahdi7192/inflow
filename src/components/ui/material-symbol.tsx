import React from "react";
import { cn } from "@/lib/utils";

export interface MaterialSymbolProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  fill?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  grade?: -25 | 0 | 200;
  opsz?: 20 | 24 | 40 | 48;
  size?: number | string;
  rtlMirror?: boolean;
}

// Directional symbols that inherently need flipping in RTL
const DIRECTIONAL_SYMBOLS = new Set([
  "arrow_back",
  "arrow_forward",
  "chevron_left",
  "chevron_right",
  "navigate_next",
  "navigate_before",
  "keyboard_arrow_left",
  "keyboard_arrow_right",
  "arrow_right_alt",
  "trending_flat",
  "undo",
  "redo",
  "reply",
  "forward",
  "logout",
  "login",
  "open_in_new",
  "last_page",
  "first_page",
]);

export function MaterialSymbol({
  name,
  fill = false,
  weight = 400,
  grade = 0,
  opsz = 24,
  size,
  rtlMirror,
  className,
  style,
  ...props
}: MaterialSymbolProps) {
  const shouldMirror = rtlMirror ?? DIRECTIONAL_SYMBOLS.has(name);

  const inlineStyles: React.CSSProperties = {
    fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opsz}`,
    fontSize: size ? (typeof size === "number" ? `${size}px` : size) : undefined,
    ...style,
  };

  return (
    <span
      className={cn(
        "material-symbols-rounded select-none inline-flex items-center justify-center leading-none",
        shouldMirror && "rtl-mirror",
        className
      )}
      style={inlineStyles}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
