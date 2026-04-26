import type { ComponentType } from "react";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type KpiMetric = {
  label: string;
  value: string;
  hint?: string;
  trend: {
    label: string;
    tone: "success" | "danger" | "warning" | "muted";
  };
};

function TrendIndicator({
  label,
  tone
}: {
  label: string;
  tone: KpiMetric["trend"]["tone"];
}) {
  const config = {
    success: {
      className: "text-[rgb(4,120,87)]",
      icon: ArrowUpRight
    },
    danger: {
      className: "text-[rgb(185,28,28)]",
      icon: ArrowDownRight
    },
    warning: {
      className: "text-[rgb(180,83,9)]",
      icon: AlertTriangle
    },
    muted: {
      className: "text-muted-foreground",
      icon: ArrowRight
    }
  } satisfies Record<KpiMetric["trend"]["tone"], { className: string; icon: ComponentType<{ className?: string }> }>;

  const Icon = config[tone].icon;

  return (
    <div className={cn("mt-3 inline-flex items-center gap-1.5 text-sm font-medium", config[tone].className)}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}

function KpiMetricBlock({ metric, featured = false }: { metric: KpiMetric; featured?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground">{metric.label}</div>
      <div
        className={cn(
          "metric-figure mt-3 font-semibold tracking-[-0.05em] text-foreground",
          featured ? "text-[36px]" : "text-[30px]"
        )}
      >
        {metric.value}
      </div>
      <TrendIndicator label={metric.trend.label} tone={metric.trend.tone} />
      {metric.hint ? <div className="mt-2 text-sm text-muted-foreground">{metric.hint}</div> : null}
    </div>
  );
}

export function KPISection({
  primary,
  secondary
}: {
  primary: KpiMetric[];
  secondary: KpiMetric[];
}) {
  return (
    <section className="workspace-panel overflow-hidden bg-white">
      <div className="px-6 py-5">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
          核心经营指标
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          {primary.map((metric) => (
            <KpiMetricBlock key={metric.label} metric={metric} featured />
          ))}
        </div>
      </div>

      <div className="workspace-panel-section px-6 py-5">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
          执行与成本
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {secondary.map((metric) => (
            <KpiMetricBlock key={metric.label} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  );
}
