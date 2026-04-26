"use client";

type TrendDirection = "up" | "down" | "flat";
type TrendTone = "neutral" | "good" | "warning" | "danger";

export type BossKpiItem = {
  label: string;
  value: string;
  helper: string;
  trendLabel: string;
  trendDirection: TrendDirection;
  trendTone?: TrendTone;
  riskLabel?: string;
  riskTone?: TrendTone;
  emphasize?: boolean;
};

type BossKpiStripProps = {
  primary: BossKpiItem[];
  secondary: BossKpiItem[];
};

export function BossKpiStrip({ primary, secondary }: BossKpiStripProps) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[rgba(229,231,235,0.92)] bg-white">
      <KpiRow items={primary} columnsClassName="xl:grid-cols-3" />
      <div className="h-px bg-[rgba(229,231,235,0.92)]" />
      <KpiRow items={secondary} columnsClassName="xl:grid-cols-4" compact />
    </section>
  );
}

function KpiRow({
  items,
  columnsClassName,
  compact = false
}: {
  items: BossKpiItem[];
  columnsClassName: string;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 gap-px bg-[rgba(229,231,235,0.92)] md:grid-cols-2 ${columnsClassName}`}>
      {items.map((item) => (
        <KpiMetricItem key={item.label} item={item} compact={compact} />
      ))}
    </div>
  );
}

function KpiMetricItem({
  item,
  compact
}: {
  item: BossKpiItem;
  compact: boolean;
}) {
  return (
    <div className={`min-w-0 bg-white px-6 md:px-7 ${compact ? "py-5" : "py-6"}`}>
      <div className="text-[12px] font-medium leading-5 text-muted-foreground">{item.label}</div>
      <div
        className={[
          "mt-2 whitespace-nowrap font-semibold leading-none tracking-[-0.04em] [font-variant-numeric:tabular-nums]",
          item.emphasize ? "text-[36px] text-[var(--color-success)]" : compact ? "text-[30px] text-foreground" : "text-[34px] text-foreground"
        ].join(" ")}
      >
        {item.value}
      </div>
      <div className="mt-2 truncate text-[12px] leading-5 text-muted-foreground">{item.helper}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrendPill
          label={item.trendLabel}
          direction={item.trendDirection}
          tone={item.trendTone ?? "neutral"}
        />
        {item.riskLabel ? <RiskText label={item.riskLabel} tone={item.riskTone ?? "neutral"} /> : null}
      </div>
    </div>
  );
}

function TrendPill({
  label,
  direction,
  tone
}: {
  label: string;
  direction: TrendDirection;
  tone: TrendTone;
}) {
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const className =
    tone === "good"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : "text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${className}`}>
      <span>{arrow}</span>
      <span>{label}</span>
    </span>
  );
}

function RiskText({
  label,
  tone
}: {
  label: string;
  tone: TrendTone;
}) {
  const className =
    tone === "good"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : "text-muted-foreground";

  return <span className={`text-[12px] ${className}`}>{label}</span>;
}
