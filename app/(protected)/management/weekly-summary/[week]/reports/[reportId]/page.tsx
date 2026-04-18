import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { weeklyReportItemTypeLabels, weeklyReportPriorityLabels, weeklyReportStatusLabels } from "@/lib/constants";
import { weeklyReportService } from "@/modules/weekly-reports/service";
import { ReportReviewActions } from "@/modules/management-weekly/ui/report-review-actions";

export default async function ManagementWeeklyReportDetailPage({
  params
}: {
  params: { week: string; reportId: string };
}) {
  const user = await requirePagePermission(requireSessionUser(), "managementWeekly", "view");
  const report = await weeklyReportService.getReportById(params.reportId, user);

  return (
    <PageShell
      title="周报审阅"
      description={`状态：${weeklyReportStatusLabels[report.status]}`}
      breadcrumbs={[{ label: "周报体系" }, { label: "管理汇总" }, { label: "周报审阅" }]}
      backHref={`/management/weekly-summary?week=${params.week}`}
      backLabel="返回管理汇总"
    >
      <SectionCard title="周报信息">
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div>用户ID：{report.userId}</div>
          <div>最近保存：{report.lastSavedAt ? formatDateTime(report.lastSavedAt) : "未保存"}</div>
          <div>提交时间：{report.submittedAt ? formatDateTime(report.submittedAt) : "未提交"}</div>
          <div>状态：{weeklyReportStatusLabels[report.status]}</div>
        </div>
        {report.summary ? <div className="mt-4 text-sm leading-6 text-muted-foreground">{report.summary}</div> : null}
      </SectionCard>

      <SectionCard title="条目内容">
        <div className="grid gap-3">
          {report.items.map((item) => (
            <div key={item.id} className="rounded-[12px] border border-border p-4">
              <div className="text-sm font-medium text-foreground">
                {weeklyReportItemTypeLabels[item.itemType]} / 优先级 {weeklyReportPriorityLabels[item.priority]}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{item.content}</div>
              {item.expectedFinishAt ? <div className="mt-2 text-sm text-muted-foreground">预计完成：{item.expectedFinishAt}</div> : null}
              {item.needCoordination ? <div className="mt-2 text-sm text-[rgb(29,78,216)]">需要协同</div> : null}
              {item.impactNote ? <div className="mt-2 text-sm text-[rgb(146,64,14)]">影响说明：{item.impactNote}</div> : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="审阅动作">
        <ReportReviewActions reportId={report.id} />
      </SectionCard>
    </PageShell>
  );
}
