import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Material 3 Button Archetypes
        default:
          "bg-primary text-primary-foreground hover:opacity-95 shadow-xs rounded-full",
        filled:
          "bg-primary text-primary-foreground hover:opacity-95 shadow-xs rounded-full",
        tonal:
          "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 rounded-full",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 rounded-full",
        outline:
          "border border-outline-variant bg-transparent text-foreground hover:bg-surface-container-high rounded-full",
        ghost:
          "text-foreground hover:bg-surface-container-high rounded-full",
        text:
          "text-primary hover:bg-primary-container/30 rounded-full",
        elevated:
          "bg-surface-container-lowest text-primary border border-outline-variant/60 shadow-xs hover:shadow-sm rounded-full",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 rounded-full",
        brand:
          "bg-primary text-primary-foreground hover:opacity-95 shadow-xs rounded-full",
        emerald:
          "bg-[#146C2E] text-white hover:bg-[#115C27] rounded-full",
      },
      size: {
        default: "h-10 px-5 py-2 text-xs rounded-full",
        sm: "h-8 px-3.5 text-[11px] rounded-full",
        lg: "h-12 px-6 text-sm rounded-full",
        icon: "h-9 w-9 rounded-full p-0 flex items-center justify-center",
        "icon-sm": "h-8 w-8 rounded-full p-0 flex items-center justify-center",
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
