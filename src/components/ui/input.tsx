import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative w-full">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-muted-foreground">
            {icon}
          </div>
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs font-normal text-foreground placeholder:text-muted-foreground transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ps-10",
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs font-normal text-foreground placeholder:text-muted-foreground transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
