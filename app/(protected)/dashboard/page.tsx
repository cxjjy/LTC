import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, Coins, Landmark, Siren, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BossKpiStrip, type BossKpiItem } from "@/components/boss-kpi-strip";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

const ProfitTrendChart = dynamic(
  () => import("@/components/charts/profit-trend-chart").then((module) => module.ProfitTrendChart),
  { ssr: false }
);

const ProjectProfitChart = dynamic(
  () => import("@/components/charts/project-profit-chart").then((module) => module.ProjectProfitChart),
  { ssr: false }
);

const CashflowTrendChart = dynamic(
  () => import("@/components/charts/cashflow-trend-chart").then((module) => module.CashflowTrendChart),
  { ssr: false }
);

const SalesFunnelChart = dynamic(
  () => import("@/components/charts/sales-funnel-chart").then((module) => module.SalesFunnelChart),
  { ssr: false }
);

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function buildAmountTrendLabel(meta: { delta: number; hasBase: boolean }) {
  if (meta.delta === 0) {
    return "较上月持平";
  }

  const amount = formatCurrency(Math.abs(meta.delta));
  if (!meta.hasBase) {
    return `较上月新增 ${amount}`;
  }

  return `较上月 ${meta.delta > 0 ? "+" : "-"}${amount}`;
}

