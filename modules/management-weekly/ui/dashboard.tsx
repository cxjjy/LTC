"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  ShieldAlert,
  Users
} from "lucide-react";

import { BaseEChart } from "@/components/charts/base-echart";
import { Button } from "@/components/ui/button";
import { weeklyReportStatusLabels, weeklyTrafficLightLabels } from "@/lib/constants";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import { cn, formatDateTime } from "@/lib/utils";
import { RemindActions } from "@/modules/management-weekly/ui/remind-actions";
import { useToast } from "@/components/ui/toast";
import { weeklyTaskStatusLabels } from "@/lib/constants";
import { TaskStatusActions } from "@/modules/weekly-tasks/ui/task-status-actions";

type DashboardSummary = {
  weekStart: string;
  weekEnd: string;
  metrics: {
    submissionRate: number;
    submittedUsers: number;
    totalUsers: number;
    unsubmittedUsers: number;
    draftUsers: number;
    riskProjectCount: number;
    continuousRiskProjectCount: number;
    activeProjectCount: number;
    coordinationNeededCount: number;
  };
  metricDeltas: {
    submissionRateDelta: number;
    riskProjectDelta: number;
    unsubmittedUsersDelta: number;
    continuousRiskProjectDelta: number;
    activeProjectCountDelta: number;
    draftUsersDelta: number;
    submittedUsersDelta: number;
    coordinationNeededDelta: number;
  };
  trends: {
    submission: Array<{ weekStart: string; value: number }>;
    riskProjects: Array<{ weekStart: string; value: number }>;
    unsubmitted: Array<{ weekStart: string; value: number }>;
  };
  riskProjects: Array<{
    projectId: string;
    projectCode: string;
    projectCodeHref: string;
    projectName: string;
    ownerId: string;
    ownerName: string;
    progressSummary?: string | null;
    weeklyActions?: string | null;
    riskCount: number;
    riskLevel: string;
    trafficLightStatus: "green" | "yellow" | "red";
    continuousWeeks: number;
    handled: boolean;
    handledLabel: string;
    updatedAt: string | Date;
  }>;
  submissionRows: Array<{
    userId: string;
    userName: string;
    username: string;
    status: "draft" | "submitted" | "overdue" | "reviewed" | "returned";
    lastSavedAt?: string | Date | null;
    needCoordinationCount: number;
    highRiskCount: number;
    openTaskCount: number;
    reportHref?: string | null;
  }>;
  pendingTasks: {
    high: Array<{
      id: string;
      type: "risk" | "collaboration";
      typeLabel: string;
      content: string;
      project: { id: string; label: string } | null;
      assigneeName: string;
      status: "open" | "processing" | "done";
      statusLabel: string;
    }>;
    medium: Array<{
      id: string;
      type: "risk" | "collaboration";
      typeLabel: string;
      content: string;
      project: { id: string; label: string } | null;
      assigneeName: string;
      status: "open" | "processing" | "done";
      statusLabel: string;
    }>;
  };
};

type ReminderGroupKey = "high" | "medium" | "low";

function buildLineOption(
  data: Array<{ weekStart: string; value: number }>,
  color: string,
  formatter?: string
): EChartsOption {
  return {
    grid: { left: 10, right: 10, top: 16, bottom: 10, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((item) => item.weekStart.slice(5)),
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisLabel: { color: "#6b7280" }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#6b7280", formatter },
      splitLine: { lineStyle: { color: "rgba(229,231,235,0.8)" } }
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: data.map((item) => item.value),
        lineStyle: { color, width: 3 },
        areaStyle: { color: `${color}15` },
        itemStyle: { color },
        symbolSize: 8
      }
    ]
  };
}

