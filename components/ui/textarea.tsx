import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "control-surface flex min-h-[124px] w-full rounded-[var(--radius-control)] px-3.5 py-3 text-sm leading-6 tracking-[-0.01em] text-foreground placeholder:text-muted-foreground/90 transition-all duration-200 focus-visible:border-[rgba(59,130,246,0.44)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.10)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
