import Link from "next/link";
import {
  AlertTriangle,
  CircleDollarSign,
  ShieldAlert
} from "lucide-react";
import { ProjectStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPISection } from "@/components/kpi-section";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/dashboard";
import { projectStatusLabels } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PageSearchParams } from "@/types/common";

function buildHref(period: string, projectStatus: string) {
  const params = new URLSearchParams();
  params.set("period", period);
  params.set("projectStatus", projectStatus);
  return `/dashboard?${params.toString()}`;
}

function TrendChart({
  data
}: {
  data: Array<{ label: string; contractAmount: number; receivedAmount: number }>;
}) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.contractAmount, item.receivedAmount]),
    1
  );

  const width = 520;
  const height = 240;
  const padding = 24;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * innerWidth;
    const contractY = padding + innerHeight - (item.contractAmount / maxValue) * innerHeight;
    const receivedY = padding + innerHeight - (item.receivedAmount / maxValue) * innerHeight;

    return { ...item, x, contractY, receivedY };
  });

  const contractPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.contractY}`).join(" ");
  const receivedPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.receivedY}`).join(" ");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
          合同金额
        </span>
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
          回款金额
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (innerHeight / 3) * line;
          return (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="rgba(229,231,235,0.9)"
              strokeDasharray="4 4"
            />
          );
        })}
        <path d={contractPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
        <path d={receivedPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.contractY} r="4" fill="#3b82f6" />
            <circle cx={point.x} cy={point.receivedY} r="4" fill="#10b981" />
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-6 gap-2 text-center text-xs text-muted-foreground">
        {data.map((item) => (
          <div key={item.label}>{item.label}</div>
        ))}
      </div>
    </div>
  );
}