function KpiCard({
  title,
  value,
  description,
  delta,
  icon: Icon,
  emphasize = false,
  deltaMode = "positive"
}: {
  title: string;
  value: string;
  description: string;
  delta: number;
  icon: React.ComponentType<{ className?: string }>;
  emphasize?: boolean;
  deltaMode?: "positive" | "negative";
}) {
  const isUp = delta >= 0;
  const positive = deltaMode === "positive" ? isUp : !isUp;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]",
        "flex min-h-[148px] flex-col justify-between gap-5",
        emphasize ? "border-[rgba(59,130,246,0.18)]" : ""
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground">{title}</div>
          <div className="metric-figure mt-3 text-[34px] font-semibold tracking-[-0.05em] text-foreground">{value}</div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-[10px]",
            emphasize ? "bg-[rgba(59,130,246,0.10)] text-[rgb(37,99,235)]" : "bg-[var(--color-hover)] text-[rgb(60,64,67)]"
          )}
        >
          <Icon className="h-[18px] w-[18px] stroke-[1.8]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            positive ? "bg-[rgba(34,197,94,0.10)] text-[rgb(21,128,61)]" : "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]"
          )}
        >
          <DeltaIcon className="h-3.5 w-3.5" />
          较上期 {Math.abs(delta).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function TrendCard({
  title,
  description,
  option
}: {
  title: string;
  description: string;
  option: EChartsOption;
}) {
  return (
    <div className="surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      <BaseEChart option={option} height={232} />
    </div>
  );
}

function MarkHandledButton({ week, projectId, disabled }: { week: string; projectId: string; disabled?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const response = await fetch(`/api/management/weekly-summary/${week}/risk-handled`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId })
            });
            const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ handledLabel: string }>;
            if (!response.ok) {
              toast.error("处理失败", getUserFriendlyError(payload, "风险项目状态更新失败"));
              return;
            }
            toast.success("已标记处理", "该风险项目已更新为已处理");
            router.refresh();
          } catch {
            toast.error("处理失败", "网络异常，请稍后重试");
          }
        })
      }
    >
      {isPending ? "处理中..." : "标记已处理"}
    </Button>
  );
}

function getReminderGroupKey(row: DashboardSummary["submissionRows"][number]): ReminderGroupKey {
  if (row.status === "overdue") {
    return "high";
  }
  if (row.status === "draft" || row.status === "returned" || row.highRiskCount > 0 || row.needCoordinationCount > 0) {
    return "medium";
  }
  return "low";
}

function getReminderSortScore(row: DashboardSummary["submissionRows"][number]) {
  if (row.status === "overdue") {
    return 600 + row.highRiskCount * 20 + row.needCoordinationCount * 10;
  }
  if (row.highRiskCount > 0) {
    return 500 + row.highRiskCount * 20 + row.needCoordinationCount * 10;
  }
  if (row.needCoordinationCount > 0) {
    return 400 + row.needCoordinationCount * 10;
  }
  if (row.status === "draft" || row.status === "returned") {
    return 300;
  }
  return 100;
}

function getStatusBadgeClass(status: DashboardSummary["submissionRows"][number]["status"]) {
  if (["submitted", "reviewed"].includes(status)) {
    return "bg-[rgba(34,197,94,0.10)] text-[rgb(21,128,61)]";
  }
  if (status === "returned" || status === "draft") {
    return "bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]";
  }
  return "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]";
}

function getStatusDisplay(row: DashboardSummary["submissionRows"][number]) {
  if (row.status === "overdue" && !row.lastSavedAt && !row.reportHref) {
    return "未提交";
  }
  return weeklyReportStatusLabels[row.status];
}

