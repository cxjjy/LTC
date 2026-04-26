import type { LucideIcon } from "lucide-react";

import { SectionCard } from "@/components/section-card";

export function StatCard({
  title,
  value,
  description,
  icon: Icon
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <SectionCard className="h-full" contentClassName="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground">{title}</div>
            <div className="metric-figure mt-3 text-[30px] font-semibold tracking-[-0.05em] text-foreground">{value}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-hover)] text-[rgb(60,64,67)]">
            <Icon className="h-[19px] w-[19px] stroke-[1.8]" />
          </div>
        </div>
        <div className="text-sm leading-6 text-muted-foreground">{description}</div>
    </SectionCard>
  );
}
