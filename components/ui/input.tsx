import * as React from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    if (type === "date") {
      return <DatePicker className={className} ref={ref} {...props} />;
    }

    if (type === "time" || type === "datetime-local") {
      return <TimePicker className={className} pickerType={type === "time" ? "time" : "datetime-local"} ref={ref} {...props} />;
    }

    return (
      <input
        type={type}
        className={cn(
          "control-surface flex h-9 w-full rounded-[10px] px-3 py-2 text-sm tracking-[-0.01em] text-foreground placeholder:text-muted-foreground/90 transition-all duration-150 focus-visible:border-[rgba(59,130,246,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.16)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