function StatusDistribution({
  data
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--color-hover)]">
        {data.map((item) => (
          <div
            key={item.label}
            style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-foreground">{item.label}</span>
            </div>
            <div className="text-muted-foreground">
              {item.value} 个 / {Math.round((item.value / total) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await requireSessionUser();
  const period = searchParams.period === "12" ? 12 : 6;
  const projectStatusParam =
    typeof searchParams.projectStatus === "string" ? searchParams.projectStatus : "ALL";
  const allowedStatus = ["ALL", ...Object.values(ProjectStatus)];
  const projectStatus = allowedStatus.includes(projectStatusParam) ? projectStatusParam : "ALL";
  const dashboard = await getDashboardMetrics(user, {
    periodMonths: period,
    projectStatus: projectStatus as "ALL" | ProjectStatus
  });

  const recentTrend = dashboard.trend[dashboard.trend.length - 1];
  const previousTrend = dashboard.trend[dashboard.trend.length - 2];
  const contractDelta = (recentTrend?.contractAmount ?? 0) - (previousTrend?.contractAmount ?? 0);
  const receivedDelta = (recentTrend?.receivedAmount ?? 0) - (previousTrend?.receivedAmount ?? 0);
  const margin = dashboard.metrics.contractAmountTotal
    ? (dashboard.metrics.grossProfit / dashboard.metrics.contractAmountTotal) * 100
    : 0;

  const primaryMetrics = [
    {
      label: "合同金额",
      value: formatCurrency(dashboard.metrics.contractAmountTotal),
      hint: "全部项目合同金额汇总",
      trend:
        contractDelta > 0
          ? { label: `+${formatCurrency(contractDelta)}`, tone: "success" as const }
          : contractDelta < 0
            ? { label: `${formatCurrency(contractDelta)}`, tone: "danger" as const }
            : { label: "稳定", tone: "muted" as const }
    },
    {
      label: "已回款",
      value: formatCurrency(dashboard.metrics.receivedAmountTotal),
      hint: "当前已确认到账的资金总额",
      trend:
        receivedDelta > 0
          ? { label: `+${formatCurrency(receivedDelta)}`, tone: "success" as const }
          : receivedDelta < 0
            ? { label: `${formatCurrency(receivedDelta)}`, tone: "danger" as const }
            : { label: "稳定", tone: "muted" as const }
    },
    {
      label: "未回款",
      value: formatCurrency(dashboard.metrics.unreceivedAmountTotal),
      hint: "待回收的合同资金余额",
      trend:
        dashboard.risks.overdueReceivables.length > 0
          ? { label: "需关注", tone: "warning" as const }
          : { label: "可控", tone: "muted" as const }
    },
    {
      label: "毛利",
      value: formatCurrency(dashboard.metrics.grossProfit),
      hint: "合同金额减去成本后的经营结果",
      trend:
        margin >= 30
          ? { label: `+${margin.toFixed(0)}%`, tone: "success" as const }
          : margin > 0
            ? { label: `${margin.toFixed(0)}%`, tone: "muted" as const }
            : { label: "承压", tone: "danger" as const }
    }
  ];

  const secondaryMetrics = [
    {
      label: "项目数",
      value: dashboard.metrics.inProgressProjects.toString(),
      hint: "当前处于执行阶段的项目数量",
      trend:
        dashboard.metrics.inProgressProjects > 0
          ? { label: "执行中", tone: "muted" as const }
          : { label: "待启动", tone: "warning" as const }
    },
    {
      label: "成本",
      value: formatCurrency(dashboard.metrics.costAmountTotal),
      hint: "全部项目累计成本支出",
      trend:
        dashboard.risks.overBudgetProjects.length > 0
          ? { label: `${dashboard.risks.overBudgetProjects.length} 项超预算`, tone: "warning" as const }
          : { label: "成本稳定", tone: "success" as const }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="项目经营看板" description="从项目、收入、回款、成本、毛利和风险视角总览当前经营状态" />

      <SectionCard
        title="筛选视角"
        description="按统计周期和项目状态切换当前经营看板。"
        contentClassName="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">统计周期</span>
          {[6, 12].map((item) => (
            <Button
              key={item}
              asChild
              variant={period === item ? "default" : "outline"}
              size="sm"
            >
              <Link href={buildHref(String(item), projectStatus)}>{item}个月</Link>
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">项目状态</span>
          {[
            { label: "全部", value: "ALL" },
            { label: "立项中", value: ProjectStatus.INITIATING },
            { label: "进行中", value: ProjectStatus.IN_PROGRESS },
            { label: "已完成", value: ProjectStatus.COMPLETED }
          ].map((item) => (
            <Button
              key={item.value}
              asChild
              variant={projectStatus === item.value ? "default" : "outline"}
              size="sm"
            >
              <Link href={buildHref(String(period), item.value)}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </SectionCard>

      <KPISection primary={primaryMetrics} secondary={secondaryMetrics} />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="收入与回款趋势" description={`最近 ${period} 个月的合同金额与实际回款变化`}>
          <TrendChart data={dashboard.trend} />
        </SectionCard>
        <SectionCard title="项目状态分布" description="当前筛选范围内的项目状态结构">
          <StatusDistribution data={dashboard.statusDistribution} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <SectionCard title="项目执行列表" description="按当前项目推进情况展示重点执行项目">
          <div className="space-y-3">
            {dashboard.executionProjects.map((item) => (
              <div
                key={item.id}
                className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link href={`/projects/${item.id}`} className="text-sm font-semibold text-foreground hover:text-[var(--color-primary)]">
                      {item.name}
                    </Link>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.code} · {item.customerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.status === ProjectStatus.IN_PROGRESS ? "default" : item.status === ProjectStatus.COMPLETED ? "success" : item.status === ProjectStatus.PAUSED ? "warning" : "muted"}>
                      {projectStatusLabels[item.status]}
                    </Badge>
                    <div className="text-sm font-medium text-foreground">{item.progress}%</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${Math.max(item.progress, 6)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  计划结束：{formatDate(item.plannedEndDate)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="风险预警" description="关注逾期回款、延期项目和超预算风险">
          <div className="space-y-4">
            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                  逾期回款
                </div>
                <Badge variant="warning">{dashboard.risks.overdueReceivables.length} 项</Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {dashboard.risks.overdueReceivables.length ? dashboard.risks.overdueReceivables.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{item.title}</span>
                    <span>{formatCurrency(item.amountDue - item.amountReceived)}</span>
                  </div>
                )) : <div>当前没有逾期回款。</div>}
              </div>
            </div>

            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldAlert className="h-4 w-4 text-[var(--color-danger)]" />
                  延期项目
                </div>
                <Badge variant="danger">{dashboard.risks.delayedProjects.length} 项</Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {dashboard.risks.delayedProjects.length ? dashboard.risks.delayedProjects.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{item.name}</span>
                    <span>{formatDate(item.plannedEndDate)}</span>
                  </div>
                )) : <div>当前没有延期项目。</div>}
              </div>
            </div>

            <div className="rounded-[12px] border border-border bg-[var(--color-background)] p-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <CircleDollarSign className="h-4 w-4 text-[var(--color-warning)]" />
                  成本超预算
                </div>
                <Badge variant="warning">{dashboard.risks.overBudgetProjects.length} 项</Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {dashboard.risks.overBudgetProjects.length ? dashboard.risks.overBudgetProjects.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{item.name}</span>
                    <span>{formatCurrency(item.projectCost - item.budgetAmount)}</span>
                  </div>
                )) : <div>当前没有超预算项目。</div>}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="近期项目" description="按创建时间展示最近进入系统的项目">
          <div className="space-y-3">
            {dashboard.recentProjects.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3"
              >
                <div>
                  <Link href={`/projects/${item.id}`} className="text-sm font-semibold text-foreground hover:text-[var(--color-primary)]">
                    {item.name}
                  </Link>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.code} · {item.customerName}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={item.status === ProjectStatus.COMPLETED ? "success" : item.status === ProjectStatus.IN_PROGRESS ? "default" : "muted"}>
                    {projectStatusLabels[item.status]}
                  </Badge>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="待处理事项" description="围绕项目经营的关键待办事项">
          <div className="space-y-3">
            {dashboard.todoItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-4"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">请在相关模块中继续处理与跟进</div>
                </div>
                <Badge
                  variant={
                    item.tone === "danger"
                      ? "danger"
                      : item.tone === "warning"
                        ? "warning"
                        : "default"
                  }
                >
                  {item.value} 项
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
