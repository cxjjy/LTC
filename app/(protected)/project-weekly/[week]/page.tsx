import { AlertTriangle, FolderKanban, Users2 } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { weeklyTaskStatusLabels } from "@/lib/constants";
import { requireSessionUser } from "@/lib/auth";
import { canAccessRecord, hasPermission, requirePagePermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { projectWeeklyService } from "@/modules/project-weekly/service";
import { MarkProjectRiskButton } from "@/modules/project-weekly/ui/mark-risk-button";
import { TaskStatusActions } from "@/modules/weekly-tasks/ui/task-status-actions";

export default async function ProjectWeeklyWeekPage({
  params,
  searchParams
}: {
  params: { week: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requirePagePermission(requireSessionUser(), "projectWeekly", "view");
  const result = await projectWeeklyService.listProjectWeeklyOverview(
    {
      week: params.week,
      ownerId: typeof searchParams.ownerId === "string" ? searchParams.ownerId : undefined,
      riskOnly: searchParams.riskOnly === "true",
      keyword: typeof searchParams.keyword === "string" ? searchParams.keyword : undefined
    },
    user
  );
  const canManageProjectWeekly =
    hasPermission(user, "weekly_report:change_status") ||
    canAccessRecord(user, "project", "update") ||
    canAccessRecord(user, "project", "status");

  return (
    <PageShell
      title="项目周报"
      description="按项目聚合本周完成、风险和下周计划，形成项目维度的周报汇总视图。"
      breadcrumbs={[{ label: "周报体系" }, { label: "项目周报" }]}
    >
      <div className="surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">周报总览</div>
            <div className="mt-1 text-sm text-muted-foreground">
              周范围：{params.week}，优先展示有风险或有协同事项的项目。
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[12px] border border-border p-4">
              <div className="text-xs font-medium text-muted-foreground">项目总数</div>
              <div className="metric-figure mt-3 text-[30px] font-semibold tracking-[-0.05em] text-foreground">{result.stats.totalProjects}</div>
            </div>
            <div className="rounded-[12px] border border-border p-4">
              <div className="text-xs font-medium text-muted-foreground">风险项目</div>
              <div className="metric-figure mt-3 text-[30px] font-semibold tracking-[-0.05em] text-[rgb(180,83,9)]">{result.stats.riskProjects}</div>
            </div>
            <div className="rounded-[12px] border border-border p-4">
              <div className="text-xs font-medium text-muted-foreground">协同项目</div>
              <div className="metric-figure mt-3 text-[30px] font-semibold tracking-[-0.05em] text-[rgb(37,99,235)]">{result.stats.coordinationProjects}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-[12px] p-4 shadow-[var(--shadow-soft)]">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <input
            name="keyword"
            defaultValue={typeof searchParams.keyword === "string" ? searchParams.keyword : ""}
            placeholder="搜索项目编号或名称"
            className="control-surface h-10 rounded-[10px] px-3 text-sm outline-none"
          />
          <input
            name="ownerId"
            defaultValue={typeof searchParams.ownerId === "string" ? searchParams.ownerId : ""}
            placeholder="负责人ID"
            className="control-surface h-10 rounded-[10px] px-3 text-sm outline-none"
          />
          <select
            name="riskOnly"
            defaultValue={searchParams.riskOnly === "true" ? "true" : ""}
            className="control-surface h-10 rounded-[10px] px-3 text-sm outline-none"
          >
            <option value="">全部项目</option>
            <option value="true">仅看风险/协同项目</option>
          </select>
          <button type="submit" className="control-surface h-10 rounded-[10px] bg-[var(--color-primary)] px-4 text-sm font-medium text-white">
            应用筛选
          </button>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {result.items.length ? (
          result.items.map((item) => (
            <div key={item.projectId} className="surface-card rounded-[12px] p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <a href={item.projectCodeHref} className="text-sm font-medium text-[rgb(37,99,235)] hover:underline">
                    {item.projectCode}
                  </a>
                  <div className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-foreground">{item.projectName}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users2 className="h-4 w-4" />
                      {item.ownerName}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        item.trafficLightStatus === "red"
                          ? "bg-[rgba(239,68,68,0.10)] text-[rgb(185,28,28)]"
                          : item.trafficLightStatus === "yellow"
                            ? "bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]"
                            : "bg-[rgba(34,197,94,0.10)] text-[rgb(21,128,61)]"
                      )}
                    >
                      {item.trafficLightStatusLabel}
                    </span>
                    {item.coordinationCount > 0 ? (
                      <span className="inline-flex rounded-full bg-[rgba(59,130,246,0.10)] px-2.5 py-1 text-xs font-medium text-[rgb(37,99,235)]">
                        协同 {item.coordinationCount}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={item.projectCodeHref}>查看详情</a>
                  </Button>
                  <MarkProjectRiskButton week={params.week} projectId={item.projectId} disabled={!canManageProjectWeekly} />
                  <Button asChild size="sm" variant="outline">
                    <a href={item.projectManageHref}>项目管理</a>
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[12px] border border-border p-4">
                  <div className="text-sm font-medium text-foreground">本周完成</div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {item.doneItems.length ? item.doneItems.slice(0, 4).map((content, index) => (
                      <div key={`${item.projectId}-done-${index}`} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(37,99,235)]" />
                        <span>{content}</span>
                      </div>
                    )) : (
                      <div>暂无本周完成条目</div>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-[rgb(180,83,9)]" />
                    风险
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {item.riskItems.length ? item.riskItems.slice(0, 4).map((content, index) => (
                      <div key={`${item.projectId}-risk-${index}`} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(217,119,6)]" />
                        <span>{content}</span>
                      </div>
                    )) : (
                      <div>暂无风险条目</div>
                    )}
                  </div>
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">关联任务</div>
                    {item.tasks.length ? item.tasks.map((task) => (
                      <div key={task.id} className="rounded-[10px] bg-[var(--color-background)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-foreground">{task.content}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {task.assigneeName} · {weeklyTaskStatusLabels[task.status]}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <TaskStatusActions taskId={task.id} status={task.status} disabled={!canManageProjectWeekly} />
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-muted-foreground">暂无关联任务</div>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FolderKanban className="h-4 w-4 text-[rgb(37,99,235)]" />
                    下周计划
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {item.planItems.length ? item.planItems.slice(0, 4).map((content, index) => (
                      <div key={`${item.projectId}-plan-${index}`} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(59,130,246)]" />
                        <span>{content}</span>
                      </div>
                    )) : (
                      <div>暂无下周计划条目</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-[12px] border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            当前周暂无项目关联周报条目。系统会在员工周报关联项目后自动形成项目汇总。
          </div>
        )}
      </div>
    </PageShell>
  );
}