function buildRateTrendLabel(meta: { delta: number; hasBase: boolean }) {
  if (meta.delta === 0) {
    return "较上月持平";
  }

  const points = `${Math.abs(meta.delta).toFixed(1)} 个点`;
  if (!meta.hasBase) {
    return `较上月新增 ${points}`;
  }

  return `较上月 ${meta.delta > 0 ? "+" : "-"}${points}`;
}

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const dashboard = await getDashboardMetrics(user);

  const primaryKpis: BossKpiItem[] = [
    {
      label: "总合同金额",
      value: formatCurrency(dashboard.metrics.totalContractAmount),
      helper: `已生效合同 ${dashboard.metrics.effectiveContractCount} 份`,
      trendLabel: buildAmountTrendLabel(dashboard.metrics.trends.totalContractAmount),
      trendDirection: dashboard.metrics.trends.totalContractAmount.direction,
      trendTone: dashboard.metrics.trends.totalContractAmount.direction === "down" ? "warning" : "good",
      riskLabel:
        dashboard.metrics.totalContractAmount === 0
          ? "签约规模偏弱"
          : dashboard.metrics.trends.totalContractAmount.direction === "down"
            ? "签约规模收缩"
            : "签约规模稳定"
    },
    {
      label: "已回款",
      value: formatCurrency(dashboard.metrics.totalReceivedAmount),
      helper: `整体回款率 ${formatPercent(dashboard.metrics.collectionRate)}`,
      trendLabel: buildAmountTrendLabel(dashboard.metrics.trends.totalReceivedAmount),
      trendDirection: dashboard.metrics.trends.totalReceivedAmount.direction,
      trendTone: dashboard.metrics.collectionRate < 60 ? "warning" : "good",
      riskLabel:
        dashboard.metrics.collectionRate < 60
          ? "回款节奏偏慢"
          : dashboard.cashflowSummary.currentMonthCollectionRate < 70
            ? "本月回笼偏慢"
            : "到账节奏良好"
    },
    {
      label: "总毛利",
      value: formatCurrency(dashboard.metrics.totalGrossProfit),
      helper: `亏损项目 ${dashboard.risks.lossProjectCount} 个`,
      trendLabel: buildAmountTrendLabel(dashboard.metrics.trends.totalGrossProfit),
      trendDirection: dashboard.metrics.trends.totalGrossProfit.direction,
      trendTone:
        dashboard.metrics.totalGrossProfit < 0
          ? "danger"
          : dashboard.metrics.trends.totalGrossProfit.direction === "down"
            ? "warning"
            : "good",
      riskLabel:
        dashboard.metrics.grossMargin < 10
          ? "利润承压"
          : dashboard.metrics.grossMargin < 20
            ? "毛利偏低"
            : "利润空间健康",
      riskTone:
        dashboard.metrics.grossMargin < 10 ? "danger" : dashboard.metrics.grossMargin < 20 ? "warning" : "good",
      emphasize: true
    }
  ];

  const secondaryKpis: BossKpiItem[] = [
    {
      label: "未回款",
      value: formatCurrency(dashboard.metrics.unreceivedAmount),
      helper: "合同口径待回收余额",
      trendLabel: buildAmountTrendLabel(dashboard.metrics.trends.unreceivedAmount),
      trendDirection: dashboard.metrics.trends.unreceivedAmount.direction,
      trendTone: dashboard.metrics.unreceivedAmount > dashboard.metrics.totalReceivedAmount ? "danger" : "warning",
      riskLabel:
        dashboard.cashflowSummary.overdueAmount > 0
          ? `逾期 ${formatCurrency(dashboard.cashflowSummary.overdueAmount)}`
          : dashboard.metrics.unreceivedAmount > dashboard.metrics.totalContractAmount * 0.45
            ? "待回款偏高"
            : "未回款可控",
      riskTone:
        dashboard.cashflowSummary.overdueAmount > 0
          ? "danger"
          : dashboard.metrics.unreceivedAmount > dashboard.metrics.totalContractAmount * 0.45
            ? "warning"
            : "good"
    },
    {
      label: "总成本",
      value: formatCurrency(dashboard.metrics.totalCostAmount),
      helper: `成本率 ${formatPercent(
        dashboard.metrics.totalContractAmount > 0
          ? (dashboard.metrics.totalCostAmount / dashboard.metrics.totalContractAmount) * 100
          : 0
      )}`,
      trendLabel: buildAmountTrendLabel(dashboard.metrics.trends.totalCostAmount),
      trendDirection: dashboard.metrics.trends.totalCostAmount.direction,
      trendTone: dashboard.metrics.trends.totalCostAmount.direction === "up" ? "warning" : "good",
      riskLabel:
        dashboard.metrics.totalContractAmount > 0 &&
        dashboard.metrics.totalCostAmount / dashboard.metrics.totalContractAmount > 0.8
          ? "成本压力偏高"
          : "成本结构稳定",
      riskTone:
        dashboard.metrics.totalContractAmount > 0 &&
        dashboard.metrics.totalCostAmount / dashboard.metrics.totalContractAmount > 0.8
          ? "warning"
          : "good"
    },
    {
      label: "毛利率",
      value: formatPercent(dashboard.metrics.grossMargin),
      helper: "整体利润空间",
      trendLabel: buildRateTrendLabel(dashboard.metrics.trends.grossMargin),
      trendDirection: dashboard.metrics.trends.grossMargin.direction,
      trendTone: dashboard.metrics.grossMargin < 10 ? "danger" : dashboard.metrics.grossMargin < 20 ? "warning" : "good",
      riskLabel:
        dashboard.metrics.grossMargin < 10
          ? "高风险利润结构"
          : dashboard.metrics.grossMargin < 20
            ? "毛利偏低"
            : "毛利健康",
      riskTone: dashboard.metrics.grossMargin < 10 ? "danger" : dashboard.metrics.grossMargin < 20 ? "warning" : "good"
    },
    {
      label: "回款率",
      value: formatPercent(dashboard.metrics.collectionRate),
      helper: `本月回笼率 ${formatPercent(dashboard.cashflowSummary.currentMonthCollectionRate)}`,
      trendLabel: buildRateTrendLabel(dashboard.metrics.trends.collectionRate),
      trendDirection: dashboard.metrics.trends.collectionRate.direction,
      trendTone: dashboard.metrics.collectionRate < 55 ? "danger" : dashboard.metrics.collectionRate < 70 ? "warning" : "good",
      riskLabel: dashboard.metrics.collectionRate < 55 ? "低于安全阈值" : "回款表现正常",
      riskTone: dashboard.metrics.collectionRate < 55 ? "danger" : "good"
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="驾驶舱"
        description="从利润、现金流、风险和转化视角俯瞰公司整体经营情况。"
      />

      <BossKpiStrip primary={primaryKpis} secondary={secondaryKpis} />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <SectionCard
          title="利润分析"
          description={`围绕合同、成本与毛利的月度趋势变化，当前月毛利率 ${formatPercent(
            dashboard.profitInsights.currentMonthMargin
          )}。`}
        >
          <ProfitTrendChart data={dashboard.profitTrend} />
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              本月毛利率 {formatPercent(dashboard.profitInsights.currentMonthMargin)}
            </span>
            <span>
              上月毛利率 {formatPercent(dashboard.profitInsights.previousMonthMargin)}
            </span>
            <span
              className={
                dashboard.profitInsights.marginTrend.direction === "down"
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-success)]"
              }
            >
              {dashboard.profitInsights.marginTrend.direction === "down" ? "↓" : dashboard.profitInsights.marginTrend.direction === "up" ? "↑" : "→"}
              毛利率较上月{" "}
              {dashboard.profitInsights.marginTrend.delta === 0
                ? "持平"
                : `${dashboard.profitInsights.marginTrend.delta > 0 ? "+" : "-"}${Math.abs(
                    dashboard.profitInsights.marginTrend.delta
                  ).toFixed(1)} 个点`}
            </span>
          </div>
        </SectionCard>
        <SectionCard title="项目利润分布" description="查看高价值项目的利润贡献情况">
          <ProjectProfitChart data={dashboard.projectProfitDistribution} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <SectionCard title="现金流分析" description="按月份对比公司应收与实收，观察现金流健康度">
          <CashflowTrendChart data={dashboard.cashflowTrend} />
        </SectionCard>
        <SectionCard title="现金流摘要" description="聚焦本月回款、逾期压力与现金健康度">
          <div className="rounded-[16px] border border-border bg-[var(--color-background)] px-4 py-4">
            <div className="text-xs text-muted-foreground">现金健康评分</div>
            <div className="mt-2 flex items-center gap-3">
              <div
                className={`text-[34px] font-semibold tracking-[-0.04em] ${
                  dashboard.cashflowSummary.cashHealthGrade === "A"
                    ? "text-[var(--color-success)]"
                    : dashboard.cashflowSummary.cashHealthGrade === "B"
                      ? "text-[var(--color-warning)]"
                      : "text-[var(--color-danger)]"
                }`}
              >
                {dashboard.cashflowSummary.cashHealthGrade}
              </div>
              <div className="text-sm text-muted-foreground">
                {dashboard.cashflowSummary.cashHealthHint} 本月回笼率{" "}
                {formatPercent(dashboard.cashflowSummary.currentMonthCollectionRate)}。
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label="本月应收" value={formatCurrency(dashboard.cashflowSummary.monthDueAmount)} icon={<Landmark className="h-4 w-4 text-[var(--color-primary)]" />} />
            <SummaryMetric label="本月实收" value={formatCurrency(dashboard.cashflowSummary.monthReceivedAmount)} icon={<Coins className="h-4 w-4 text-[var(--color-success)]" />} />
            <SummaryMetric label="逾期金额" value={formatCurrency(dashboard.cashflowSummary.overdueAmount)} icon={<AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />} />
            <SummaryMetric label="逾期笔数" value={`${dashboard.cashflowSummary.overdueCount} 笔`} icon={<TrendingUp className="h-4 w-4 text-[var(--color-danger)]" />} />
          </div>
          {dashboard.metrics.collectionRate < 55 ? (
            <div className="mt-3 rounded-[14px] border border-[rgba(254,202,202,0.9)] bg-[rgba(254,242,242,0.85)] px-4 py-3 text-sm text-[var(--color-danger)]">
              回款率低于安全阈值，建议优先跟进逾期款和大额未回款项目。
            </div>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="风险预警" description="直接点出当前最值得处理的经营问题">
          <div className="space-y-3">
            <IssueItem
              title="最大亏损项目"
              value={
                dashboard.risks.maxLossProject
                  ? `${dashboard.risks.maxLossProject.name} · ${formatCurrency(dashboard.risks.maxLossProject.grossProfit)}`
                  : "暂无亏损项目"
              }
              tone={dashboard.risks.maxLossProject ? "danger" : "good"}
              extra={dashboard.risks.maxLossProject?.riskReasons.join(" / ")}
            />
            <IssueItem
              title="最大逾期回款"
              value={
                dashboard.risks.maxOverdueReceivable
                  ? `${dashboard.risks.maxOverdueReceivable.title} · ${formatCurrency(dashboard.risks.maxOverdueReceivable.overdueAmount)}`
                  : "暂无逾期回款"
              }
              tone={dashboard.risks.maxOverdueReceivable ? "warning" : "good"}
              extra={dashboard.risks.maxOverdueReceivable?.projectName}
            />
            <div className="rounded-[14px] border border-border bg-[var(--color-background)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">高风险项目列表</div>
                  <div className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
                    {dashboard.risks.highRiskProjectCount} 个
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    优先处理回款逾期、亏损和毛利偏低项目。
                  </div>
                </div>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-[var(--color-hover)]"
                >
                  查看项目
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="销售漏斗" description="从线索到合同的整体转化情况">
          <SalesFunnelChart data={dashboard.funnelStages} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {dashboard.funnelStages.map((item) => (
              <div key={item.label} className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-foreground">{item.count}</div>
                <div className="mt-1 text-xs text-muted-foreground">转化率 {formatPercent(item.conversionRate)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="重点项目列表" description="按风险优先级与金额排序，帮助管理层快速定位问题项目">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#f8fafc] text-left text-[12px] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">项目名称</th>
                <th className="px-4 py-3 font-medium">合同金额</th>
                <th className="px-4 py-3 font-medium">回款</th>
                <th className="px-4 py-3 font-medium">成本</th>
                <th className="px-4 py-3 font-medium">毛利</th>
                <th className="px-4 py-3 font-medium">风险原因</th>
                <th className="px-4 py-3 font-medium">风险等级</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.keyProjects.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-4">
                    <Link href={`/projects/${item.id}`} className="font-medium text-foreground hover:text-[var(--color-primary)]">
                      {item.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.code} · {item.customerName}
                    </div>
                  </td>
                  <td className="px-4 py-4">{formatCurrency(item.contractAmount)}</td>
                  <td className="px-4 py-4">{formatCurrency(item.receivedAmount)}</td>
                  <td className="px-4 py-4">{formatCurrency(item.costAmount)}</td>
                  <td className={`px-4 py-4 ${item.grossProfit < 0 ? "text-[var(--color-danger)]" : ""}`}>{formatCurrency(item.grossProfit)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {item.riskReasons.length ? (
                        item.riskReasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-[rgba(248,250,252,0.95)] px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {reason}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">正常</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={
                        item.riskLevel === "高"
                          ? "danger"
                          : item.riskLevel === "中"
                            ? "warning"
                            : "success"
                      }
                    >
                      {item.riskLevel}风险
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-[var(--color-background)] px-4 py-4">
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-foreground">{value}</div>
    </div>
  );
}

function IssueItem({
  title,
  value,
  extra,
  tone
}: {
  title: string;
  value: string;
  extra?: string;
  tone: "warning" | "danger" | "good";
}) {
  return (
    <div
      className={`rounded-[14px] border px-4 py-4 ${
        tone === "danger"
          ? "border-[rgba(254,202,202,0.9)] bg-[rgba(254,242,242,0.85)]"
          : tone === "warning"
            ? "border-[rgba(254,240,138,0.9)] bg-[rgba(255,251,235,0.92)]"
            : "border-[rgba(187,247,208,0.9)] bg-[rgba(240,253,244,0.9)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {tone === "danger" ? (
            <Siren className="h-4 w-4 text-[var(--color-danger)]" />
          ) : tone === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
          ) : (
            <Coins className="h-4 w-4 text-[var(--color-success)]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
          {extra ? <div className="mt-1 text-sm text-muted-foreground">{extra}</div> : null}
        </div>
      </div>
    </div>
  );
}
