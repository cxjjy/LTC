import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { requireSessionUser } from "@/lib/auth";
import { weeklyReportItemTypeLabels, weeklyReportPriorityLabels } from "@/lib/constants";
import { requirePagePermission } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils";
import { projectWeeklyService } from "@/modules/project-weekly/service";

export default async function ProjectWeeklyDetailPage({
  params
}: {
  params: { week: string; projectId: string };
}) {
  const user = await requirePagePermission(requireSessionUser(), "projectWeekly", "view");
  const detail = await projectWeeklyService.getProjectWeeklySnapshot(params.projectId, params.week, user);

  return (
    <PageShell
      title="项目周报详情"
      description={`${detail.project.code} / ${detail.project.name}`}
      breadcrumbs={[{ label: "周报体系" }, { label: "项目周报" }, { label: "详情" }]}
      backHref={`/project-weekly/${params.week}`}
      backLabel="返回项目周报列表"
    >
      <SectionCard title="项目快照" description={`${detail.weekStart} ~ ${detail.weekEnd}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>项目状态：{detail.project.statusLabel}</div>
          <div>风险条目：{detail.riskCount}</div>
          <div>成本增量：{formatCurrency(detail.costDelta)}</div>
          <div>回款增量：{formatCurrency(detail.receivableDelta)}</div>
          <div>信号灯：{detail.trafficLightStatus}</div>
          <div>连续两周风险：{detail.continuousRisk ? "是" : "否"}</div>
        </div>
      </SectionCard>

      <SectionCard title="系统摘要">
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <div>{detail.progressSummary || "暂无自动摘要"}</div>
          <div>{detail.weeklyActions || "暂无本周动作摘要"}</div>
        </div>
      </SectionCard>

      <SectionCard title="关联个人周报条目">
        <div className="grid gap-3">
          {detail.linkedItems.length ? (
            detail.linkedItems.map((item: any) => (
              <div key={item.id} className="rounded-[12px] border border-border p-4">
                <div className="text-sm font-medium text-foreground">
                  {weeklyReportItemTypeLabels[item.itemType as keyof typeof weeklyReportItemTypeLabels]} / 优先级{" "}
                  {weeklyReportPriorityLabels[item.priority as keyof typeof weeklyReportPriorityLabels]}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{item.content}</div>
                {item.impactNote ? <div className="mt-2 text-sm text-[rgb(146,64,14)]">影响说明：{item.impactNote}</div> : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">本周暂无关联个人周报条目。</div>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
}
