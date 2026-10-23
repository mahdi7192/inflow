import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-primary-container text-on-primary-container border-transparent",
        secondary: "bg-secondary-container text-on-secondary-container border-transparent",
        outline: "text-foreground border-outline-variant bg-transparent",
        emerald: "bg-[#EDF7EE] text-[#146C2E] border-[#B7E1CD]",
        amber: "bg-[#FFF3E0] text-[#B35F00] border-[#FFE082]",
        sky: "bg-[#E1F5FE] text-[#0277BD] border-[#B3E5FC]",
        purple: "bg-[#F3E5F5] text-[#7B1FA2] border-[#E1BEE7]",
        fuchsia: "bg-[#FCE4EC] text-[#C2185B] border-[#F8BBD0]",
        destructive: "bg-[#FDE8E8] text-[#BA1A1A] border-[#F8B4B4]",
        muted: "bg-surface-container-high text-muted-foreground border-outline-variant/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
