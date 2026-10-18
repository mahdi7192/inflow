import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-zinc-200/80 shadow-2xs",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
        brand:
          "bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs",
        emerald:
          "bg-emerald-600 text-white font-medium hover:bg-emerald-500 shadow-xs",
      },
      size: {
        default: "h-9 px-3.5 py-2 text-xs rounded-lg",
        sm: "h-7 px-2.5 text-[11px] rounded-md",
        lg: "h-11 px-5 text-sm rounded-xl",
        icon: "h-8 w-8 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
