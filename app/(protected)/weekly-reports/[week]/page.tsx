import { PageShell } from "@/components/page-shell";
import { requireSessionUser } from "@/lib/auth";
import { formatWeekLabel, parseWeekStart } from "@/lib/week";
import { requirePagePermission } from "@/lib/rbac";
import { weeklyReportService } from "@/modules/weekly-reports/service";
import { WeeklyReportEditor } from "@/modules/weekly-reports/ui/editor";

export default async function WeeklyReportWeekPage({ params }: { params: { week: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "weeklyReport", "view");
  const workbench = await weeklyReportService.getWeeklyReportWorkbench(user, params.week);
  const range = parseWeekStart(params.week);

  return (
    <PageShell
      title="个人周报"
      description="按自然周维护本周完成、下周计划与风险阻塞。"
      breadcrumbs={[{ label: "周报体系" }, { label: "个人周报" }]}
    >
      <WeeklyReportEditor
        weekLabel={formatWeekLabel(range)}
        currentUserRole={user.role}
        workbench={workbench}
      />
    </PageShell>
  );
}
