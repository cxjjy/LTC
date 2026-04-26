import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning" | "danger";
type GroupAccent = "income" | "expense" | "result";

export type ProjectInlineMetric = {
  label: string;
  value: string;
  meta: string;
  tone?: MetricTone;
};

export type ProjectMetricGroupItem = {
  label: string;
  value: string;
  tone?: MetricTone;
};

export type ProjectMetricGroup = {
  title: string;
  accent: GroupAccent;
  items: ProjectMetricGroupItem[];
};

const toneClassMap: Record<MetricTone, { text: string; dot: string; panel: string; figure: string }> = {
  default: {
    text: "text-muted-foreground",
    dot: "bg-[rgba(107,114,128,0.75)]",
    panel: "bg-white",
    figure: "text-foreground"
  },
  success: {
    text: "text-[rgb(4,120,87)]",
    dot: "bg-[rgb(4,120,87)]",
    panel: "bg-white",
    figure: "text-[rgb(4,120,87)]"
  },
  warning: {
    text: "text-[rgb(180,83,9)]",
    dot: "bg-[rgb(180,83,9)]",
    panel: "bg-white",
    figure: "text-[rgb(180,83,9)]"
  },
  danger: {
    text: "text-[rgb(185,28,28)]",
    dot: "bg-[rgb(185,28,28)]",
    panel: "bg-white",
    figure: "text-[rgb(185,28,28)]"
  }
};

const accentClassMap: Record<GroupAccent, { chip: string; line: string; soft: string; value: string }> = {
  income: {
    chip: "bg-[rgba(59,130,246,0.12)] text-[rgb(37,99,235)]",
    line: "bg-[rgb(59,130,246)]",
    soft: "bg-[linear-gradient(180deg,rgba(239,246,255,0.9)_0%,rgba(255,255,255,1)_100%)]",
    value: "text-[rgb(37,99,235)]"
  },
  expense: {
    chip: "bg-[rgba(249,115,22,0.12)] text-[rgb(194,65,12)]",
    line: "bg-[rgb(249,115,22)]",
    soft: "bg-[linear-gradient(180deg,rgba(255,247,237,0.92)_0%,rgba(255,255,255,1)_100%)]",
    value: "text-[rgb(194,65,12)]"
  },
  result: {
    chip: "bg-[rgba(16,185,129,0.12)] text-[rgb(5,150,105)]",
    line: "bg-[rgb(16,185,129)]",
    soft: "bg-[linear-gradient(180deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,1)_100%)]",
    value: "text-[rgb(5,150,105)]"
  }
};

function PrimaryMetricCard({ metric }: { metric: ProjectInlineMetric }) {
  const tone = toneClassMap[metric.tone ?? "default"];

  return (
    <div
      className={cn(
        "min-h-[116px] min-w-0 rounded-[16px] border border-[rgba(229,231,235,0.92)] px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        tone.panel
      )}
    >
      <div className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground">{metric.label}</div>
      <div className={cn("metric-figure mt-2 text-[32px] font-semibold leading-none tracking-[-0.05em]", tone.figure)}>
        {metric.value}
      </div>
      <div className={cn("mt-3 inline-flex items-center gap-2 text-[12px] font-medium", tone.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
        <span>{metric.meta}</span>
      </div>
    </div>
  );
}

function GroupMetricCard({ group }: { group: ProjectMetricGroup }) {
  const accent = accentClassMap[group.accent];

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-[rgba(229,231,235,0.92)] p-5", accent.soft)}>
      <div className="absolute inset-x-0 top-0 h-[3px]">
        <div className={cn("h-full w-full", accent.line)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[14px] font-medium text-muted-foreground">{group.title}</div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em]", accent.chip)}>
          {group.title}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {group.items.map((item, index) => {
          const tone = toneClassMap[item.tone ?? "default"];

          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center justify-between gap-4 rounded-[12px] border border-[rgba(241,245,249,0.9)] bg-white/88 px-4 py-3",
                index === group.items.length - 1 && "mb-0"
              )}
            >
              <div className="text-[13px] font-medium text-muted-foreground">{item.label}</div>
              <div className={cn("metric-figure text-[22px] font-semibold leading-none tracking-[-0.03em]", tone.figure, group.accent === "result" && accent.value)}>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectMetricsStrip({
  primaryItems,
  groups
}: {
  primaryItems: ProjectInlineMetric[];
  groups: ProjectMetricGroup[];
}) {
  return (
    <section className="workspace-panel overflow-hidden rounded-2xl">
      <div className="workspace-panel-section border-t-0 px-6 py-4">
        <div className="text-sm font-semibold text-foreground">经营核心指标</div>
        <p className="mt-1 text-sm text-muted-foreground">
          先看收入、回款和利润，再看采购、付款与现金表现。
        </p>
      </div>

      <div className="px-6 pb-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {primaryItems.map((item) => (
            <PrimaryMetricCard key={item.label} metric={item} />
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupMetricCard key={group.title} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}
