import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.01em]",
  {
  variants: {
    variant: {
      default: "border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.10)] text-[rgb(37,99,235)]",
      success: "border-[rgba(16,185,129,0.14)] bg-[rgba(16,185,129,0.10)] text-[rgb(4,120,87)]",
      warning: "border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.10)] text-[rgb(180,83,9)]",
      danger: "border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]",
      muted: "border-[rgba(229,231,235,0.9)] bg-[rgba(243,244,246,0.92)] text-muted-foreground"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
