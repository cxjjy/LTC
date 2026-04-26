import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 items-center justify-center rounded-full border px-2.5 text-[11px] font-medium leading-none tracking-[0.01em]",
  {
    variants: {
      variant: {
        default: "border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.08)] text-[rgb(37,99,235)]",
        success: "border-[rgba(34,197,94,0.14)] bg-[rgba(34,197,94,0.08)] text-[rgb(21,128,61)]",
        warning: "border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.10)] text-[rgb(180,83,9)]",
        danger: "border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]",
        muted: "border-[rgba(203,213,225,0.9)] bg-[rgba(241,245,249,0.92)] text-[rgb(100,116,139)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