function ReminderGroup({
  title,
  description,
  rows,
  week,
  defaultOpen
}: {
  title: string;
  description: string;
  rows: DashboardSummary["submissionRows"];
  week: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const visibleRows = open ? rows : rows.slice(0, 3);
  const hiddenCount = Math.max(rows.length - 3, 0);

  return (
    <div className="surface-card flex h-full min-h-[420px] flex-col rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
        <div>
          <div className="font-medium text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[rgba(15,23,42,0.06)] px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {rows.length} 人
          </span>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3">
        {rows.length ? visibleRows.map((row) => (
          <div key={row.userId} className="rounded-[12px] border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{row.userName}</div>
                  <div className="text-sm text-muted-foreground">{row.username}</div>
                </div>
                <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", getStatusBadgeClass(row.status))}>
                  {getStatusDisplay(row)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>风险数量 {row.highRiskCount}</div>
                <div>协同数量 {row.needCoordinationCount}</div>
                <div>未完成任务 {row.openTaskCount}</div>
                <div className="col-span-2">最近保存：{row.lastSavedAt ? formatDateTime(row.lastSavedAt) : "尚未保存"}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.reportHref ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={row.reportHref}>查看</Link>
                  </Button>
                ) : null}
                {!["submitted", "reviewed"].includes(row.status) ? <RemindActions week={week} targetUserIds={[row.userId]} /> : null}
              </div>
            </div>
        )) : (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-[12px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            当前分组暂无人员
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-medium text-[rgb(37,99,235)]"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <>
              收起
              <ChevronDown className="h-4 w-4" />
            </>
          ) : (
            <>
              查看更多（{hiddenCount}人）
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

export function ManagementDashboard({
  week,
  summary,
  canManageWeekly
}: {
  week: string;
  summary: DashboardSummary;
  canManageWeekly: boolean;
}) {
  const submissionOption = useMemo(
    () => buildLineOption(summary.trends.submission, "#2563eb", "{value}%"),
    [summary.trends.submission]
  );
  const riskOption = useMemo(
    () => buildLineOption(summary.trends.riskProjects, "#dc2626"),
    [summary.trends.riskProjects]
  );
  const unsubmittedOption = useMemo(
    () => buildLineOption(summary.trends.unsubmitted, "#7c3aed"),
    [summary.trends.unsubmitted]
  );
  const reminderGroups = useMemo(() => {
    const sorted = [...summary.submissionRows].sort((left, right) => getReminderSortScore(right) - getReminderSortScore(left));
    return {
      high: sorted.filter((row) => getReminderGroupKey(row) === "high"),
      medium: sorted.filter((row) => getReminderGroupKey(row) === "medium"),
      low: sorted.filter((row) => getReminderGroupKey(row) === "low")
    };
  }, [summary.submissionRows]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="提交率" value={`${summary.metrics.submissionRate}%`} description="按活跃用户口径计算" delta={summary.metricDeltas.submissionRateDelta} icon={ClipboardCheck} emphasize />
        </div>
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="未提交人数" value={String(summary.metrics.unsubmittedUsers)} description="仍需跟进的人员数" delta={summary.metricDeltas.unsubmittedUsersDelta} icon={Clock3} deltaMode="negative" emphasize />
        </div>
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="风险项目数" value={String(summary.metrics.riskProjectCount)} description="本周命中风险标记项目" delta={summary.metricDeltas.riskProjectDelta} icon={ShieldAlert} deltaMode="negative" emphasize />
        </div>
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="协同事项数" value={String(summary.metrics.coordinationNeededCount)} description="需要管理协同关注的条目" delta={summary.metricDeltas.coordinationNeededDelta} icon={Users} deltaMode="negative" emphasize />
        </div>

        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="连续风险项目" value={String(summary.metrics.continuousRiskProjectCount)} description="连续两周仍在风险池" delta={summary.metricDeltas.continuousRiskProjectDelta} icon={AlertTriangle} deltaMode="negative" />
        </div>
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="本周活跃项目数" value={String(summary.metrics.activeProjectCount)} description="周报中实际关联的项目数" delta={summary.metricDeltas.activeProjectCountDelta} icon={FolderKanban} />
        </div>
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="草稿人数" value={String(summary.metrics.draftUsers)} description="草稿或退回待完善人员" delta={summary.metricDeltas.draftUsersDelta} icon={CircleAlert} deltaMode="negative" />
        </div>
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <KpiCard title="已提交人数" value={String(summary.metrics.submittedUsers)} description="已提交或已审阅人数" delta={summary.metricDeltas.submittedUsersDelta} icon={ClipboardCheck} />
        </div>
      </div>

      <div className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4">
          <TrendCard title="提交率趋势" description="最近 6 周提交率变化" option={submissionOption} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <TrendCard title="风险趋势" description="最近 6 周风险项目数" option={riskOption} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <TrendCard title="未提交人数趋势" description="最近 6 周未提交人数变化" option={unsubmittedOption} />
        </div>
      </div>

      <div className="col-span-12">
        <div className="surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <div className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">待处理事项</div>
            <div className="mt-1 text-sm text-muted-foreground">周报自动生成的风险与协同任务，按优先级分组跟进。</div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[12px] border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium text-foreground">高优先级 · 风险任务</div>
                <span className="rounded-full bg-[rgba(239,68,68,0.10)] px-2.5 py-1 text-xs font-medium text-[rgb(185,28,28)]">
                  {summary.pendingTasks.high.length}
                </span>
              </div>
              <div className="space-y-3">
                {summary.pendingTasks.high.length ? summary.pendingTasks.high.map((task) => (
                  <div key={task.id} className="rounded-[12px] bg-[var(--color-background)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{task.content}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {task.project?.label ?? "未关联项目"} · {task.assigneeName}
                        </div>
                      </div>
                      <span className="rounded-full bg-[rgba(239,68,68,0.10)] px-2.5 py-1 text-xs font-medium text-[rgb(185,28,28)]">
                        {weeklyTaskStatusLabels[task.status]}
                      </span>
                    </div>
                    <div className="mt-3">
                      <TaskStatusActions taskId={task.id} status={task.status} disabled={!canManageWeekly} />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    当前无待处理风险任务
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[12px] border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium text-foreground">中优先级 · 协同任务</div>
                <span className="rounded-full bg-[rgba(59,130,246,0.10)] px-2.5 py-1 text-xs font-medium text-[rgb(37,99,235)]">
                  {summary.pendingTasks.medium.length}
                </span>
              </div>
              <div className="space-y-3">
                {summary.pendingTasks.medium.length ? summary.pendingTasks.medium.map((task) => (
                  <div key={task.id} className="rounded-[12px] bg-[var(--color-background)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{task.content}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {task.project?.label ?? "未关联项目"} · {task.assigneeName}
                        </div>
                      </div>
                      <span className="rounded-full bg-[rgba(59,130,246,0.10)] px-2.5 py-1 text-xs font-medium text-[rgb(37,99,235)]">
                        {weeklyTaskStatusLabels[task.status]}
                      </span>
                    </div>
                    <div className="mt-3">
                      <TaskStatusActions taskId={task.id} status={task.status} disabled={!canManageWeekly} />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    当前无待处理协同任务
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12">
        <div className="surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">风险项目池</div>
              <div className="mt-1 text-sm text-muted-foreground">聚焦开发团队风险与持续问题，支持处理闭环。</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.weekStart} ~ {summary.weekEnd}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">项目</th>
                  <th className="pb-3 font-medium">负责人</th>
                  <th className="pb-3 font-medium">风险等级</th>
                  <th className="pb-3 font-medium">连续周数</th>
                  <th className="pb-3 font-medium">最近更新</th>
                  <th className="pb-3 font-medium">处理状态</th>
                  <th className="pb-3 font-medium">动作</th>
                </tr>
              </thead>
              <tbody>
                {summary.riskProjects.length ? summary.riskProjects.map((row) => (
                  <tr key={row.projectId} className="border-b border-border/70 align-top">
                    <td className="py-4">
                      <div className="space-y-1">
                        <Link href={row.projectCodeHref} className="font-medium text-[rgb(37,99,235)] hover:underline">
                          {row.projectCode}
                        </Link>
                        <div className="text-foreground">{row.projectName}</div>
                        {row.weeklyActions ? (
                          <div className="max-w-[280px] text-xs leading-5 text-muted-foreground">{row.weeklyActions}</div>
                        ) : row.progressSummary ? (
                          <div className="max-w-[280px] text-xs leading-5 text-muted-foreground">{row.progressSummary}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 text-foreground">{row.ownerName}</td>
                    <td className="py-4">
                      <div className="space-y-2">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", row.trafficLightStatus === "red" ? "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]" : row.trafficLightStatus === "yellow" ? "bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]" : "bg-[rgba(34,197,94,0.10)] text-[rgb(21,128,61)]")}>
                          {weeklyTrafficLightLabels[row.trafficLightStatus]} / {row.riskLevel}
                        </span>
                        <div className="text-xs text-muted-foreground">风险条目 {row.riskCount} 条</div>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-foreground">{row.continuousWeeks} 周</td>
                    <td className="py-4 text-sm text-muted-foreground">{formatDateTime(row.updatedAt)}</td>
                    <td className="py-4">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", row.handled ? "bg-[rgba(34,197,94,0.10)] text-[rgb(21,128,61)]" : "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]")}>
                        {row.handled ? row.handledLabel : "待处理"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={row.projectCodeHref}>查看</Link>
                        </Button>
                        <MarkHandledButton week={week} projectId={row.projectId} disabled={row.handled || !canManageWeekly} />
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">当前周暂无风险项目</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="col-span-12">
        <div className="surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">催办分组</div>
              <div className="mt-1 text-sm text-muted-foreground">横向分组对比问题优先级，默认仅显示每组前 3 人。</div>
            </div>
            <RemindActions week={week} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ReminderGroup title="高优先级" description="未提交 / 逾期人员优先跟进" rows={reminderGroups.high} week={week} defaultOpen />
            <ReminderGroup title="中优先级" description="草稿、有风险或有协同事项" rows={reminderGroups.medium} week={week} />
            <ReminderGroup title="低优先级" description="已提交或已审阅人员" rows={reminderGroups.low} week={week} />
          </div>
        </div>
      </div>
    </div>
  );
}
