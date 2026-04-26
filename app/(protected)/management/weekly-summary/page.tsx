import { PageShell } from "@/components/page-shell";
import { requireSessionUser } from "@/lib/auth";
import { hasPermission, requirePagePermission } from "@/lib/rbac";
import { formatWeekKey, getNaturalWeekRange } from "@/lib/week";
import { managementWeeklyService } from "@/modules/management-weekly/service";
import { ManagementDashboard } from "@/modules/management-weekly/ui/dashboard";

export default async function ManagementWeeklySummaryPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requirePagePermission(requireSessionUser(), "managementWeekly", "view");
  const week = typeof searchParams.week === "string" ? searchParams.week : formatWeekKey(getNaturalWeekRange().weekStart);
  const summary = await managementWeeklyService.getManagementWeeklySummary(week, user);
  const canManageWeekly = hasPermission(user, "weekly_report:change_status");

  return (
    <PageShell
      title="管理汇总"
      description="按结构化驾驶舱方式呈现本周经营变化、风险池和催办优先级。"
      breadcrumbs={[{ label: "周报体系" }, { label: "管理汇总" }]}
    >
      <ManagementDashboard week={week} summary={summary} canManageWeekly={canManageWeekly} />
    </PageShell>
  );
}
