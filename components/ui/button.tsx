"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium tracking-[-0.01em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.22)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-primary-foreground hover:bg-[rgb(37,99,235)]",
        secondary:
          "bg-[var(--color-hover)] text-foreground hover:bg-[rgba(229,231,235,0.92)]",
        outline:
          "border border-border bg-white text-[#4b5563] hover:bg-[var(--color-hover)] hover:text-foreground",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-[var(--color-hover)] hover:text-foreground",
        toolbar:
          "border border-transparent bg-transparent text-[#4b5563] hover:bg-[var(--color-hover)] hover:text-foreground",
        action:
          "bg-transparent text-[#374151] hover:bg-[var(--color-hover)] hover:text-foreground",
        destructive:
          "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)] hover:bg-[rgba(239,68,68,0.16)]"
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
