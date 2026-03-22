import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning" | "danger";

export type ProjectInlineMetric = {
  label: string;
  value: string;
  meta: string;
  tone?: MetricTone;
};

const toneClassMap: Record<MetricTone, { text: string; dot: string }> = {
  default: {
    text: "text-muted-foreground",
    dot: "bg-[rgba(107,114,128,0.75)]"
  },
  success: {
    text: "text-[rgb(4,120,87)]",
    dot: "bg-[rgb(4,120,87)]"
  },
  warning: {
    text: "text-[rgb(180,83,9)]",
    dot: "bg-[rgb(180,83,9)]"
  },
  danger: {
    text: "text-[rgb(185,28,28)]",
    dot: "bg-[rgb(185,28,28)]"
  }
};

function KPIInlineMetric({ metric }: { metric: ProjectInlineMetric }) {
  const tone = toneClassMap[metric.tone ?? "default"];

  return (
    <div className="min-w-0 bg-white px-6 py-5">
      <div className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground">
        {metric.label}
      </div>
      <div className="metric-figure mt-3 truncate text-[34px] font-semibold tracking-[-0.05em] text-foreground">
        {metric.value}
      </div>
      <div className={cn("mt-3 inline-flex items-center gap-2 text-sm font-medium", tone.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
        <span>{metric.meta}</span>
      </div>
    </div>
  );
}

export function ProjectMetricsStrip({ items }: { items: ProjectInlineMetric[] }) {
  return (
    <section className="workspace-panel overflow-hidden">
      <div className="workspace-panel-section border-t-0 px-6 py-4">
        <div className="text-sm font-semibold text-foreground">经营摘要</div>
        <p className="mt-1 text-sm text-muted-foreground">
          以合同、回款、成本和毛利为中心，快速判断项目经营状态。
        </p>
      </div>
      <div className="grid gap-px bg-[rgba(229,231,235,0.9)] md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <KPIInlineMetric key={item.label} metric={item} />
        ))}
      </div>
    </section>
  );
}
